// DB: payment_method ENUM (matches PostgreSQL)
// 'cash_bob' / 'cash_usd' are legacy — 'cash' is the canonical value since migration 014
export type PaymentMethod = 'cash' | 'cash_bob' | 'cash_usd' | 'qr' | 'card' | 'device_trade_in' | 'crypto_usd';

// DB: payment_currency column (separate from payment_method since migration 014)
export type PaymentCurrency = 'bob' | 'usd';

// DB: product_condition ENUM
export type ProductCondition = 'new' | 'pre_owned' | 'used';

// DB: sale_items row
export interface SaleLineItem {
  id: string;
  saleId: string;
  itemId?: string;        // FK → inventory_items (device)
  accessoryId?: string;   // FK → accessories
  quantity: number;
  unitPriceUsd: number;
  unitPriceBob?: number;
  discountPct: number;
  discountUsd: number;
  totalUsd: number;
  isDevice: boolean;
  itemName?: string;      // resolved: “Brand Model storage color” or accessory name
  imei?: string;          // resolved from inventory_items (devices only)
}

// DB: trade_in_devices row (with resolved inventory_item data from sales_view)
export interface TradeInDeviceView {
  id: string;
  generatedItemId: string;
  agreedValueUsd: number;
  notes?: string;
  variantDisplay?: string;
  imei?: string;
  condition?: ProductCondition;
  batteryPercentage?: number;
  osVersion?: string;
  technicalNotes?: string;
}

// DB: sales row
export interface Sale {
  id: string;
  registerId?: string;
  branchId: string;
  userId: string;
  clientId?: string;
  numberInvoice?: string;
  isDraft: boolean;
  factured: boolean;
  nitClient?: string;
  socialReasonClient?: string;
  saleNotes?: string;
  paymentMethod: PaymentMethod;
  paymentCurrency: PaymentCurrency;
  bankAccountId?: string;
  paymentVerified: boolean;
  verifiedBy?: string;
  exchangeRateUsed: number;
  totalWithoutDiscountUsd: number;
  totalDiscountUsd: number;
  totalUsd: number;
  totalBob: number;
  notes?: string;
  isDeleted: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// DB: sales_view (resolved join fields + embedded items/trade_in)
export interface SaleView extends Sale {
  clientName?: string;
  clientPhone?: string;
  sellerName?: string;
  creatorName?: string;
  branchName?: string;
  items: SaleLineItem[];
  tradeIn?: TradeInDeviceView;
}

// ─── CRUD / RPC types ─────────────────────────────────────────────────────

// Per-item payload for create_sale_with_items RPC p_items array
export interface CreateSaleItemData {
  itemId?: string;
  accessoryId?: string;
  quantity: number;
  unitPriceUsd: number;
  unitPriceBob: number;
  discountPct: number;
  discountUsd: number;
  totalUsd: number;
  isDevice: boolean;
}

// Trade-in payload for create_sale_with_items RPC p_trade_in field
export interface CreateTradeInData {
  variantId: string;
  imei?: string;
  condition: ProductCondition;
  batteryPercentage?: number;
  osVersion?: string;
  technicalNotes?: string;
  agreedValueUsd: number;
  notes?: string;
}

// Full payload matching create_sale_with_items RPC
export interface CreateSaleData {
  branchId: string;
  userId: string;
  createdBy: string;
  paymentMethod: PaymentMethod;
  paymentCurrency: PaymentCurrency;
  exchangeRate: number;
  totalWithoutDiscountUsd: number;
  totalDiscountUsd: number;
  totalUsd: number;
  totalBob: number;
  nitClient?: string;
  socialReasonClient?: string;
  saleNotes?: string;
  numberInvoice?: string;
  notes?: string;
  clientId?: string;
  items: CreateSaleItemData[];
  tradeIn?: CreateTradeInData;
}

export interface UpdateSaleData {
  factured?: boolean;
  paymentVerified?: boolean;
  saleNotes?: string;
  notes?: string;
}

// Filter for sales list queries
export interface SaleFilter {
  branchId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  factured?: boolean;
  isDraft?: boolean;
  isDeleted?: boolean;
  paymentMethod?: PaymentMethod;
  orderBy?: 'createdAt' | 'numberInvoice';
  orderDirection?: 'asc' | 'desc';
}
