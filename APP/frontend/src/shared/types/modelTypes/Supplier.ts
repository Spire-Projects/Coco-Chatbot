/**
 * Supplier types — maps to the `suppliers` table in PostgreSQL.
 *
 * Suppliers are used when registering inventory items (physical units).
 * They are referenced by inventory_items.supplier_id.
 */

// ---------------------------------------------------------------------------
// Raw entity
// ---------------------------------------------------------------------------

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  // Synthetic fields required by ICrudBaseRepository (table has no these columns)
  isDeleted: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateSupplierData {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface UpdateSupplierData {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// View DTO
// ---------------------------------------------------------------------------

/** SupplierView is identical to Supplier — no extra resolution needed */
export type SupplierView = Supplier;

// ---------------------------------------------------------------------------
// Filter DTO
// ---------------------------------------------------------------------------

export interface SupplierFilter {
  name?: string;
  isActive?: boolean;
  [key: string]: unknown;
}
