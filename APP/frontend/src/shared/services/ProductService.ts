/**
 * ProductService
 *
 * Handles business logic for product variants (`product_variants` table).
 *
 * The service is responsible for:
 *  - Delegating CRUD to the PostgREST product repository
 *  - Enriching raw Product entities with resolved names in `toView()`
 *  - Exposing a `search()` helper compatible with CreatableSelect
 *
 * Note: stock is computed by the repository from embedded inventory_items.
 * The service does NOT sync stock — that concept belongs to RxDB and is removed.
 */

import { BaseService } from './BaseService';
import { pgFetch } from '../api/client';
import type {
  Product,
  ProductView,
  CreateProductData,
  UpdateProductData,
  ProductFilter,
} from '../types/modelTypes/Product';
import { getProductRepository } from '../db/repositories/product.repository';
import { createLazyService } from './lazyService';
import { generateShortCode } from '../utils/generateShortCode';

interface RawInventoryVariantRow {
  variant_id: string;
}

// ---------------------------------------------------------------------------
// Helper — build a human-readable display name from variant attributes
// ---------------------------------------------------------------------------

function buildVariantName(product: Product, modelName: string): string {
  const parts: string[] = [modelName];
  if (product.storage) parts.push(product.storage);
  if (product.color)   parts.push(product.color);
  if (product.simType) parts.push(product.simType);
  return parts.join(' — ');
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

class ProductService extends BaseService<
  Product,
  ProductView,
  CreateProductData,
  UpdateProductData,
  ProductFilter
> {
  constructor() {
    super(getProductRepository());
  }

  /**
   * Transforms a raw Product (product_variants row) into a ProductView.
   *
   * Resolved names (modelName, brandName, etc.) are injected by the repository
   * from PostgREST embedded joins and stored in the `resolved*` optional fields.
   */
  protected async toView(entity: Product): Promise<ProductView> {
    const modelName = entity.resolvedModelName ?? entity.modelId;

    return {
      ...entity,
      name:         buildVariantName(entity, modelName),
      price:        entity.salePriceUsd,
      modelName,
      brandName:    entity.resolvedBrandName,
      familyName:   entity.resolvedFamilyName,
      categoryName: entity.resolvedCategoryName,
      // Legacy optional fields — kept for UI component compatibility
      code:        entity.qrCode,
      description: undefined,
    };
  }

  /** Override create to auto-generate a QR code if none provided */
  override async create(data: CreateProductData): Promise<ProductView> {
    const payload: CreateProductData = {
      ...data,
      qrCode: data.qrCode ?? generateShortCode('VAR'),
    };
    return super.create(payload);
  }

  /**
   * Full-text search across product variants.
   * Compatible with the `searchFunction` prop of CreatableSelect.
   *
   * @param query  Text to match against model name, storage, or color
   */
  async search(query: string): Promise<ProductView[]> {
    const result = await this.getAllView(1, 30, query);
    return result.items;
  }

  /**
   * Replaces the global stock with stock scoped to a branch.
   *
   * Uses one (or few) PostgREST reads to inventory_items and counts by variant_id
   * in memory to keep the UI aligned with the active branch selection.
   */
  async withBranchStock(products: ProductView[], branchId?: string): Promise<ProductView[]> {
    if (!branchId || products.length === 0) return products;

    const variantIds = Array.from(new Set(products.map((p) => p.id))).filter(Boolean);
    if (variantIds.length === 0) return products;

    const counts = new Map<string, number>();
    const chunkSize = 200;

    for (let i = 0; i < variantIds.length; i += chunkSize) {
      const chunk = variantIds.slice(i, i + chunkSize);
      const inClause = chunk.join(',');
      const query = `/inventory_items?select=variant_id&branch_id=eq.${branchId}&status=eq.available&variant_id=in.(${inClause})`;
      const rows = await pgFetch<RawInventoryVariantRow[]>(query);

      for (const row of rows) {
        const current = counts.get(row.variant_id) ?? 0;
        counts.set(row.variant_id, current + 1);
      }
    }

    return products.map((product) => ({
      ...product,
      stock: counts.get(product.id) ?? 0,
    }));
  }
}

export const productService = createLazyService(() => new ProductService());
