import type { PaymentMethod, PaymentCurrency, ProductCondition } from '@/shared/types/modelTypes/Sale';

// ─── Cart items (new architecture) ─────────────────────────────────────────

/** An inventory device item added to the cart */
export interface CartDeviceItem {
  type: 'device';
  cartItemId: string;           // ephemeral client-side ID
  inventoryItemId: string;      // inventory_items.id → sent as item_id in RPC
  variantDisplay: string;       // e.g. "Apple iPhone 15 128GB Black"
  variantId: string;
  imei?: string;
  condition: ProductCondition;
  unitPriceUsd: number;
  discountPct: number;          // 0-100
  discountUsd: number;          // computed: unitPriceUsd * discountPct / 100
  totalUsd: number;             // unitPriceUsd - discountUsd
}

/** An accessory item (stock-based) added to the cart */
export interface CartAccessoryItem {
  type: 'accessory';
  cartItemId: string;
  accessoryId: string;
  accessoryName: string;
  availableStock: number;
  quantity: number;
  unitPriceUsd: number;
  discountPct: number;
  discountUsd: number;
  totalUsd: number;             // (unitPriceUsd - discountUsd) * quantity
}

export type CartItem = CartDeviceItem | CartAccessoryItem;

/** Trade-in device information collected in the modal */
export interface TradeInState {
  variantId: string;
  variantDisplay: string;
  imei: string;
  condition: ProductCondition;
  batteryPercentage?: number;
  osVersion?: string;
  technicalNotes?: string;
  agreedValueUsd: number;
  notes?: string;
}

/** Full state of the sale form in CreateSaleModal */
export interface SaleFormState {
  cartItems: CartItem[];
  clientId?: string;
  clientName?: string;
  nitClient?: string;
  socialReasonClient?: string;
  paymentMethod: PaymentMethod;
  paymentCurrency: PaymentCurrency;
  tradeIn?: TradeInState;
  saleNotes?: string;
}

// ─── Raw API shapes for inventory search ───────────────────────────────────

export interface RawInventoryItemForSale {
  id: string;
  imei?: string | null;
  sale_price_usd: number | null; // nullable in DB when price not yet set
  condition: ProductCondition;
  variant_id: string;
  product_variants?: {
    storage?: string | null;
    color?: string | null;
    sale_price_usd?: number | null; // fallback price when inventory_items.sale_price_usd is null
    models?: {
      name?: string | null;
      brands?: { name?: string | null } | null;
    } | null;
  } | null;
}

export interface RawAccessoryForSale {
  id: string;
  name: string;
  sale_price_usd: number | null; // nullable in DB when price not yet set
  // Per-branch stock via PostgREST embedded join (accessory_stock!inner)
  accessory_stock: Array<{ stock: number }>;
}
