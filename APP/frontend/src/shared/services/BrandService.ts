/**
 * BrandService
 *
 * Handles business logic for brands (`brands` table).
 *
 * Exposes a `search()` helper and `getAll()` list, both compatible with the
 * `searchFunction` / `onAddValue` props of CreatableSelect.
 */

import { BaseService } from './BaseService';
import { getBrandRepository } from '../api/repositories/brand.repository';
import { createLazyService } from './lazyService';
import type {
  Brand,
  BrandView,
  BrandFilter,
  CreateBrandData,
  UpdateBrandData,
} from '../types/modelTypes/Brand';

class BrandService extends BaseService<
  Brand,
  BrandView,
  CreateBrandData,
  UpdateBrandData,
  BrandFilter
> {
  constructor() {
    super(getBrandRepository());
  }

  protected async toView(entity: Brand): Promise<BrandView> {
    return entity;
  }

  // ---------------------------------------------------------------------------
  // CreatableSelect helpers
  // ---------------------------------------------------------------------------

  /**
   * Search brands by name.
   * Pass this as the `searchFunction` prop of CreatableSelect.
   *
   * @example
   * <CreatableSelect
   *   searchFunction={brandService.search.bind(brandService)}
   *   onAddValue={(name) => brandService.createFromName(name)}
   *   ...
   * />
   */
  async search(query: string): Promise<BrandView[]> {
    const result = await this.getAllView(1, 50, query);
    return result.items;
  }

  /**
   * Load the initial brand list (used to pre-populate CreatableSelect).
   */
  async getInitialList(): Promise<BrandView[]> {
    const result = await this.getAllView(1, 100);
    return result.items;
  }

  /**
   * Quick-create a brand from just its name.
   * Pass this as the `onAddValue` prop of CreatableSelect.
   */
  async createFromName(name: string): Promise<BrandView> {
    return this.create({ name: name.trim() });
  }
}

export const brandService = createLazyService(() => new BrandService());
