/**
 * Accessory types — maps to the `accessories` table in PostgreSQL.
 *
 * As of migration 012, accessories are a GLOBAL catalog (no branch_id).
 * Per-branch stock is tracked in the `accessory_stock` table and resolved
 * via an embedded PostgREST join when a branchId filter is provided.
 *
 * References: categories, brands (optional), suppliers (optional)
 */

// ---------------------------------------------------------------------------
// Raw entity (what the repository returns after mapping snake_case → camelCase)
// ---------------------------------------------------------------------------

export interface Accessory {
  id: string;
  categoryId: string;
  brandId?: string;
  supplierId?: string;

  name: string;
  variantDescription?: string;
  stockMinAlert: number;

  purchasePriceUsd: number;
  salePriceUsd: number;
  wholesalePriceUsd?: number;

  verificationStatus: 'pending' | 'verified';
  verifiedBy?: string;
  verifiedAt?: string;

  qrCode?: string;

  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted: boolean;

  // Resolved FK names — populated by repository from PostgREST embedded joins
  resolvedCategoryName?: string;
  resolvedBrandName?: string;
  resolvedSupplierName?: string;
  // Stock for the requested branch (from accessory_stock embedded join)
  resolvedBranchStock?: number;
}

// ---------------------------------------------------------------------------
// View DTO (enriched for display in the UI)
// ---------------------------------------------------------------------------

export interface AccessoryView extends Accessory {
  categoryName?: string;
  brandName?: string;
  supplierName?: string;
  /** Stock for the currently selected branch (0 if none or branch not passed as filter) */
  stock: number;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateAccessoryData {
  categoryId: string;
  brandId?: string;
  supplierId?: string;
  name: string;
  variantDescription?: string;
  stockMinAlert?: number;
  purchasePriceUsd?: number;
  salePriceUsd: number;
  wholesalePriceUsd?: number;
  qrCode?: string;
  createdBy?: string;
}

export interface UpdateAccessoryData {
  categoryId?: string;
  brandId?: string;
  supplierId?: string;
  name?: string;
  variantDescription?: string;
  stockMinAlert?: number;
  purchasePriceUsd?: number;
  salePriceUsd?: number;
  wholesalePriceUsd?: number;
  qrCode?: string;
  updatedBy?: string;
}

export interface AccessoryFilter {
  categoryId?: string;
  brandId?: string;
  /** When set, resolves stock from accessory_stock for this branch via embedded join */
  branchId?: string;
}
