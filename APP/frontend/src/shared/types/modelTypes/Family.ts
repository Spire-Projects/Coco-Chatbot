/**
 * Family types — maps to the `families` table in PostgreSQL.
 *
 * A family groups models within a brand:
 *   brands → families → models → product_variants → inventory_items
 *
 * Example: Brand "Apple" → Family "iPhone 13" → Model "iPhone 13 Pro Max"
 */

// ---------------------------------------------------------------------------
// Raw entity
// ---------------------------------------------------------------------------

export interface Family {
  id: string;
  brandId: string; // FK → brands.id
  name: string;    // e.g. "iPhone 13", "Galaxy S"

  // Auditing
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted: boolean;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateFamilyData {
  brandId: string;
  name: string;
  createdBy?: string;
}

export interface UpdateFamilyData {
  name?: string;
  updatedBy?: string;
}

// ---------------------------------------------------------------------------
// View DTO
// ---------------------------------------------------------------------------

export interface FamilyView extends Family {
  brandName?: string; // Resolved from brands.name
}

// ---------------------------------------------------------------------------
// Filter DTO
// ---------------------------------------------------------------------------

export interface FamilyFilter {
  name?: string;
  brandId?: string;
}
