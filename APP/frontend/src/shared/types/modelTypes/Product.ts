/**
 * Product types — maps to the `product_variants` table in PostgreSQL.
 *
 * In the new schema a "product" is a specific variant (model + storage + color + SIM type).
 * Physical units (each with their own IMEI) live in `inventory_items`.
 *
 * Hierarchy: brands → families → models → product_variants → inventory_items
 */

// ---------------------------------------------------------------------------
// Raw entity (what the repository returns after mapping snake_case → camelCase)
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  modelId: string;

  // Variant attributes
  storage?: string;        // e.g. "256GB"
  color?: string;          // e.g. "Verde Alpino"
  simType?: string;        // e.g. "eSIM", "Dual SIM"

  // Pricing
  salePriceUsd: number;    // product_variants.sale_price_usd
  wholesalePriceUsd?: number;

  // Warranty
  storeWarrantyMonths?: number;
  brandWarranty: boolean;
  brandWarrantyMonths?: number;

  qrCode?: string;

  // Auditing
  createdAt: string;       // ISO timestamp
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted: boolean;

  /**
   * Available stock — computed as:
   * COUNT(inventory_items WHERE variant_id = id AND status = 'available')
   */
  stock: number;

  // -------------------------------------------------------------------------
  // Resolved FK names — populated by the repository from PostgREST embedded
  // joins (?select=*,models(name,...)).  NOT stored in the DB.
  // -------------------------------------------------------------------------
  resolvedModelName?: string;
  resolvedBrandName?: string;
  resolvedFamilyName?: string;
  resolvedCategoryName?: string;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

/** Data required to create a new product variant */
export interface CreateProductData {
  modelId: string;
  storage?: string;
  color?: string;
  simType?: string;
  salePriceUsd: number;
  wholesalePriceUsd?: number;
  storeWarrantyMonths?: number;
  brandWarranty?: boolean;
  brandWarrantyMonths?: number;
  qrCode?: string;
  createdBy?: string;
}

/** Partial data allowed when updating a product variant */
export interface UpdateProductData {
  storage?: string;
  color?: string;
  simType?: string;
  salePriceUsd?: number;
  wholesalePriceUsd?: number;
  storeWarrantyMonths?: number;
  brandWarranty?: boolean;
  brandWarrantyMonths?: number;
  qrCode?: string;
  updatedBy?: string;
}

// ---------------------------------------------------------------------------
// View DTO (enriched for display in the UI)
// ---------------------------------------------------------------------------

export interface ProductView extends Product {
  /** Computed human-readable name: "Brand Model [storage] [color]" */
  name: string;
  /** Display price — alias for salePriceUsd */
  price: number;

  // Resolved FK names
  modelName: string;
  brandName?: string;
  familyName?: string;
  categoryName?: string;

  /**
   * Legacy optional fields kept for UI backward compatibility.
   * Will be removed once CreateProductModal is fully migrated.
   */
  code?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Filter DTO
// ---------------------------------------------------------------------------

export interface ProductFilter {
  /** Filter by model FK (maps to models.id) */
  modelId?: string;
  /** Filter by category FK (resolved via model → category) */
  categoryId?: string;
  /** Filter by brand FK (resolved via model → brand) */
  brandId?: string;
  /** Filter by family FK (resolved via model → family) */
  familyId?: string;
  storage?: string;
  color?: string;
  /**
   * Legacy aliases used by InventoryPage — repositories map these to the
   * canonical filter fields above.
   */
  model?: string;    // → modelId
  category?: string; // → categoryId
}
