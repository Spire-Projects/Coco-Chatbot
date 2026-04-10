-- MIGRATION 005 — purchases_view
-- Flattened read view: resolves supplier_name, branch_name and aggregates item count.
-- Reads from this view; writes still go to purchases base table.

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
  s.name AS supplier_name,
  b.name AS branch_name,
  COUNT(ii.id) AS item_count
FROM public.purchases p
LEFT JOIN public.suppliers  s  ON s.id = p.supplier_id
LEFT JOIN public.branches   b  ON b.id = p.branch_id
LEFT JOIN public.inventory_items ii ON ii.purchase_id = p.id
WHERE p.is_deleted = false
GROUP BY
  p.id, p.supplier_id, p.branch_id, p.total_usd, p.purchased_at,
  p.notes, p.created_at, p.created_by, p.updated_at, p.updated_by, p.is_deleted,
  s.name, b.name;

GRANT SELECT ON public.purchases_view TO web_user;
GRANT SELECT ON public.purchases_view TO web_anon;

-- Allow web_user to call the batch registration function
GRANT EXECUTE ON FUNCTION public.register_items_batch TO web_user;
