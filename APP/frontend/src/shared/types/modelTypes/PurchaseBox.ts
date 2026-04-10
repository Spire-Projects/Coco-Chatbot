/**
 * Purchase types — maps to the `purchases` table (migration 004).
 *
 * A purchase is the header record for a batch of inventory items that arrived
 * together (e.g. "30 iPhones from Supplier X on 2024-12-30 for $40,000").
 * Each physical unit is an inventory_item linked via purchase_id.
 *
 * Flow:
 *   1. POST /purchases            → creates the header
 *   2. POST /rpc/register_items_batch  → inserts inventory_items rows per variant
 */

// ---------------------------------------------------------------------------
// Core entity → purchases table
// ---------------------------------------------------------------------------

export interface Purchase {
  id: string;
  supplierId: string;
  branchId: string;
  totalUsd?: number;
  purchasedAt: string;   // DATE stored as ISO string
  notes?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted: boolean;
  // Resolved from purchases_view joins (set by repository)
  resolvedSupplierName?: string;
  resolvedBranchName?: string;
  resolvedItemCount?: number;
}

// ---------------------------------------------------------------------------
// One physical device to register inside a purchase line
// ---------------------------------------------------------------------------

export interface PurchaseItemInput {
  imei?: string;
  purchasePriceUsd: number;
  salePriceUsd?: number;
  batteryPercentage?: number;
  osVersion?: string;
  batteryCycles?: number;
  technicalNotes?: string;
}

// ---------------------------------------------------------------------------
// One line in the purchase modal: either device units or accessory stock
// ---------------------------------------------------------------------------

export interface DevicePurchaseLine {
  kind: 'device';
  variantId: string;
  condition: 'new' | 'pre_owned' | 'used';
  items: PurchaseItemInput[];
}

export interface AccessoryPurchaseLine {
  kind: 'accessory';
  accessoryId: string;
  quantity: number;
  unitPriceUsd: number;
}

export type PurchaseLine = DevicePurchaseLine | AccessoryPurchaseLine;

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreatePurchaseData {
  supplierId: string;
  branchId: string;
  totalUsd?: number;
  purchasedAt: string;
  notes?: string;
  createdBy: string;
  /** Lines are processed after the header is created (via register_items_batch RPC) */
  lines: PurchaseLine[];
}

export interface UpdatePurchaseData {
  supplierId?: string;
  totalUsd?: number;
  purchasedAt?: string;
  notes?: string;
  updatedBy?: string;
}

export interface PurchaseFilter {
  supplierId?: string;
  branchId?: string;
}

// ---------------------------------------------------------------------------
// View DTO (from purchases_view)
// ---------------------------------------------------------------------------

export interface PurchaseView extends Purchase {
  supplierName?: string;
  branchName?: string;
  itemCount: number;
}

// ---------------------------------------------------------------------------
// Inventory item belonging to a purchase (fetched from inventory_items)
// ---------------------------------------------------------------------------

export interface PurchaseItem {
  id: string;
  imei?: string;
  condition: 'new' | 'pre_owned' | 'used';
  purchasePriceUsd?: number;
  salePriceUsd?: number;
  batteryPercentage?: number;
  osVersion?: string;
  batteryCycles?: number;
  technicalNotes?: string;
  // Resolved from embedded product_variants join
  variantStorage?: string;
  variantColor?: string;
  variantModelName?: string;
}

export interface PurchaseAccessoryItem {
  id: string;
  accessoryId: string;
  accessoryName?: string;
  accessoryVariantDescription?: string;
  quantity: number;
  unitPriceUsd: number;
  lineTotalUsd: number;
}
