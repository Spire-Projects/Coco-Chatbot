-- MIGRATION 012 — Accessory global catalog + per-branch stock
--
-- BEFORE: accessories had branch_id NOT NULL and a single stock INTEGER.
--         Each branch needed its own row for the same product.
--
-- AFTER:  accessories is a global catalog (no branch_id, no stock column).
--         Stock is tracked per branch in the new `accessory_stock` table.
--         The same accessory can exist in multiple branches with different
--         stock levels, without duplicating the catalog entry.
--
-- Impact on existing data:
--   Each (accessory, branch_id, stock) triple is migrated to accessory_stock.
--   Accessory rows with zero stock still get a stock=0 row so the branch link
--   is preserved for display purposes.

-- ─── 1. New table: per-branch stock ─────────────────────────────────────────

CREATE TABLE public.accessory_stock (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_id UUID         NOT NULL REFERENCES public.accessories(id) ON DELETE CASCADE,
  branch_id    UUID         NOT NULL REFERENCES public.branches(id),
  stock        INTEGER      NOT NULL DEFAULT 0 CHECK (stock >= 0),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_accessory_branch UNIQUE (accessory_id, branch_id)
);

CREATE INDEX idx_accessory_stock_accessory ON public.accessory_stock (accessory_id);
CREATE INDEX idx_accessory_stock_branch    ON public.accessory_stock (branch_id);

COMMENT ON TABLE public.accessory_stock IS
  'Stock de accesorios por sucursal. Un accesorio del catalogo global puede '
  'tener stock diferente en cada sucursal.';

-- ─── 2. Migrate existing data ────────────────────────────────────────────────
-- Preserve current stock quantities tied to their branch.

INSERT INTO public.accessory_stock (accessory_id, branch_id, stock, updated_at)
SELECT id, branch_id, GREATEST(stock, 0), now()
FROM   public.accessories
WHERE  branch_id IS NOT NULL;

-- ─── 3. Remove branch_id and stock from accessories ──────────────────────────

-- Drop the FK constraint before removing the column
ALTER TABLE public.accessories
  DROP CONSTRAINT IF EXISTS accessories_branch_id_fkey;

-- Drop the branch index
DROP INDEX IF EXISTS public.idx_accessories_branch;

-- The stock_min_alert column stays on the global accessory (it is a catalog-level
-- threshold, not branch-specific).
ALTER TABLE public.accessories
  DROP COLUMN branch_id,
  DROP COLUMN stock;

-- ─── 4. Update register_accessory_batch ──────────────────────────────────────
-- Now resolves the branch from the purchase header and upserts into
-- accessory_stock instead of directly updating accessories.stock.

DROP FUNCTION IF EXISTS public.register_accessory_batch(UUID, UUID, UUID, INTEGER, NUMERIC);

CREATE OR REPLACE FUNCTION public.register_accessory_batch(
  p_purchase_id    UUID,
  p_accessory_id   UUID,
  p_supplier_id    UUID,
  p_quantity       INTEGER,
  p_unit_price_usd NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  -- Resolve the branch from the purchase header
  SELECT branch_id INTO v_branch_id
  FROM   purchases
  WHERE  id = p_purchase_id;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Purchase % not found or has no branch_id', p_purchase_id;
  END IF;

  -- Record the purchase line
  INSERT INTO purchase_accessory_lines (purchase_id, accessory_id, quantity, unit_price_usd)
  VALUES (p_purchase_id, p_accessory_id, p_quantity, p_unit_price_usd);

  -- Upsert per-branch stock atomically
  INSERT INTO accessory_stock (accessory_id, branch_id, stock, updated_at)
  VALUES (p_accessory_id, v_branch_id, p_quantity, now())
  ON CONFLICT (accessory_id, branch_id)
  DO UPDATE SET
    stock      = accessory_stock.stock + EXCLUDED.stock,
    updated_at = now();

  -- Keep supplier & last purchase price up to date on the global record
  UPDATE accessories
     SET supplier_id        = p_supplier_id,
         purchase_price_usd = p_unit_price_usd,
         updated_at         = now()
   WHERE id = p_accessory_id;

  RETURN p_quantity;
END;
$$;

COMMENT ON FUNCTION public.register_accessory_batch(UUID, UUID, UUID, INTEGER, NUMERIC) IS
  'Registra una linea de compra de accesorio e incrementa el stock en accessory_stock '
  'para la sucursal del encabezado de la compra. Opera de forma atomica.';

-- ─── 5. Permissions ──────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON public.accessory_stock TO web_user;
GRANT SELECT, INSERT, UPDATE ON public.accessory_stock TO web_anon;
GRANT EXECUTE ON FUNCTION public.register_accessory_batch(UUID, UUID, UUID, INTEGER, NUMERIC) TO web_user;

SELECT '012 — accessory global catalog + per-branch stock applied successfully' AS message;
