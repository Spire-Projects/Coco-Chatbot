import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type {
  SaleView,
  CreateSaleData,
  UpdateSaleData,
  SaleFilter,
  SaleLineItem,
  TradeInDeviceView,
} from '../../types/modelTypes/Sale';

export interface ISalesRepository
  extends ICrudBaseRepository<SaleView, CreateSaleData, UpdateSaleData, SaleFilter> {}

// ---------------------------------------------------------------------------
// Raw JSON shapes returned inside sales_view columns
// ---------------------------------------------------------------------------

interface RawSaleItemJson {
  id: string;
  item_id?: string | null;
  accessory_id?: string | null;
  quantity: number;
  unit_price_usd: number;
  unit_price_bob?: number | null;
  discount_pct: number;
  discount_usd: number;
  total_usd: number;
  is_device: boolean;
  item_name?: string | null; // resolved from product_variants+models+brands or accessories
  imei?: string | null;      // from inventory_items (devices only)
}

interface RawTradeInJson {
  id: string;
  generated_item_id: string;
  agreed_value_usd: number;
  notes?: string | null;
  variant_display?: string | null;
  imei?: string | null;
  condition?: string | null;
  battery_percentage?: number | null;
  os_version?: string | null;
  technical_notes?: string | null;
}

interface RawSaleRow extends RawRow {
  id: string;
  register_id?: string | null;
  branch_id: string;
  user_id: string;
  client_id?: string | null;
  number_invoice?: string | null;
  is_draft: boolean;
  factured: boolean;
  nit_client?: string | null;
  social_reason_client?: string | null;
  sale_notes?: string | null;
  payment_method: string;
  payment_currency: string;
  bank_account_id?: string | null;
  payment_verified: boolean;
  verified_by?: string | null;
  exchange_rate_used: number;
  total_without_discount_usd: number;
  total_discount_usd: number;
  total_usd: number;
  total_bob: number;
  notes?: string | null;
  is_deleted: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
  // Resolved join columns
  client_name?: string | null;
  client_phone?: string | null;
  seller_name?: string | null;
  branch_name?: string | null;
  creator_name?: string | null;
  // JSON aggregates from sales_view
  items?: RawSaleItemJson[] | null;
  trade_in?: RawTradeInJson | null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTSalesRepository
  extends BasePostgRESTRepository<SaleView, CreateSaleData, UpdateSaleData, SaleFilter>
  implements ISalesRepository
{
  // reads from the view, writes to the base table
  protected override readonly writeTableName: string | null = 'sales';

  constructor() {
    super('sales_view');
  }

  protected override buildSelectParams(): string {
    return '*';
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    const q = `*${query}*`;
    params.set('or', `(nit_client.ilike.${q},social_reason_client.ilike.${q},number_invoice.ilike.${q})`);
  }

  protected override buildFilters(filter: SaleFilter, params: URLSearchParams): void {
    if (filter.branchId)               params.set('branch_id',      `eq.${filter.branchId}`);
    if (filter.clientId)               params.set('client_id',      `eq.${filter.clientId}`);
    if (filter.factured !== undefined)  params.set('factured',       `eq.${filter.factured}`);
    if (filter.isDraft  !== undefined)  params.set('is_draft',       `eq.${filter.isDraft}`);
    if (filter.paymentMethod)          params.set('payment_method', `eq.${filter.paymentMethod}`);
    if (filter.dateFrom)               params.set('created_at',     `gte.${filter.dateFrom}`);
    if (filter.dateTo)                 params.set('created_at',     `lte.${filter.dateTo}`);
  }

  protected mapRow(raw: RawRow): SaleView {
    const row = raw as RawSaleRow;

    const items: SaleLineItem[] = (row.items ?? []).map((si) => ({
      id:           si.id,
      saleId:       row.id,
      itemId:       si.item_id      ?? undefined,
      accessoryId:  si.accessory_id ?? undefined,
      quantity:     Number(si.quantity),
      unitPriceUsd: Number(si.unit_price_usd),
      unitPriceBob: si.unit_price_bob != null ? Number(si.unit_price_bob) : undefined,
      discountPct:  Number(si.discount_pct  ?? 0),
      discountUsd:  Number(si.discount_usd  ?? 0),
      totalUsd:     Number(si.total_usd),
      isDevice:     Boolean(si.is_device),
      itemName:     si.item_name ?? undefined,
      imei:         si.imei      ?? undefined,
    }));

    const tradeIn: TradeInDeviceView | undefined = row.trade_in ? {
      id:                row.trade_in.id,
      generatedItemId:   row.trade_in.generated_item_id,
      agreedValueUsd:    Number(row.trade_in.agreed_value_usd),
      notes:             row.trade_in.notes            ?? undefined,
      variantDisplay:    row.trade_in.variant_display  ?? undefined,
      imei:              row.trade_in.imei             ?? undefined,
      condition:         (row.trade_in.condition as SaleView['tradeIn'] extends { condition?: infer C } ? C : never) ?? undefined,
      batteryPercentage: row.trade_in.battery_percentage != null ? Number(row.trade_in.battery_percentage) : undefined,
      osVersion:         row.trade_in.os_version       ?? undefined,
      technicalNotes:    row.trade_in.technical_notes  ?? undefined,
    } : undefined;

    return {
      id:                      row.id,
      registerId:              row.register_id            ?? undefined,
      branchId:                row.branch_id,
      userId:                  row.user_id,
      clientId:                row.client_id              ?? undefined,
      numberInvoice:           row.number_invoice         ?? undefined,
      isDraft:                 Boolean(row.is_draft),
      factured:                Boolean(row.factured),
      nitClient:               row.nit_client             ?? undefined,
      socialReasonClient:      row.social_reason_client   ?? undefined,
      saleNotes:               row.sale_notes             ?? undefined,
      paymentMethod:           row.payment_method as SaleView['paymentMethod'],
      paymentCurrency:         (row.payment_currency ?? 'bob') as SaleView['paymentCurrency'],
      bankAccountId:           row.bank_account_id        ?? undefined,
      paymentVerified:         Boolean(row.payment_verified),
      verifiedBy:              row.verified_by            ?? undefined,
      exchangeRateUsed:        Number(row.exchange_rate_used        ?? 0),
      totalWithoutDiscountUsd: Number(row.total_without_discount_usd ?? 0),
      totalDiscountUsd:        Number(row.total_discount_usd        ?? 0),
      totalUsd:                Number(row.total_usd  ?? 0),
      totalBob:                Number(row.total_bob  ?? 0),
      notes:                   row.notes                  ?? undefined,
      isDeleted:               Boolean(row.is_deleted),
      createdBy:               row.created_by             ?? undefined,
      createdAt:               row.created_at,
      updatedAt:               row.updated_at             ?? undefined,
      // Resolved from view joins
      clientName:              row.client_name            ?? undefined,
      clientPhone:             row.client_phone           ?? undefined,
      sellerName:              row.seller_name            ?? undefined,
      creatorName:             row.creator_name           ?? undefined,
      branchName:              row.branch_name            ?? undefined,
      items,
      tradeIn,
    };
  }

  // Sales are created via create_sale_with_items RPC in SalesService — this is never called directly
  protected mapCreateToBody(_data: CreateSaleData): RawRow {
    throw new Error('Use SalesService.create() which routes through the create_sale_with_items RPC');
  }

  protected mapUpdateToBody(data: UpdateSaleData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.factured        !== undefined) body.factured         = data.factured;
    if (data.paymentVerified !== undefined) body.payment_verified = data.paymentVerified;
    if (data.saleNotes       !== undefined) body.sale_notes       = data.saleNotes;
    if (data.notes           !== undefined) body.notes            = data.notes;
    return body;
  }
}

let _instance: PostgRESTSalesRepository | null = null;

export const getSalesRepository = (): ISalesRepository => {
  if (!_instance) _instance = new PostgRESTSalesRepository();
  return _instance;
};
