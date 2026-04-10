-- MIGRATION 006
-- Ensure inventory_items supports per-item sale price and RPC persists it.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS sale_price_usd NUMERIC(10, 2);

CREATE OR REPLACE FUNCTION register_items_batch(
  p_purchase_id  UUID,
  p_variant_id   UUID,
  p_branch_id    UUID,
  p_supplier_id  UUID,
  p_condition    product_condition,
  p_items        JSONB
  -- [{imei, purchase_price_usd, sale_price_usd, battery_percentage, os_version, battery_cycles, technical_notes}]
)
RETURNS INT AS $$
DECLARE
  v_item  JSONB;
  v_count INT := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO inventory_items (
      purchase_id, variant_id, branch_id, supplier_id, condition,
      imei, purchase_price_usd, sale_price_usd,
      battery_percentage, os_version, battery_cycles, technical_notes
    ) VALUES (
      p_purchase_id,
      p_variant_id, p_branch_id, p_supplier_id, p_condition,
      v_item->>'imei',
      (v_item->>'purchase_price_usd')::NUMERIC,
      NULLIF(v_item->>'sale_price_usd', '')::NUMERIC,
      NULLIF(v_item->>'battery_percentage', '')::INTEGER,
      v_item->>'os_version',
      NULLIF(v_item->>'battery_cycles', '')::INTEGER,
      v_item->>'technical_notes'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
