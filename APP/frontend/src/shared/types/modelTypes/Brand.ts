/**
 * Brand types — maps to the `brands` table in PostgreSQL.
 *
 * Brands are the top level of the product hierarchy:
 *   brands → families → models → product_variants → inventory_items
 */

// ---------------------------------------------------------------------------
// Raw entity
// ---------------------------------------------------------------------------

export interface Brand {
  id: string;
  name: string; // e.g. "Apple", "Samsung"

  /**
   * Synthetic base fields required by BaseService / ICrudBaseRepository.
   * The `brands` table has no timestamps or soft-delete, so the repository
   * always returns `isDeleted: false` and `createdAt: ''`.
   */
  isDeleted: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateBrandData {
  name: string;
}

export interface UpdateBrandData {
  name?: string;
}

// ---------------------------------------------------------------------------
// View DTO
// ---------------------------------------------------------------------------

/** BrandView is identical to Brand — no extra resolution needed */
export type BrandView = Brand;

// ---------------------------------------------------------------------------
// Filter DTO
// ---------------------------------------------------------------------------

export interface BrandFilter {
  name?: string;
}
