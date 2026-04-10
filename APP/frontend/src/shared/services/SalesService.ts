import { BaseService } from './BaseService';
import { pgFetch } from '../api/client';
import type {
  SaleView,
  CreateSaleData,
  UpdateSaleData,
  SaleFilter,
} from '../types/modelTypes/Sale';
import { getSalesRepository } from '../db/repositories/sales.repository';
import { createLazyService } from './lazyService';

class SalesService extends BaseService<
  SaleView,
  SaleView,
  CreateSaleData,
  UpdateSaleData,
  SaleFilter
> {
  constructor() {
    super(getSalesRepository());
  }

  // sales_view already resolves all joined fields — toView is a pass-through
  protected async toView(entity: SaleView): Promise<SaleView> {
    return entity;
  }

  // Override create to call the atomic create_sale_with_items RPC
  override async create(data: CreateSaleData): Promise<SaleView> {
    const rpcPayload = {
      p_branch_id:                  data.branchId,
      p_user_id:                    data.userId,
      p_created_by:                 data.createdBy,
      p_payment_method:             data.paymentMethod,
      p_payment_currency:           data.paymentCurrency,
      p_exchange_rate:              data.exchangeRate,
      p_total_without_discount_usd: data.totalWithoutDiscountUsd,
      p_total_discount_usd:         data.totalDiscountUsd,
      p_total_usd:                  data.totalUsd,
      p_total_bob:                  data.totalBob,
      p_nit_client:                 data.nitClient             ?? null,
      p_social_reason_client:       data.socialReasonClient    ?? null,
      p_sale_notes:                 data.saleNotes             ?? null,
      p_number_invoice:             data.numberInvoice         ?? null,
      p_notes:                      data.notes                 ?? null,
      p_client_id:                  data.clientId              ?? null,
      p_items: data.items.map((i) => ({
        item_id:       i.itemId      ?? null,
        accessory_id:  i.accessoryId ?? null,
        quantity:      i.quantity,
        unit_price_usd: i.unitPriceUsd,
        unit_price_bob: i.unitPriceBob,
        discount_pct:  i.discountPct,
        discount_usd:  i.discountUsd,
        total_usd:     i.totalUsd,
        is_device:     i.isDevice,
      })),
      p_trade_in: data.tradeIn
        ? {
            variant_id:         data.tradeIn.variantId,
            imei:               data.tradeIn.imei               ?? null,
            condition:          data.tradeIn.condition,
            battery_percentage: data.tradeIn.batteryPercentage  ?? null,
            os_version:         data.tradeIn.osVersion          ?? null,
            technical_notes:    data.tradeIn.technicalNotes     ?? null,
            agreed_value_usd:   data.tradeIn.agreedValueUsd,
            notes:              data.tradeIn.notes              ?? null,
          }
        : null,
    };

    const saleId = await pgFetch<string>('/rpc/create_sale_with_items', {
      method: 'POST',
      body: JSON.stringify(rpcPayload),
    });

    const created = await this.findById(saleId);
    if (!created) throw new Error('No se pudo recuperar la venta creada');
    return created;
  }
}

export const salesService = createLazyService(() => new SalesService());
