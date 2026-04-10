import type { ICrudBaseRepository } from './interfaces/IRepository';
import type { Manufacturer, CreateManufacturerData, UpdateManufacturerData, ManufacturerFilter } from '../../types/modelTypes/Manufacturer';

export interface IManufacturerRepository extends ICrudBaseRepository<Manufacturer, CreateManufacturerData, UpdateManufacturerData, ManufacturerFilter> {}

export const getManufacturerRepository = (): IManufacturerRepository => {
  throw new Error('PostgREST repository not yet implemented. Migration in progress.');
};


export interface IManufacturerRepository extends ICrudBaseRepository<Manufacturer, CreateManufacturerData, UpdateManufacturerData, ManufacturerFilter> {
  
}
