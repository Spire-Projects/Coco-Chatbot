-- MIGRATION 015 — Sale number per branch + creator name in sales_view
--
-- Changes:
--   1. Add sale_prefix column to branches (e.g. 'AMER', 'TARJ')
--   2. Backfill existing branches and sales with consecutive numbers
--   3. Rebuild sales_view adding creator_name (join users on created_by)
--   4. Rebuild create_sale_with_items RPC to auto-generate number_invoice


-- ─────────────────────────────────────────────────────────────
-- 1. Add sale_prefix to branches (empty string = not configured)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS sale_prefix TEXT NOT NULL DEFAULT '';

-- Partial unique index: two branches must not share the same non-empty prefix
CREATE UNIQUE INDEX IF NOT EXISTS branches_sale_prefix_unique_idx
  ON branches(sale_prefix)
  WHERE sale_prefix <> '';


-- ─────────────────────────────────────────────────────────────
-- 2. Backfill known branches
-- ─────────────────────────────────────────────────────────────
UPDATE branches SET sale_prefix = 'AMER' WHERE id = 'aa51b7d8-7cfa-4b3d-b717-0a9dff9b3cad';
UPDATE branches SET sale_prefix = 'TARJ' WHERE id = 'bc7deb02-97f8-4656-a0c0-909d9b7ae716';


-- ─────────────────────────────────────────────────────────────
-- 3. Backfill existing sales that still have NULL number_invoice
--    Assign consecutive numbers per branch ordered by created_at
-- ─────────────────────────────────────────────────────────────
WITH numbered AS (
  SELECT
    s.id,
    b.sale_prefix,
    ROW_NUMBER() OVER (PARTITION BY s.branch_id ORDER BY s.created_at) AS rn
  FROM sales s
  JOIN branches b ON b.id = s.branch_id
  WHERE s.is_deleted = FALSE
    AND s.number_invoice IS NULL
    AND b.sale_prefix <> ''
)
UPDATE sales s
SET number_invoice = n.sale_prefix || '-' || LPAD(n.rn::TEXT, 5, '0')
FROM numbered n
WHERE s.id = n.id;


-- ─────────────────────────────────────────────────────────────
-- 4. Rebuild sales_view adding creator_name
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS sales_view CASCADE;

CREATE VIEW sales_view AS
SELECT
  s.id,
  s.register_id,
  s.branch_id,
  s.user_id,
  s.client_id,
  s.number_invoice,
  s.is_draft,
  s.factured,
  s.nit_client,
  s.social_reason_client,
  s.sale_notes,
  s.payment_method,
  s.payment_currency,
  s.bank_account_id,
  s.payment_verified,
  s.verified_by,
  s.exchange_rate_used,
  s.total_without_discount_usd,
  s.total_discount_usd,
  s.total_usd,
  s.total_bob,
  s.notes,
  s.is_deleted,
  s.created_by,
  s.created_at,
  s.updated_at,

  -- Resolved join columns
  c.name   AS client_name,
  c.phone  AS client_phone,
  u.name   AS seller_name,
  b.name   AS branch_name,
  uc.name  AS creator_name,

  -- Sale items as JSON array with item_name and imei resolved
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id',             si.id,
          'item_id',        si.item_id,
          'accessory_id',   si.accessory_id,
          'quantity',       si.quantity,
          'unit_price_usd', si.unit_price_usd,
          'unit_price_bob', si.unit_price_bob,
          'discount_pct',   si.discount_pct,
          'discount_usd',   si.discount_usd,
          'total_usd',      si.total_usd,
          'is_device',      si.is_device,
          'item_name',      CASE
                              WHEN si.is_device
                                THEN TRIM(CONCAT(br.name, ' ', mo.name, ' ', pv.storage, ' ', pv.color))
                              ELSE acc.name
                            END,
          'imei',           ii.imei
        )
      )
      FROM sale_items si
      LEFT JOIN inventory_items ii  ON si.item_id      = ii.id
      LEFT JOIN product_variants pv ON ii.variant_id   = pv.id
      LEFT JOIN models           mo ON pv.model_id     = mo.id
      LEFT JOIN brands           br ON mo.brand_id     = br.id
      LEFT JOIN accessories     acc ON si.accessory_id = acc.id
      WHERE si.sale_id = s.id
    ),
    '[]'::json
  ) AS items,

  -- Trade-in device (at most one per sale)
  (
    SELECT json_build_object(
      'id',                 tid.id,
      'generated_item_id',  tid.generated_item_id,
      'agreed_value_usd',   tid.agreed_value_usd,
      'notes',              tid.notes,
      'variant_display',    TRIM(CONCAT(br2.name, ' ', mo2.name, ' ', pv2.storage, ' ', pv2.color)),
      'imei',               ii2.imei,
      'condition',          ii2.condition,
      'battery_percentage', ii2.battery_percentage,
      'os_version',         ii2.os_version,
      'technical_notes',    ii2.technical_notes
    )
    FROM trade_in_devices tid
    JOIN inventory_items  ii2 ON tid.generated_item_id = ii2.id
    JOIN product_variants pv2 ON ii2.variant_id        = pv2.id
    JOIN models           mo2 ON pv2.model_id          = mo2.id
    JOIN brands           br2 ON mo2.brand_id          = br2.id
    WHERE tid.sale_id = s.id
    LIMIT 1
  ) AS trade_in

FROM sales s
LEFT JOIN clients  c  ON s.client_id  = c.id
LEFT JOIN users    u  ON s.user_id    = u.id
LEFT JOIN users    uc ON s.created_by = uc.id
LEFT JOIN branches b  ON s.branch_id  = b.id;

GRANT SELECT ON sales_view TO web_user, web_anon;


-- ─────────────────────────────────────────────────────────────
-- 5. Rebuild create_sale_with_items RPC with auto-numbering
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_sale_with_items(UUID, UUID, UUID, payment_method, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_sale_with_items(
  p_branch_id                  UUID,
  p_user_id                    UUID,
  p_created_by                 UUID,
  p_payment_method             payment_method,
  p_payment_currency           TEXT,
  p_exchange_rate              NUMERIC,
  p_total_without_discount_usd NUMERIC,
  p_total_discount_usd         NUMERIC,
  p_total_usd                  NUMERIC,
  p_total_bob                  NUMERIC,
  p_nit_client                 TEXT    DEFAULT NULL,
  p_social_reason_client       TEXT    DEFAULT NULL,
  p_sale_notes                 TEXT    DEFAULT NULL,
  p_number_invoice             TEXT    DEFAULT NULL,
  p_notes                      TEXT    DEFAULT NULL,
  p_client_id                  UUID    DEFAULT NULL,
  p_items                      JSONB   DEFAULT '[]',
  p_trade_in                   JSONB   DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id         UUID;
  v_trade_item_id   UUID;
  v_item            JSONB;
  v_items           JSONB    := COALESCE(p_items, '[]'::jsonb);
  v_item_id         UUID;
  v_accessory_id    UUID;
  v_quantity        INTEGER;
  v_prefix          TEXT;
  v_next_seq        INTEGER;
  v_number_invoice  TEXT;
BEGIN

  -- ── Auto-generate number_invoice per branch ─────────────────────────────
  -- Lock the branch row to serialize concurrent inserts (prevents duplicate numbers)
  SELECT COALESCE(
    NULLIF(TRIM(b.sale_prefix), ''),
    UPPER(LEFT(b.id::TEXT, 4))          -- fallback: first 4 chars of UUID
  )
  INTO v_prefix
  FROM branches b
  WHERE b.id = p_branch_id
  FOR UPDATE;

  IF p_number_invoice IS NULL OR TRIM(p_number_invoice) = '' THEN
    -- Find max sequence for this branch matching pattern PREFIX-NNNNN
    SELECT COALESCE(
      MAX(
        CAST(
          REGEXP_REPLACE(number_invoice, '^.*-([0-9]+)$', '\1')
          AS INTEGER
        )
      ),
      0
    ) + 1
    INTO v_next_seq
    FROM sales
    WHERE branch_id   = p_branch_id
      AND is_deleted  = FALSE
      AND number_invoice ~ ('^' || v_prefix || '-[0-9]+$');

    v_number_invoice := v_prefix || '-' || LPAD(v_next_seq::TEXT, 5, '0');
  ELSE
    v_number_invoice := TRIM(p_number_invoice);
  END IF;

  -- ── 1. Insert the sale header ────────────────────────────────────────────
  INSERT INTO sales (
    branch_id,
    user_id,
    created_by,
    payment_method,
    payment_currency,
    exchange_rate_used,
    total_without_discount_usd,
    total_discount_usd,
    total_usd,
    total_bob,
    nit_client,
    social_reason_client,
    sale_notes,
    number_invoice,
    notes,
    client_id,
    is_draft,
    factured,
    is_deleted,
    created_at,
    updated_at
  )
  VALUES (
    p_branch_id,
    p_user_id,
    p_created_by,
    p_payment_method,
    p_payment_currency,
    p_exchange_rate,
    p_total_without_discount_usd,
    p_total_discount_usd,
    p_total_usd,
    p_total_bob,
    NULLIF(TRIM(COALESCE(p_nit_client,           '')), ''),
    NULLIF(TRIM(COALESCE(p_social_reason_client, '')), ''),
    NULLIF(TRIM(COALESCE(p_sale_notes,           '')), ''),
    v_number_invoice,
    NULLIF(TRIM(COALESCE(p_notes,                '')), ''),
    p_client_id,
    FALSE,
    FALSE,
    FALSE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_sale_id;

  -- ── 2. Insert sale_items ─────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_item_id      := NULLIF((v_item->>'item_id'),      '')::UUID;
    v_accessory_id := NULLIF((v_item->>'accessory_id'), '')::UUID;
    v_quantity     := COALESCE((v_item->>'quantity')::INTEGER, 1);

    INSERT INTO sale_items (
      sale_id, item_id, accessory_id,
      quantity, unit_price_usd, unit_price_bob,
      discount_pct, discount_usd, total_usd, is_device
    )
    VALUES (
      v_sale_id,
      v_item_id,
      v_accessory_id,
      v_quantity,
      (v_item->>'unit_price_usd')::NUMERIC,
      (v_item->>'unit_price_bob')::NUMERIC,
      COALESCE((v_item->>'discount_pct')::NUMERIC, 0),
      COALESCE((v_item->>'discount_usd')::NUMERIC, 0),
      (v_item->>'total_usd')::NUMERIC,
      COALESCE((v_item->>'is_device')::BOOLEAN, FALSE)
    );

    -- Mark device as sold
    IF v_item_id IS NOT NULL THEN
      UPDATE inventory_items
      SET status     = 'sold'::product_status,
          sale_id    = v_sale_id,
          updated_at = NOW()
      WHERE id = v_item_id;
    END IF;

    -- Decrement accessory stock for this branch
    IF v_accessory_id IS NOT NULL THEN
      UPDATE accessory_stock
      SET stock = stock - v_quantity, updated_at = NOW()
      WHERE accessory_id = v_accessory_id
        AND branch_id    = p_branch_id
        AND stock        >= v_quantity;
    END IF;
  END LOOP;

  -- ── 3. Handle trade-in device (optional) ────────────────────────────────
  IF p_trade_in IS NOT NULL THEN
    INSERT INTO inventory_items (
      variant_id, imei, condition,
      battery_percentage, os_version, technical_notes,
      branch_id, status, sale_id,
      created_at, updated_at
    )
    VALUES (
      (p_trade_in->>'variant_id')::UUID,
      NULLIF(TRIM(COALESCE(p_trade_in->>'imei', '')), ''),
      COALESCE(p_trade_in->>'condition', 'used')::product_condition,
      NULLIF(p_trade_in->>'battery_percentage', '')::INTEGER,
      NULLIF(TRIM(COALESCE(p_trade_in->>'os_version', '')), ''),
      NULLIF(TRIM(COALESCE(p_trade_in->>'technical_notes', '')), ''),
      p_branch_id,
      'trade_in'::product_status,
      v_sale_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_trade_item_id;

    INSERT INTO trade_in_devices (
      sale_id, generated_item_id, agreed_value_usd, notes
    )
    VALUES (
      v_sale_id,
      v_trade_item_id,
      (p_trade_in->>'agreed_value_usd')::NUMERIC,
      NULLIF(TRIM(COALESCE(p_trade_in->>'notes', '')), '')
    );
  END IF;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sale_with_items TO web_user, web_anon;
