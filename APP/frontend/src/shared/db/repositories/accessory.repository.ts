/**
 * Accessory repository — PostgREST implementation.
 *
 * As of migration 012, accessories is a GLOBAL catalog (no branch_id, no stock).
 * Per-branch stock lives in `accessory_stock` and is resolved via an embedded
 * PostgREST join filtered by AccessoryFilter.branchId.
 *
 * PostgREST embedded-resource filter syntax:
 *   /accessories?select=*,accessory_stock(stock,branch_id)&accessory_stock.branch_id=eq.{uuid}
 * Returns at most one accessory_stock row per accessory (the branch-specific one).
 */

import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type {
  Accessory,
  CreateAccessoryData,
  UpdateAccessoryData,
  AccessoryFilter,
} from '../../types/modelTypes/Accessory';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface IAccessoryRepository
  extends ICrudBaseRepository<Accessory, CreateAccessoryData, UpdateAccessoryData, AccessoryFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row shape (with PostgREST embedded join objects)
// ---------------------------------------------------------------------------

interface RawAccessoryRow extends RawRow {
  id: string;
  category_id: string;
  brand_id?: string | null;
  supplier_id?: string | null;
  name: string;
  variant_description?: string | null;
  stock_min_alert: number;
  purchase_price_usd: number;
  sale_price_usd: number;
  wholesale_price_usd?: number | null;
  verification_status: 'pending' | 'verified';
  verified_by?: string | null;
  verified_at?: string | null;
  qr_code?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  is_deleted: boolean;
  // Embedded join objects
  categories?: { name?: string | null } | null;
  brands?: { name?: string | null } | null;
  suppliers?: { name?: string | null } | null;
  // Per-branch stock — array with 0 or 1 element depending on branch filter
  accessory_stock?: Array<{ stock: number; branch_id: string }> | null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTAccessoryRepository
  extends BasePostgRESTRepository<Accessory, CreateAccessoryData, UpdateAccessoryData, AccessoryFilter>
  implements IAccessoryRepository
{
  constructor() {
    super('accessories');
  }

  protected override buildSelectParams(): string {
    return 'id,category_id,brand_id,supplier_id,name,variant_description,stock_min_alert,purchase_price_usd,sale_price_usd,wholesale_price_usd,verification_status,verified_by,verified_at,qr_code,created_at,created_by,updated_at,updated_by,is_deleted,categories(name),brands(name),suppliers(name),accessory_stock(stock,branch_id)';
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    const q = `*${query}*`;
    params.set('or', `(name.ilike.${q},variant_description.ilike.${q})`);
  }

  protected override buildFilters(filter: AccessoryFilter, params: URLSearchParams): void {
    if (filter.categoryId) params.set('category_id', `eq.${filter.categoryId}`);
    if (filter.brandId)    params.set('brand_id',    `eq.${filter.brandId}`);
    // branchId filters the embedded accessory_stock join, NOT the accessories table
    if (filter.branchId)   params.set('accessory_stock.branch_id', `eq.${filter.branchId}`);
  }

  protected mapRow(raw: RawRow): Accessory {
    const row = raw as RawAccessoryRow;
    return {
      id:         row.id,
      categoryId: row.category_id,
      brandId:    row.brand_id    ?? undefined,
      supplierId: row.supplier_id ?? undefined,
      name:       row.name,
      variantDescription:  row.variant_description ?? undefined,
      stockMinAlert:       Number(row.stock_min_alert ?? 3),
      purchasePriceUsd:    Number(row.purchase_price_usd),
      salePriceUsd:        Number(row.sale_price_usd),
      wholesalePriceUsd:   row.wholesale_price_usd != null ? Number(row.wholesale_price_usd) : undefined,
      verificationStatus:  row.verification_status ?? 'pending',
      verifiedBy:  row.verified_by  ?? undefined,
      verifiedAt:  row.verified_at  ?? undefined,
      qrCode:      row.qr_code      ?? undefined,
      createdAt:   row.created_at,
      createdBy:   row.created_by  ?? undefined,
      updatedAt:   row.updated_at  ?? undefined,
      updatedBy:   row.updated_by  ?? undefined,
      isDeleted:   Boolean(row.is_deleted),
      resolvedCategoryName: row.categories?.name ?? undefined,
      resolvedBrandName:    row.brands?.name     ?? undefined,
      resolvedSupplierName: row.suppliers?.name  ?? undefined,
      // Stock from embedded accessory_stock (first matching row for the branch filter)
      resolvedBranchStock:  row.accessory_stock?.[0]?.stock ?? 0,
    };
  }

  protected mapCreateToBody(data: CreateAccessoryData): RawRow {
    return {
      category_id:         data.categoryId,
      brand_id:            data.brandId            ?? null,
      supplier_id:         data.supplierId         ?? null,
      name:                data.name,
      variant_description: data.variantDescription ?? null,
      stock_min_alert:     data.stockMinAlert       ?? 3,
      purchase_price_usd:  data.purchasePriceUsd    ?? 0,
      sale_price_usd:      data.salePriceUsd,
      wholesale_price_usd: data.wholesalePriceUsd  ?? null,
      qr_code:             data.qrCode             ?? null,
      created_by:          data.createdBy          ?? null,
      created_at:          new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    };
  }

  protected mapUpdateToBody(data: UpdateAccessoryData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.categoryId         !== undefined) body.category_id         = data.categoryId;
    if (data.brandId            !== undefined) body.brand_id            = data.brandId;
    if (data.supplierId         !== undefined) body.supplier_id         = data.supplierId;
    if (data.name               !== undefined) body.name                = data.name;
    if (data.variantDescription !== undefined) body.variant_description = data.variantDescription;
    if (data.stockMinAlert      !== undefined) body.stock_min_alert     = data.stockMinAlert;
    if (data.purchasePriceUsd   !== undefined) body.purchase_price_usd  = data.purchasePriceUsd;
    if (data.salePriceUsd       !== undefined) body.sale_price_usd      = data.salePriceUsd;
    if (data.wholesalePriceUsd  !== undefined) body.wholesale_price_usd = data.wholesalePriceUsd;
    if (data.qrCode             !== undefined) body.qr_code             = data.qrCode;
    if (data.updatedBy          !== undefined) body.updated_by          = data.updatedBy;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getAccessoryRepository = (): IAccessoryRepository =>
  new PostgRESTAccessoryRepository();
