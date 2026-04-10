-- MIGRATION 010 — Purchase accessory lines
--
-- Extends the purchases module to support accessories alongside devices.
-- Accessories use bulk stock (no individual IMEIs), so a simple line records
-- quantity + unit price and increments accessories.stock atomically.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_accessory_lines (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID        NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  accessory_id    UUID        NOT NULL REFERENCES accessories(id),
  quantity        INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price_usd  NUMERIC(10,2) NOT NULL CHECK (unit_price_usd >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.purchase_accessory_lines IS
  'Lineas de accesorios en una compra. Cada fila representa una cantidad de un accesorio comprado.';

CREATE INDEX IF NOT EXISTS idx_pal_purchase_id   ON public.purchase_accessory_lines (purchase_id);
CREATE INDEX IF NOT EXISTS idx_pal_accessory_id  ON public.purchase_accessory_lines (accessory_id);

-- ─── RPC: register_accessory_batch ───────────────────────────────────────────
-- Inserts the line AND atomically increments accessories.stock.

ALTER TABLE public.accessories
  ALTER COLUMN purchase_price_usd SET DEFAULT 0;

DROP FUNCTION IF EXISTS public.register_accessory_batch(UUID, UUID, INTEGER, NUMERIC);

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
BEGIN
  INSERT INTO purchase_accessory_lines (purchase_id, accessory_id, quantity, unit_price_usd)
  VALUES (p_purchase_id, p_accessory_id, p_quantity, p_unit_price_usd);

  UPDATE accessories
     SET stock      = stock + p_quantity,
       supplier_id = p_supplier_id,
       purchase_price_usd = p_unit_price_usd,
         updated_at = now()
   WHERE id = p_accessory_id;

  RETURN p_quantity;
END;
$$;

COMMENT ON FUNCTION public.register_accessory_batch(UUID, UUID, UUID, INTEGER, NUMERIC) IS
  'Registra una linea de accesorio en una compra e incrementa el stock del accesorio';

-- ─── Update purchases_view ────────────────────────────────────────────────────
-- item_count now includes both device units (inventory_items) and accessory
-- quantities (purchase_accessory_lines) to give the true total of the purchase.

CREATE OR REPLACE VIEW public.purchases_view AS
SELECT
  p.id,
  p.supplier_id,
  p.branch_id,
  p.total_usd,
  p.purchased_at,
  p.notes,
  p.created_at,
  p.created_by,
  p.updated_at,
  p.updated_by,
  p.is_deleted,
  s.name  AS supplier_name,
  b.name  AS branch_name,
  COALESCE(ii_counts.cnt, 0) + COALESCE(pal_counts.qty, 0) AS item_count
FROM public.purchases p
LEFT JOIN public.suppliers s ON s.id = p.supplier_id
LEFT JOIN public.branches  b ON b.id = p.branch_id
LEFT JOIN (
  SELECT purchase_id, COUNT(*) AS cnt
  FROM   public.inventory_items
  GROUP  BY purchase_id
) ii_counts  ON ii_counts.purchase_id  = p.id
LEFT JOIN (
  SELECT purchase_id, SUM(quantity) AS qty
  FROM   public.purchase_accessory_lines
  GROUP  BY purchase_id
) pal_counts ON pal_counts.purchase_id = p.id
WHERE p.is_deleted = false;

COMMENT ON VIEW public.purchases_view IS
  'Vista plana de compras con nombre de proveedor/sucursal y conteo total de unidades (dispositivos + accesorios)';

-- ─── Permissions ──────────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON TABLE public.purchase_accessory_lines TO web_user;
GRANT EXECUTE ON FUNCTION public.register_accessory_batch(UUID, UUID, UUID, INTEGER, NUMERIC) TO web_user;
GRANT SELECT ON public.purchases_view TO web_user;
GRANT SELECT ON public.purchases_view TO web_anon;

SELECT '010 — purchase_accessory_lines migration applied successfully' AS message;
