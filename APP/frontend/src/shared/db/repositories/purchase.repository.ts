/**
 * Purchase repository — PostgREST implementation.
 *
 * Reads from `purchases_view` (resolves supplier_name, branch_name, item_count).
 * Writes to the `purchases` base table via writeTableName.
 *
 * Note: inventory_items are inserted via the register_items_batch RPC —
 * that call is orchestrated in PurchaseService.create(), not here.
 */

import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type {
  Purchase,
  CreatePurchaseData,
  UpdatePurchaseData,
  PurchaseFilter,
} from '../../types/modelTypes/PurchaseBox';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface IPurchaseRepository
  extends ICrudBaseRepository<Purchase, CreatePurchaseData, UpdatePurchaseData, PurchaseFilter> {}

// ---------------------------------------------------------------------------
// Raw view row
// ---------------------------------------------------------------------------

interface RawPurchaseView extends RawRow {
  id: string;
  supplier_id: string;
  branch_id: string;
  total_usd?: number | null;
  purchased_at: string;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  is_deleted: boolean;
  // Flat resolved (from view JOINs)
  supplier_name?: string | null;
  branch_name?: string | null;
  item_count?: number | string | null; // COUNT bigint → coerce with Number()
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTPurchaseRepository
  extends BasePostgRESTRepository<Purchase, CreatePurchaseData, UpdatePurchaseData, PurchaseFilter>
  implements IPurchaseRepository
{
  constructor() {
    super('purchases_view');
  }

  protected override readonly writeTableName = 'purchases';
  // View bakes in WHERE is_deleted = false
  protected override readonly hasSoftDelete = false;
  protected override readonly defaultOrderColumn = 'purchased_at';

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    const q = `*${query}*`;
    params.set('or', `(supplier_name.ilike.${q},branch_name.ilike.${q},notes.ilike.${q})`);
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  protected override buildFilters(filter: PurchaseFilter, params: URLSearchParams): void {
    if (filter.supplierId) params.set('supplier_id', `eq.${filter.supplierId}`);
    if (filter.branchId)   params.set('branch_id',   `eq.${filter.branchId}`);
  }

  // ---------------------------------------------------------------------------
  // Row mapping — includes resolved view fields
  // ---------------------------------------------------------------------------

  protected mapRow(raw: RawRow): Purchase {
    const row = raw as RawPurchaseView;
    return {
      id: row.id,
      supplierId: row.supplier_id,
      branchId: row.branch_id,
      totalUsd: row.total_usd != null ? Number(row.total_usd) : undefined,
      purchasedAt: row.purchased_at,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      isDeleted: Boolean(row.is_deleted),
      // Resolved from view
      resolvedSupplierName: row.supplier_name ?? undefined,
      resolvedBranchName:   row.branch_name   ?? undefined,
      resolvedItemCount:    row.item_count != null ? Number(row.item_count) : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Create / Update body mapping
  // ---------------------------------------------------------------------------

  protected mapCreateToBody(data: CreatePurchaseData): RawRow {
    return {
      supplier_id:  data.supplierId,
      branch_id:    data.branchId,
      total_usd:    data.totalUsd ?? null,
      purchased_at: data.purchasedAt,
      notes:        data.notes ?? null,
      created_by:   data.createdBy,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    };
  }

  protected mapUpdateToBody(data: UpdatePurchaseData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.supplierId  !== undefined) body.supplier_id  = data.supplierId;
    if (data.totalUsd    !== undefined) body.total_usd    = data.totalUsd;
    if (data.purchasedAt !== undefined) body.purchased_at = data.purchasedAt;
    if (data.notes       !== undefined) body.notes        = data.notes;
    if (data.updatedBy   !== undefined) body.updated_by   = data.updatedBy;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getPurchaseRepository = (): IPurchaseRepository =>
  new PostgRESTPurchaseRepository();


