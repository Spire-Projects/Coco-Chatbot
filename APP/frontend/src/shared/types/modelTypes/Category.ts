/**
 * Category types — maps to the `categories` table in PostgreSQL.
 *
 * Categories classify both devices (Smartphone, Tablet, etc.) and accessories.
 * The `isDevice` flag determines whether inventory items for this category
 * require an IMEI.
 */

// ---------------------------------------------------------------------------
// Raw entity
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  /** If true, products in this category require an IMEI per unit */
  isDevice: boolean;

  /**
   * Synthetic base fields required by BaseService / ICrudBaseRepository.
   * The `categories` table has no timestamps or soft-delete, so the repository
   * always returns `isDeleted: false` and `createdAt: ''`.
   */
  isDeleted: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateCategoryData {
  name: string;
  isDevice?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  isDevice?: boolean;
}

// ---------------------------------------------------------------------------
// View DTO
// ---------------------------------------------------------------------------

/** CategoryView is identical to Category — no extra resolution needed */
export type CategoryView = Category;

// ---------------------------------------------------------------------------
// Filter DTO
// ---------------------------------------------------------------------------

export interface CategoryFilter {
  name?: string;
  isDevice?: boolean;
}
