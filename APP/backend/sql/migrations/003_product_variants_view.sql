-- ============================================================
-- Migration 003 — product_variants_view
--
-- Flattened read-only view of product_variants that resolves all
-- FK relationships (model, brand, family, category) and aggregates
-- the available stock in a single row.
--
-- Replaces the multi-level embedded-select approach in the frontend
-- so that full-text search, filters, and display can all operate on
-- flat top-level columns without cross-table OR limitations.
--
-- Usage (PostgREST):
--   GET /product_variants_view?model_name=ilike.*iPhone*
--   GET /product_variants_view?or=(model_name.ilike.*verde*,color.ilike.*verde*)
--   GET /product_variants_view?brand_id=eq.<uuid>
--
-- Writes still go to the base table product_variants.
-- ============================================================

CREATE OR REPLACE VIEW public.product_variants_view AS
SELECT
  pv.id,
  pv.model_id,
  pv.storage,
  pv.color,
  pv.sim_type,
  pv.sale_price_usd,
  pv.wholesale_price_usd,
  pv.store_warranty_months,
  pv.brand_warranty,
  pv.brand_warranty_months,
  pv.qr_code,
  pv.created_at,
  pv.created_by,
  pv.updated_at,
  pv.updated_by,
  pv.is_deleted,

  -- Flat resolved columns from JOINs
  m.name         AS model_name,
  m.model_number AS model_number,
  m.brand_id     AS brand_id,
  m.family_id    AS family_id,
  m.category_id  AS category_id,
  b.name         AS brand_name,
  f.name         AS family_name,
  c.name         AS category_name,

  -- Available stock: count inventory_items with status = 'available'
  COUNT(ii.id) FILTER (WHERE ii.status = 'available') AS stock

FROM public.product_variants pv
LEFT JOIN public.models     m  ON m.id  = pv.model_id
LEFT JOIN public.brands     b  ON b.id  = m.brand_id
LEFT JOIN public.families   f  ON f.id  = m.family_id
LEFT JOIN public.categories c  ON c.id  = m.category_id
LEFT JOIN public.inventory_items ii ON ii.variant_id = pv.id
WHERE pv.is_deleted = false
GROUP BY
  pv.id, pv.model_id, pv.storage, pv.color, pv.sim_type,
  pv.sale_price_usd, pv.wholesale_price_usd, pv.store_warranty_months,
  pv.brand_warranty, pv.brand_warranty_months, pv.qr_code,
  pv.created_at, pv.created_by, pv.updated_at, pv.updated_by, pv.is_deleted,
  m.name, m.model_number, m.brand_id, m.family_id, m.category_id,
  b.name, f.name, c.name;

-- Grant read access to the roles PostgREST uses
GRANT SELECT ON public.product_variants_view TO web_user;
GRANT SELECT ON public.product_variants_view TO web_anon;
