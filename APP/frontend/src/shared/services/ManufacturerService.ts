import { BaseService } from './BaseService';
import { getManufacturerRepository } from '../db/repositories/manufacturer.repository';
import type { Manufacturer, ManufacturerFilter, ManufacturerView, CreateManufacturerData, UpdateManufacturerData } from '../types/modelTypes/Manufacturer';
import { createLazyService } from './lazyService';

class ManufacturerService extends BaseService<Manufacturer, ManufacturerView, CreateManufacturerData, UpdateManufacturerData, ManufacturerFilter> {
  constructor() {
    super(getManufacturerRepository());
  }

  protected async toView(entity: Manufacturer): Promise<ManufacturerView> {
    // No necesitamos transformación adicional para fabricantes/proveedores
    return entity;
  }
}

export const manufacturerService = createLazyService(() => new ManufacturerService());

