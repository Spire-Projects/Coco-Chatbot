-- MIGRATION 013 — Sales module full restructure
--
-- 1. Makes register_id nullable (TODO: link to daily cash closure later)
-- 2. Adds missing columns to sales + sale_items
-- 3. Adds columns to trade_in_devices (device details stored in inventory_items)
-- 4. Bootstraps nits table (existed empty)
-- 5. Creates sales_view with resolved joins
-- 6. Creates atomic create_sale_with_items RPC

-- ─────────────────────────────────────────────────────────────
-- 1. ALTER TABLE sales
-- ─────────────────────────────────────────────────────────────

-- register_id → nullable (TODO: tied to daily cash register closure)
ALTER TABLE sales ALTER COLUMN register_id DROP NOT NULL;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS client_id                   UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS number_invoice              TEXT,
  ADD COLUMN IF NOT EXISTS is_draft                    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS factured                    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nit_client                  TEXT,
  ADD COLUMN IF NOT EXISTS social_reason_client        TEXT,
  ADD COLUMN IF NOT EXISTS sale_notes                  TEXT,
  ADD COLUMN IF NOT EXISTS total_without_discount_usd  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_discount_usd          NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by                  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────
-- 2. ALTER TABLE sale_items
-- ─────────────────────────────────────────────────────────────

ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS discount_pct  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_usd  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_usd     NUMERIC(10,2);

-- ─────────────────────────────────────────────────────────────
-- 3. ALTER TABLE trade_in_devices
-- (device data — battery, OS, condition, IMEI — lives in inventory_items)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE trade_in_devices
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─────────────────────────────────────────────────────────────
-- 4. CREATE TABLE nits
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  number_nit    TEXT        NOT NULL,
  social_reason TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID        REFERENCES users(id),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  is_deleted    BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS nits_number_nit_unique ON nits(number_nit) WHERE is_deleted = FALSE;

-- ─────────────────────────────────────────────────────────────
-- 5. CREATE OR REPLACE VIEW sales_view
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

  -- Resolved joins
  c.name                        AS client_name,
  c.phone                       AS client_phone,
  u.name                        AS seller_name,
  b.name                        AS branch_name,

  -- Sale items as JSON array
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
          'is_device',      si.is_device
        )
      )
      FROM sale_items si
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
      'variant_display',    CONCAT(mo.name, ' ', pv.storage, ' ', pv.color),
      'imei',               ii.imei,
      'condition',          ii.condition,
      'battery_percentage', ii.battery_percentage,
      'os_version',         ii.os_version,
      'technical_notes',    ii.technical_notes
    )
    FROM trade_in_devices tid
    JOIN inventory_items   ii  ON tid.generated_item_id = ii.id
    JOIN product_variants  pv  ON ii.variant_id = pv.id
    JOIN models            mo  ON pv.model_id   = mo.id
    WHERE tid.sale_id = s.id
    LIMIT 1
  ) AS trade_in

FROM sales s
LEFT JOIN clients  c ON s.client_id = c.id
LEFT JOIN users    u ON s.user_id   = u.id
LEFT JOIN branches b ON s.branch_id = b.id;

GRANT SELECT ON sales_view TO web_user, web_anon;

-- ─────────────────────────────────────────────────────────────
-- 6. CREATE FUNCTION create_sale_with_items (atomic RPC)
-- ─────────────────────────────────────────────────────────────
--
-- p_items  JSONB array of:
--   { item_id, accessory_id, quantity, unit_price_usd, unit_price_bob,
--     discount_pct, discount_usd, total_usd, is_device }
--
-- p_trade_in  JSONB object (optional):
--   { variant_id, imei, condition, battery_percentage, os_version,
--     technical_notes, agreed_value_usd }
-- ─────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.create_sale_with_items(UUID, UUID, UUID, payment_method, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_sale_with_items(
  p_branch_id                  UUID,
  p_user_id                    UUID,
  p_created_by                 UUID,
  p_payment_method             payment_method,
  p_exchange_rate              NUMERIC,
  p_total_without_discount_usd NUMERIC,
  p_total_discount_usd         NUMERIC,
  p_total_usd                  NUMERIC,
  p_total_bob                  NUMERIC,
  p_nit_client                 TEXT        DEFAULT NULL,
  p_social_reason_client       TEXT        DEFAULT NULL,
  p_sale_notes                 TEXT        DEFAULT NULL,
  p_number_invoice             TEXT        DEFAULT NULL,
  p_notes                      TEXT        DEFAULT NULL,
  p_client_id                  UUID        DEFAULT NULL,
  p_items                      JSONB       DEFAULT '[]',
  p_trade_in                   JSONB       DEFAULT NULL
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

  -- 2. Insert each sale line and update stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_item_id      := (v_item->>'item_id')::UUID;
    v_accessory_id := (v_item->>'accessory_id')::UUID;
    v_quantity     := COALESCE((v_item->>'quantity')::INTEGER, 1);

    INSERT INTO sale_items (
      sale_id,
      item_id,
      accessory_id,
      quantity,
      unit_price_usd,
      unit_price_bob,
      discount_pct,
      discount_usd,
      total_usd,
      is_device
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
        SET status     = 'sold',
            updated_at = NOW()
        WHERE id = v_item_id;
    END IF;

    -- Decrement accessory stock for this branch
    IF v_accessory_id IS NOT NULL THEN
      UPDATE accessory_stock
        SET stock = stock - v_quantity
        WHERE accessory_id = v_accessory_id
          AND branch_id    = p_branch_id;
    END IF;
  END LOOP;

  -- 3. Handle trade-in device (goes to inventory, then links to sale)
  IF p_trade_in IS NOT NULL AND p_trade_in != 'null'::jsonb THEN
    INSERT INTO inventory_items (
      branch_id,
      variant_id,
      imei,
      condition,
      battery_percentage,
      os_version,
      technical_notes,
      purchase_price_usd,
      status,
      created_at,
      updated_at
    )
    VALUES (
      p_branch_id,
      (p_trade_in->>'variant_id')::UUID,
      NULLIF(TRIM(COALESCE(p_trade_in->>'imei', '')), ''),
      COALESCE(p_trade_in->>'condition', 'used')::product_condition,
      (p_trade_in->>'battery_percentage')::INTEGER,
      NULLIF(TRIM(COALESCE(p_trade_in->>'os_version', '')), ''),
      NULLIF(TRIM(COALESCE(p_trade_in->>'technical_notes', '')), ''),
      (p_trade_in->>'agreed_value_usd')::NUMERIC,
      'available',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_trade_item_id;

    INSERT INTO trade_in_devices (
      sale_id,
      generated_item_id,
      agreed_value_usd,
      notes
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

COMMENT ON FUNCTION public.create_sale_with_items IS
  'Crea una venta con sus items de forma atomica. Marca dispositivos como vendidos, decrementa stock de accesorios, y registra el dispositivo de trade-in en inventario si aplica.';

GRANT EXECUTE ON FUNCTION public.create_sale_with_items TO web_user;
GRANT EXECUTE ON FUNCTION public.create_sale_with_items TO web_anon;

-- Permissions for new/updated tables
GRANT SELECT, INSERT, UPDATE ON nits TO web_user;
GRANT SELECT ON nits TO web_anon;

SELECT '013 — sales restructure migration applied successfully' AS message;
