-- MIGRATION 004
CREATE TABLE purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  total_usd       NUMERIC(15, 2),        -- monto total de la compra
  purchased_at    DATE NOT NULL,          -- fecha real de la compra
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  created_by      UUID,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID,
  is_deleted      BOOLEAN DEFAULT false
);

-- Vincular inventory_items a una compra
ALTER TABLE inventory_items
  ADD COLUMN purchase_id UUID REFERENCES purchases(id);
-- nullable: items ingresados antes de esta migración no tienen purchase

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