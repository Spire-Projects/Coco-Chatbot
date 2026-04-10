/**
 * AccessoryService
 *
 * Handles business logic for accessories (`accessories` table).
 * Resolves FK names from embedded join fields populated by the repository.
 * Auto-generates a short QR code on creation if none is provided.
 */

import { BaseService } from './BaseService';
import {
  getAccessoryRepository,
  type IAccessoryRepository,
} from '../db/repositories/accessory.repository';
import { createLazyService } from './lazyService';
import type {
  Accessory,
  AccessoryView,
  CreateAccessoryData,
  UpdateAccessoryData,
  AccessoryFilter,
} from '../types/modelTypes/Accessory';
import { generateShortCode } from '../utils/generateShortCode';

class AccessoryService extends BaseService<
  Accessory,
  AccessoryView,
  CreateAccessoryData,
  UpdateAccessoryData,
  AccessoryFilter
> {
  constructor(repository: IAccessoryRepository) {
    super(repository);
  }

  protected async toView(entity: Accessory): Promise<AccessoryView> {
    return {
      ...entity,
      categoryName: entity.resolvedCategoryName,
      brandName:    entity.resolvedBrandName,
      supplierName: entity.resolvedSupplierName,
      stock:        entity.resolvedBranchStock ?? 0,
    };
  }

  /** Override create to auto-generate a QR code if none provided */
  override async create(data: CreateAccessoryData): Promise<AccessoryView> {
    const payload: CreateAccessoryData = {
      ...data,
      purchasePriceUsd: data.purchasePriceUsd ?? 0,
      qrCode: data.qrCode ?? generateShortCode('ACC'),
    };
    return super.create(payload);
  }

  async search(query: string): Promise<AccessoryView[]> {
    const result = await this.getAllView(1, 50, query);
    return result.items;
  }

  async getInitialList(): Promise<AccessoryView[]> {
    const result = await this.getAllView(1, 200);
    return result.items;
  }
}

export const accessoryService = createLazyService(
  () => new AccessoryService(getAccessoryRepository()),
);
