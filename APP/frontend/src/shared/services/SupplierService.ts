import { BaseService } from './BaseService';
import type {
  Supplier,
  SupplierView,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierFilter,
} from '../types/modelTypes/Supplier';
import { getSupplierRepository } from '../api/repositories/supplier.repository';
import { createLazyService } from './lazyService';

class SupplierService extends BaseService<
  Supplier,
  SupplierView,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierFilter
> {
  constructor() {
    super(getSupplierRepository());
  }

  protected async toView(entity: Supplier): Promise<SupplierView> {
    return entity;
  }

  async search(query: string): Promise<SupplierView[]> {
    const result = await this.getAllView(1, 50, query);
    return result.items;
  }
}

export const supplierService = createLazyService(() => new SupplierService());
