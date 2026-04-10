import { pgFetch, fetchWithAuthRetry } from '../api/client';
import { createLazyService } from './lazyService';
import type {
  TradeInDevice,
  TradeInDeviceFilter,
  UpdateTradeInDeviceData,
  ApproveTradeInDeviceData,
} from '../types/modelTypes/TradeInDevice';

// ─── Raw shape from trade_in_items_view ──────────────────────────────────────
interface RawTradeInRow {
  id: string;
  branch_id: string;
  branch_name: string;
  variant_id: string;
  variant_display: string;
  brand_name: string;
  model_name: string;
  storage?: string | null;
  color?: string | null;
  imei?: string | null;
  condition: string;
  status: string;
  verification_status: string;
  battery_percentage?: number | null;
  battery_cycles?: number | null;
  os_version?: string | null;
  technical_notes?: string | null;
  admin_notes?: string | null;
  purchase_price_usd?: number | null;
  extra_cost_usd?: number | null;
  total_cost_usd: number;
  sale_price_usd?: number | null;
  verified_by?: string | null;
  verified_by_name?: string | null;
  created_at: string;
  updated_at?: string | null;
  trade_in_id: string;
  sale_id: string;
  agreed_value_usd: number;
  trade_in_notes?: string | null;
  sale_number?: string | null;
  sale_created_at?: string | null;
  seller_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
}

function mapRow(raw: RawTradeInRow): TradeInDevice {
  return {
    id:                  raw.id,
    branchId:            raw.branch_id,
    branchName:          raw.branch_name,
    variantId:           raw.variant_id,
    variantDisplay:      raw.variant_display,
    brandName:           raw.brand_name,
    modelName:           raw.model_name,
    storage:             raw.storage            ?? undefined,
    color:               raw.color              ?? undefined,
    imei:                raw.imei               ?? undefined,
    condition:           raw.condition          as TradeInDevice['condition'],
    status:              raw.status             as TradeInDevice['status'],
    verificationStatus:  raw.verification_status as TradeInDevice['verificationStatus'],
    batteryPercentage:   raw.battery_percentage  ?? undefined,
    batteryCycles:       raw.battery_cycles      ?? undefined,
    osVersion:           raw.os_version          ?? undefined,
    technicalNotes:      raw.technical_notes      ?? undefined,
    adminNotes:          raw.admin_notes          ?? undefined,
    purchasePriceUsd:    raw.purchase_price_usd   != null ? Number(raw.purchase_price_usd)  : undefined,
    extraCostUsd:        raw.extra_cost_usd       != null ? Number(raw.extra_cost_usd)       : undefined,
    totalCostUsd:        Number(raw.total_cost_usd),
    salePriceUsd:        raw.sale_price_usd       != null ? Number(raw.sale_price_usd)       : undefined,
    verifiedBy:          raw.verified_by          ?? undefined,
    verifiedByName:      raw.verified_by_name     ?? undefined,
    createdAt:           raw.created_at,
    updatedAt:           raw.updated_at           ?? undefined,
    tradeInId:           raw.trade_in_id,
    saleId:              raw.sale_id,
    agreedValueUsd:      Number(raw.agreed_value_usd),
    tradeInNotes:        raw.trade_in_notes       ?? undefined,
    saleNumber:          raw.sale_number          ?? undefined,
    saleCreatedAt:       raw.sale_created_at      ?? undefined,
    sellerName:          raw.seller_name          ?? undefined,
    clientId:            raw.client_id            ?? undefined,
    clientName:          raw.client_name          ?? undefined,
    clientPhone:         raw.client_phone         ?? undefined,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────
class TradeInServiceClass {
  /**
   * Fetch paginated trade-in devices from trade_in_items_view.
   * Returns { items, total }.
   */
  async list(
    page: number,
    pageSize: number,
    search: string,
    filter: TradeInDeviceFilter,
  ): Promise<{ items: TradeInDevice[]; total: number }> {
    const params = new URLSearchParams();
    params.set('order', 'created_at.desc');

    // Status filter
    const status = filter.status ?? 'trade_in';
    if (status !== 'all') {
      params.set('status', `eq.${status}`);
    }

    if (filter.branchId) {
      params.set('branch_id', `eq.${filter.branchId}`);
    }
    if (filter.verificationStatus) {
      params.set('verification_status', `eq.${filter.verificationStatus}`);
    }

    // Text search: by IMEI, variant display, client name, sale number
    if (search.trim().length >= 2) {
      const q = `*${search.trim()}*`;
      params.set(
        'or',
        `(imei.ilike.${q},variant_display.ilike.${q},client_name.ilike.${q},sale_number.ilike.${q})`,
      );
    }

    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    const path = `/trade_in_items_view?${params.toString()}`;
    const res = await fetchWithAuthRetry(path, {
      headers: {
        Range:       `${from}-${to}`,
        'Range-Unit': 'items',
        Prefer:       'count=exact',
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw body;
    }

    const contentRange = res.headers.get('Content-Range') ?? '';
    const totalMatch   = contentRange.match(/\/(\d+)$/);
    const total        = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    const rows: RawTradeInRow[] = await res.json();
    return { items: rows.map(mapRow), total };
  }

  /**
   * Update reconditioning data (US-13, US-14).
   * Calls RPC update_trade_in_device.
   */
  async updateDevice(
    itemId: string,
    modifiedBy: string,
    data: UpdateTradeInDeviceData,
  ): Promise<void> {
    await pgFetch('/rpc/update_trade_in_device', {
      method: 'POST',
      body: JSON.stringify({
        p_item_id:            itemId,
        p_modified_by:        modifiedBy,
        p_battery_percentage: data.batteryPercentage ?? null,
        p_battery_cycles:     data.batteryCycles     ?? null,
        p_os_version:         data.osVersion         ?? null,
        p_technical_notes:    data.technicalNotes    ?? null,
        p_admin_notes:        data.adminNotes        ?? null,
        p_extra_cost_usd:     data.extraCostUsd      ?? null,
        p_condition:          data.condition         ?? null,
      }),
    });
  }

  /**
   * Approve a trade-in device for sale (US-15 / superadmin).
   * Calls RPC approve_trade_in_device.
   */
  async approveDevice(
    itemId: string,
    verifiedBy: string,
    data: ApproveTradeInDeviceData,
  ): Promise<void> {
    await pgFetch('/rpc/approve_trade_in_device', {
      method: 'POST',
      body: JSON.stringify({
        p_item_id:        itemId,
        p_verified_by:    verifiedBy,
        p_sale_price_usd: data.salePriceUsd,
        p_admin_notes:    data.adminNotes ?? null,
      }),
    });
  }
}

export const tradeInService = createLazyService(() => new TradeInServiceClass());
