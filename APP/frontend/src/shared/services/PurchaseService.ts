/**
 * PurchaseService
 *
 * Orchestrates the full purchase registration flow:
 *   1. Create header record in `purchases`
 *   2. Call `register_items_batch` RPC for each variant line (inserts inventory_items)
 *
 * Reads use purchases_view (flat, with supplier_name, branch_name, item_count).
 * Writes go to the base table via the repository's writeTableName.
 */

import { BaseService } from './BaseService';
import type {
  Purchase,
  PurchaseView,
  CreatePurchaseData,
  UpdatePurchaseData,
  PurchaseFilter,
  DevicePurchaseLine,
  AccessoryPurchaseLine,
  PurchaseItem,
  PurchaseAccessoryItem,
} from '../types/modelTypes/PurchaseBox';
import { getPurchaseRepository } from '../db/repositories/purchase.repository';
import { pgFetch } from '../api/client';
import { createLazyService } from './lazyService';

// ---------------------------------------------------------------------------
// Raw inventory_items row (with embedded product_variants join)
// ---------------------------------------------------------------------------

interface RawInventoryItem {
  id: string;
  imei?: string | null;
  condition: string;
  purchase_price_usd?: number | null;
  sale_price_usd?: number | null;
  battery_percentage?: number | null;
  os_version?: string | null;
  battery_cycles?: number | null;
  technical_notes?: string | null;
  product_variants?: {
    storage?: string | null;
    color?: string | null;
    models?: { name?: string | null } | null;
  } | null;
}

interface RawPurchaseAccessoryLine {
  id: string;
  accessory_id: string;
  quantity: number | string;
  unit_price_usd: number | string;
  accessories?: {
    name?: string | null;
    variant_description?: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// RPC payload types
// ---------------------------------------------------------------------------

interface RegisterItemsBatchPayload {
  p_purchase_id: string;
  p_variant_id:  string;
  p_branch_id:   string;
  p_supplier_id: string;
  p_condition:   string;
  p_items: Array<{
    imei?: string;
    purchase_price_usd: number;
    sale_price_usd?: number | null;
    battery_percentage?: number | null;
    os_version?: string | null;
    battery_cycles?: number | null;
    technical_notes?: string | null;
  }>;
}

interface RegisterAccessoryBatchPayload {
  p_purchase_id: string;
  p_accessory_id: string;
  p_supplier_id: string;
  p_quantity: number;
  p_unit_price_usd: number;
}

interface CreatePurchaseWithLinesPayload {
  p_supplier_id: string;
  p_branch_id: string;
  p_total_usd: number | null;
  p_purchased_at: string;
  p_notes: string | null;
  p_created_by: string;
  p_lines: Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

class PurchaseService extends BaseService<
  Purchase,
  PurchaseView,
  CreatePurchaseData,
  UpdatePurchaseData,
  PurchaseFilter
> {
  constructor() {
    super(getPurchaseRepository());
  }

  // toView — resolved fields come from purchases_view via mapRow
  protected async toView(entity: Purchase): Promise<PurchaseView> {
    return {
      ...entity,
      supplierName: entity.resolvedSupplierName,
      branchName:   entity.resolvedBranchName,
      itemCount:    entity.resolvedItemCount ?? 0,
    };
  }

  // create — creates header then registers items via RPC
  override async create(data: CreatePurchaseData): Promise<PurchaseView> {
    const payload: CreatePurchaseWithLinesPayload = {
      p_supplier_id: data.supplierId,
      p_branch_id: data.branchId,
      p_total_usd: data.totalUsd ?? null,
      p_purchased_at: data.purchasedAt,
      p_notes: data.notes ?? null,
      p_created_by: data.createdBy,
      p_lines: data.lines.map((line) => {
        if (line.kind === 'accessory') {
          return {
            kind: 'accessory',
            accessory_id: line.accessoryId,
            quantity: line.quantity,
            unit_price_usd: line.unitPriceUsd,
          };
        }

        return {
          kind: 'device',
          variant_id: line.variantId,
          condition: line.condition,
          items: line.items.map((item) => ({
            imei: item.imei ?? null,
            purchase_price_usd: item.purchasePriceUsd,
            sale_price_usd: item.salePriceUsd ?? null,
            battery_percentage: item.batteryPercentage ?? null,
            os_version: item.osVersion ?? null,
            battery_cycles: item.batteryCycles ?? null,
            technical_notes: item.technicalNotes ?? null,
          })),
        };
      }),
    };

    const purchaseId = await pgFetch<string>('/rpc/create_purchase_with_lines', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const created = await this.findById(purchaseId);
    if (!created) {
      throw new Error('No se pudo recuperar la compra creada');
    }
    return created;
  }

  // registerLines — calls register_items_batch RPC per variant line
  async registerLines(
    purchaseId: string,
    supplierId: string,
    branchId: string,
    lines: DevicePurchaseLine[],
  ): Promise<void> {
    for (const line of lines) {
      const payload: RegisterItemsBatchPayload = {
        p_purchase_id: purchaseId,
        p_variant_id:  line.variantId,
        p_branch_id:   branchId,
        p_supplier_id: supplierId,
        p_condition:   line.condition,
        p_items: line.items.map((item) => ({
          imei:               item.imei || undefined,
          purchase_price_usd: item.purchasePriceUsd,
          sale_price_usd:     item.salePriceUsd ?? null,
          battery_percentage: item.batteryPercentage ?? null,
          os_version:         item.osVersion         ?? null,
          battery_cycles:     item.batteryCycles      ?? null,
          technical_notes:    item.technicalNotes     ?? null,
        })),
      };
      await pgFetch<number>('/rpc/register_items_batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  }

  async registerAccessoryLines(
    purchaseId: string,
    supplierId: string,
    lines: AccessoryPurchaseLine[],
  ): Promise<void> {
    for (const line of lines) {
      const payload: RegisterAccessoryBatchPayload = {
        p_purchase_id: purchaseId,
        p_accessory_id: line.accessoryId,
        p_supplier_id: supplierId,
        p_quantity: line.quantity,
        p_unit_price_usd: line.unitPriceUsd,
      };

      await pgFetch<number>('/rpc/register_accessory_batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  }

  // getItems — fetches inventory_items for a purchase with embedded variant info
  async getItems(purchaseId: string): Promise<PurchaseItem[]> {
    const select = 'id,imei,condition,purchase_price_usd,sale_price_usd,battery_percentage,os_version,battery_cycles,technical_notes,product_variants(storage,color,models(name))';
    const rows = await pgFetch<RawInventoryItem[]>(
      `/inventory_items?purchase_id=eq.${purchaseId}&select=${select}`,
    );
    return rows.map((r): PurchaseItem => ({
      id:               r.id,
      imei:             r.imei             ?? undefined,
      condition:        r.condition as PurchaseItem['condition'],
      purchasePriceUsd: r.purchase_price_usd != null ? Number(r.purchase_price_usd) : undefined,
      salePriceUsd:     r.sale_price_usd != null ? Number(r.sale_price_usd) : undefined,
      batteryPercentage:r.battery_percentage ?? undefined,
      osVersion:        r.os_version         ?? undefined,
      batteryCycles:    r.battery_cycles      ?? undefined,
      technicalNotes:   r.technical_notes     ?? undefined,
      variantStorage:   r.product_variants?.storage ?? undefined,
      variantColor:     r.product_variants?.color   ?? undefined,
      variantModelName: r.product_variants?.models?.name ?? undefined,
    }));
  }

  async getAccessoryItems(purchaseId: string): Promise<PurchaseAccessoryItem[]> {
    const select = 'id,accessory_id,quantity,unit_price_usd,accessories(name,variant_description)';
    const rows = await pgFetch<RawPurchaseAccessoryLine[]>(
      `/purchase_accessory_lines?purchase_id=eq.${purchaseId}&select=${select}`,
    );

    return rows.map((row): PurchaseAccessoryItem => {
      const quantity = Number(row.quantity ?? 0);
      const unitPriceUsd = Number(row.unit_price_usd ?? 0);
      return {
        id: row.id,
        accessoryId: row.accessory_id,
        accessoryName: row.accessories?.name ?? undefined,
        accessoryVariantDescription: row.accessories?.variant_description ?? undefined,
        quantity,
        unitPriceUsd,
        lineTotalUsd: quantity * unitPriceUsd,
      };
    });
  }
}

export const purchaseService = createLazyService(() => new PurchaseService());
