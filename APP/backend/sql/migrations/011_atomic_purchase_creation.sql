-- MIGRATION 011 — Atomic purchase creation
--
-- Fixes partial purchases when one of the line-registration RPC calls fails.
-- Creates a single transactional RPC that inserts purchase header + all lines
-- (devices and accessories) in one PL/pgSQL transaction.

DROP FUNCTION IF EXISTS public.create_purchase_with_lines(UUID, UUID, NUMERIC, DATE, TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION public.create_purchase_with_lines(
  p_supplier_id  UUID,
  p_branch_id    UUID,
  p_total_usd    NUMERIC,
  p_purchased_at DATE,
  p_notes        TEXT,
  p_created_by   UUID,
  p_lines        JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id UUID;
  v_line        JSONB;
  v_lines       JSONB := COALESCE(p_lines, '[]'::jsonb);
BEGIN
  INSERT INTO purchases (
    supplier_id,
    branch_id,
    total_usd,
    purchased_at,
    notes,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    p_supplier_id,
    p_branch_id,
    p_total_usd,
    p_purchased_at,
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    p_created_by,
    now(),
    now()
  )
  RETURNING id INTO v_purchase_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines)
  LOOP
    IF COALESCE(v_line->>'kind', 'device') = 'accessory' THEN
      PERFORM public.register_accessory_batch(
        v_purchase_id,
        (v_line->>'accessory_id')::UUID,
        p_supplier_id,
        (v_line->>'quantity')::INTEGER,
        (v_line->>'unit_price_usd')::NUMERIC
      );
    ELSE
      PERFORM public.register_items_batch(
        v_purchase_id,
        (v_line->>'variant_id')::UUID,
        p_branch_id,
        p_supplier_id,
        COALESCE(v_line->>'condition', 'new')::product_condition,
        COALESCE(v_line->'items', '[]'::jsonb)
      );
    END IF;
  END LOOP;

  RETURN v_purchase_id;
END;
$$;

COMMENT ON FUNCTION public.create_purchase_with_lines(UUID, UUID, NUMERIC, DATE, TEXT, UUID, JSONB) IS
  'Crea compra + lineas (dispositivos/accesorios) de forma atomica, evitando compras parciales';

GRANT EXECUTE ON FUNCTION public.create_purchase_with_lines(UUID, UUID, NUMERIC, DATE, TEXT, UUID, JSONB) TO web_user;

SELECT '011 — atomic purchase creation migration applied successfully' AS message;
