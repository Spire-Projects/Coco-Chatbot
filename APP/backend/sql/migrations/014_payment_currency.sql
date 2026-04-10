-- MIGRATION 014 — Separate payment method from payment currency
--
-- Problem: 'cash_bob' and 'cash_usd' coupled method + currency in one enum value,
-- leaving QR / card without an explicit currency.
--
-- Solution:
--   1. Add payment_currency column ('bob' | 'usd') to the sales table
--   2. Backfill from existing payment_method values
--   3. Add 'cash' to the payment_method enum; migrate combined values
--   4. Rebuild sales_view to expose payment_currency
--   5. Rebuild create_sale_with_items RPC with p_payment_currency parameter


-- ─────────────────────────────────────────────────────────────
-- 0. Add sale_id to inventory_items (tracks which sale a device was sold in)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id);

-- Add 'trade_in' to product_status enum (for trade-in received devices)
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'trade_in';


-- ─────────────────────────────────────────────────────────────
-- 1. Add payment_currency column (nullable for backfill)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_currency TEXT;


-- ─────────────────────────────────────────────────────────────
-- 2. Backfill: derive currency from combined enum value
-- ─────────────────────────────────────────────────────────────
UPDATE sales
SET payment_currency = CASE
  WHEN payment_method::text = 'cash_usd' THEN 'usd'
  ELSE 'bob'
END
WHERE payment_currency IS NULL;


-- ─────────────────────────────────────────────────────────────
-- 3. Make NOT NULL with default
-- ─────────────────────────────────────────────────────────────
ALTER TABLE sales ALTER COLUMN payment_currency SET NOT NULL;
ALTER TABLE sales ALTER COLUMN payment_currency SET DEFAULT 'bob';


-- ─────────────────────────────────────────────────────────────
-- 4. Add 'cash' to the payment_method enum
-- ─────────────────────────────────────────────────────────────
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash';


-- ─────────────────────────────────────────────────────────────
-- 5. Migrate combined values to 'cash'
--    (payment_currency has already been set correctly above)
-- ─────────────────────────────────────────────────────────────
UPDATE sales
SET payment_method = 'cash'::payment_method
WHERE payment_method::text IN ('cash_bob', 'cash_usd');


-- ─────────────────────────────────────────────────────────────
-- 6. Rebuild sales_view (includes payment_currency + item_name/imei)
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
      'variant_display',    TRIM(CONCAT(mo2.name, ' ', pv2.storage, ' ', pv2.color)),
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
    WHERE tid.sale_id = s.id
    LIMIT 1
  ) AS trade_in

FROM sales s
LEFT JOIN clients  c ON s.client_id = c.id
LEFT JOIN users    u ON s.user_id   = u.id
LEFT JOIN branches b ON s.branch_id = b.id;

GRANT SELECT ON sales_view TO web_user, web_anon;


-- ─────────────────────────────────────────────────────────────
-- 7. Rebuild create_sale_with_items RPC with p_payment_currency
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_sale_with_items(UUID, UUID, UUID, payment_method, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB);

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
  v_items           JSONB := COALESCE(p_items, '[]'::jsonb);
  v_item_id         UUID;
  v_accessory_id    UUID;
  v_quantity        INTEGER;
BEGIN

  -- 1. Insert the sale header
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
    NULLIF(TRIM(COALESCE(p_nit_client, '')), ''),
    NULLIF(TRIM(COALESCE(p_social_reason_client, '')), ''),
    NULLIF(TRIM(COALESCE(p_sale_notes, '')), ''),
    NULLIF(TRIM(COALESCE(p_number_invoice, '')), ''),
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    p_client_id,
    FALSE,
    FALSE,
    FALSE,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_sale_id;

  -- 2. Insert sale_items
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
      SET status = 'sold'::product_status,
          sale_id = v_sale_id,
          updated_at = NOW()
      WHERE id = v_item_id;
    END IF;

    -- If accessory: decrement stock for this branch
    IF v_accessory_id IS NOT NULL THEN
      UPDATE accessory_stock
      SET stock = stock - v_quantity, updated_at = NOW()
      WHERE accessory_id = v_accessory_id
        AND branch_id = p_branch_id
        AND stock >= v_quantity;
    END IF;
  END LOOP;

  -- 3. Handle trade-in device (optional)
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
