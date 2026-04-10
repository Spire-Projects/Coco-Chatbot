// DB: inventory_items.status values relevant to trade-in workflow
export type TradeInItemStatus = 'trade_in' | 'available' | 'sold';

// DB: inventory_items.condition
export type TradeInCondition = 'new' | 'pre_owned' | 'used';

// DB: inventory_items.verification_status
export type VerificationStatus = 'pending' | 'verified';

/**
 * Maps to trade_in_items_view — all columns the UI needs.
 */
export interface TradeInDevice {
  // inventory_items
  id: string;
  branchId: string;
  branchName: string;
  variantId: string;
  variantDisplay: string;
  brandName: string;
  modelName: string;
  storage?: string;
  color?: string;
  imei?: string;
  condition: TradeInCondition;
  status: TradeInItemStatus;
  verificationStatus: VerificationStatus;
  batteryPercentage?: number;
  batteryCycles?: number;
  osVersion?: string;
  technicalNotes?: string;
  adminNotes?: string;
  purchasePriceUsd?: number;
  extraCostUsd?: number;
  totalCostUsd: number;
  salePriceUsd?: number;
  verifiedBy?: string;
  verifiedByName?: string;
  createdAt: string;
  updatedAt?: string;

  // trade_in_devices record
  tradeInId: string;
  saleId: string;
  agreedValueUsd: number;
  tradeInNotes?: string;

  // originating sale
  saleNumber?: string;
  saleCreatedAt?: string;
  sellerName?: string;

  // client
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
}

/** Data for updating reconditioning fields (technician / admin — US-13, US-14) */
export interface UpdateTradeInDeviceData {
  batteryPercentage?: number;
  batteryCycles?: number;
  osVersion?: string;
  technicalNotes?: string;
  adminNotes?: string;
  extraCostUsd?: number;
  condition?: TradeInCondition;
}

/** Data for approving a trade-in for sale (superadmin — US-15) */
export interface ApproveTradeInDeviceData {
  salePriceUsd: number;
  adminNotes?: string;
}

export interface TradeInDeviceFilter {
  branchId?: string;
  status?: TradeInItemStatus | 'all';
  verificationStatus?: VerificationStatus;
}
