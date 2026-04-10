/**
 * Product repository — PostgREST implementation.
 *
 * Reads from `product_variants_view` (a flat PostgreSQL view that resolves all
 * FK names and pre-aggregates available stock). Writes go to `product_variants`
 * via `writeTableName`.
 *
 * The view exposes flat columns model_name, brand_name, family_name,
 * category_name and stock so that search and display require no embedded
 * PostgREST selects.
 */

import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductFilter,
} from '../../types/modelTypes/Product';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface IProductRepository
  extends ICrudBaseRepository<Product, CreateProductData, UpdateProductData, ProductFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row shape (flat view — no embedded objects)
// ---------------------------------------------------------------------------

interface RawProductVariantView extends RawRow {
  id: string;
  model_id: string;
  storage?: string | null;
  color?: string | null;
  sim_type?: string | null;
  sale_price_usd: number;
  wholesale_price_usd?: number | null;
  store_warranty_months?: number | null;
  brand_warranty: boolean;
  brand_warranty_months?: number | null;
  qr_code?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  is_deleted: boolean;
  // Flat resolved columns (joined in the view)
  model_name?: string | null;
  model_number?: string | null;
  brand_id?: string | null;
  family_id?: string | null;
  category_id?: string | null;
  brand_name?: string | null;
  family_name?: string | null;
  category_name?: string | null;
  stock: number; // COUNT() aggregate — comes back as bigint string, coerce with Number()
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTProductRepository
  extends BasePostgRESTRepository<Product, CreateProductData, UpdateProductData, ProductFilter>
  implements IProductRepository
{
  constructor() {
    super('product_variants_view');
  }

  // Reads from the view; writes to the base table directly
  protected override readonly writeTableName = 'product_variants';

  // The view already filters `WHERE pv.is_deleted = false`
  protected override readonly hasSoftDelete = false;

  // ---------------------------------------------------------------------------
  // Select — view is flat, no embedded selects needed
  // ---------------------------------------------------------------------------

  protected override buildSelectParams(): string {
    return '*';
  }

  // ---------------------------------------------------------------------------
  // Search — all columns are flat, one OR covers everything
  // ---------------------------------------------------------------------------

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    const q = `*${query}*`;
    params.set(
      'or',
      `(model_name.ilike.${q},brand_name.ilike.${q},storage.ilike.${q},color.ilike.${q},sim_type.ilike.${q})`,
    );
  }

  // ---------------------------------------------------------------------------
  // Filters — use flat view columns directly
  // ---------------------------------------------------------------------------

  protected override buildFilters(filter: ProductFilter, params: URLSearchParams): void {
    const modelId = filter.modelId ?? filter.model;
    if (modelId)         params.set('model_id',    `eq.${modelId}`);
    if (filter.brandId)  params.set('brand_id',    `eq.${filter.brandId}`);
    if (filter.familyId) params.set('family_id',   `eq.${filter.familyId}`);
    const categoryId = filter.categoryId ?? filter.category;
    if (categoryId)      params.set('category_id', `eq.${categoryId}`);
    if (filter.storage)  params.set('storage',     `eq.${filter.storage}`);
    if (filter.color)    params.set('color',       `eq.${filter.color}`);
  }

  // ---------------------------------------------------------------------------
  // Row mapping  (flat view columns → camelCase entity)
  // ---------------------------------------------------------------------------

  protected mapRow(raw: RawRow): Product {
    const row = raw as RawProductVariantView;
    return {
      id: row.id,
      modelId: row.model_id,
      storage: row.storage ?? undefined,
      color: row.color ?? undefined,
      simType: row.sim_type ?? undefined,
      salePriceUsd: Number(row.sale_price_usd),
      wholesalePriceUsd: row.wholesale_price_usd != null ? Number(row.wholesale_price_usd) : undefined,
      storeWarrantyMonths: row.store_warranty_months ?? undefined,
      brandWarranty: Boolean(row.brand_warranty),
      brandWarrantyMonths: row.brand_warranty_months ?? undefined,
      qrCode: row.qr_code ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      isDeleted: Boolean(row.is_deleted),
      stock: Number(row.stock ?? 0),
      resolvedModelName:    row.model_name ?? undefined,
      resolvedBrandName:    row.brand_name ?? undefined,
      resolvedFamilyName:   row.family_name ?? undefined,
      resolvedCategoryName: row.category_name ?? undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Create / Update body mapping  (camelCase DTO → snake_case DB)
  // ---------------------------------------------------------------------------

  protected mapCreateToBody(data: CreateProductData): RawRow {
    return {
      model_id: data.modelId,
      storage: data.storage ?? null,
      color: data.color ?? null,
      sim_type: data.simType ?? null,
      sale_price_usd: data.salePriceUsd,
      wholesale_price_usd: data.wholesalePriceUsd ?? null,
      store_warranty_months: data.storeWarrantyMonths ?? null,
      brand_warranty: data.brandWarranty ?? false,
      brand_warranty_months: data.brandWarrantyMonths ?? null,
      qr_code: data.qrCode ?? null,
      created_by: data.createdBy ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  protected mapUpdateToBody(data: UpdateProductData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.storage !== undefined)            body.storage = data.storage;
    if (data.color !== undefined)              body.color = data.color;
    if (data.simType !== undefined)            body.sim_type = data.simType;
    if (data.salePriceUsd !== undefined)       body.sale_price_usd = data.salePriceUsd;
    if (data.wholesalePriceUsd !== undefined)  body.wholesale_price_usd = data.wholesalePriceUsd;
    if (data.storeWarrantyMonths !== undefined) body.store_warranty_months = data.storeWarrantyMonths;
    if (data.brandWarranty !== undefined)      body.brand_warranty = data.brandWarranty;
    if (data.brandWarrantyMonths !== undefined) body.brand_warranty_months = data.brandWarrantyMonths;
    if (data.qrCode !== undefined)             body.qr_code = data.qrCode;
    if (data.updatedBy !== undefined)          body.updated_by = data.updatedBy;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getProductRepository = (): IProductRepository =>
  new PostgRESTProductRepository();

