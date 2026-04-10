/**
 * Model types — maps to the `models` table in PostgreSQL.
 *
 * A model is a commercial product line entry:
 *   e.g. "iPhone 13 Pro Max" belongs to brand "Apple", family "iPhone 13",
 *   category "Smartphone".
 */

// ---------------------------------------------------------------------------
// Raw entity
// ---------------------------------------------------------------------------

export interface Model {
  id: string;
  categoryId: string;  // FK → categories.id
  brandId: string;     // FK → brands.id
  familyId?: string;   // FK → families.id (optional)

  name: string;        // e.g. "iPhone 13 Pro Max"
  modelNumber?: string; // e.g. "A2641"

  // Auditing
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted: boolean;

  // -------------------------------------------------------------------------
  // Resolved FK names — populated by the repository from PostgREST embedded
  // joins (?select=*,brands(name),families(name),categories(name)).
  // NOT stored in the DB.
  // -------------------------------------------------------------------------
  resolvedBrandName?: string;
  resolvedFamilyName?: string;
  resolvedCategoryName?: string;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateModelData {
  categoryId: string;
  brandId: string;
  familyId?: string;
  name: string;
  modelNumber?: string;
  createdBy?: string;
}

export interface UpdateModelData {
  name?: string;
  modelNumber?: string;
  categoryId?: string;
  brandId?: string;
  familyId?: string;
  updatedBy?: string;
}

// ---------------------------------------------------------------------------
// View DTO
// ---------------------------------------------------------------------------

export interface ModelView extends Model {
  brandName?: string;    // Resolved from brands.name
  familyName?: string;   // Resolved from families.name
  categoryName?: string; // Resolved from categories.name
}

// ---------------------------------------------------------------------------
// Filter DTO
// ---------------------------------------------------------------------------

export interface ModelFilter {
  name?: string;
  brandId?: string;
  familyId?: string;
  categoryId?: string;
}
