/**
 * FamilyService
 *
 * Handles business logic for families (`families` table).
 *
 * Families are scoped to a brand, so the key query method is `getByBrand()`.
 * The `search()` and `searchByBrand()` methods are compatible with the
 * `searchFunction` prop of CreatableSelect.
 *
 * Usage in the product creation flow:
 *  1. User selects / creates a Brand  → brandService
 *  2. User selects / creates a Family → familyService.getByBrand(brandId)
 *  3. User selects / creates a Model  → modelService.getByFamily(familyId)
 *  4. User fills variant details      → productService.create(...)
 */

import { BaseService } from './BaseService';
import { getFamilyRepository } from '../api/repositories/family.repository';
import { createLazyService } from './lazyService';
import type {
  Family,
  FamilyView,
  FamilyFilter,
  CreateFamilyData,
  UpdateFamilyData,
} from '../types/modelTypes/Family';

class FamilyService extends BaseService<
  Family,
  FamilyView,
  CreateFamilyData,
  UpdateFamilyData,
  FamilyFilter
> {
  constructor() {
    super(getFamilyRepository());
  }

  protected async toView(entity: Family): Promise<FamilyView> {
    return entity;
  }

  // ---------------------------------------------------------------------------
  // Cascading queries
  // ---------------------------------------------------------------------------

  /**
   * Load all families belonging to a specific brand.
   * Used to populate the brand → family cascading select.
   *
   * @param brandId  UUID of the selected brand
   */
  async getByBrand(brandId: string): Promise<FamilyView[]> {
    const result = await this.getAllView(1, 200, undefined, undefined, undefined, { brandId });
    return result.items;
  }

  // ---------------------------------------------------------------------------
  // CreatableSelect helpers
  // ---------------------------------------------------------------------------

  /**
   * Search families by name within a specific brand context.
   * Pass this as the `searchFunction` prop of CreatableSelect.
   *
   * @param query    Text to match against family names
   * @param brandId  Restrict results to this brand
   */
  async searchByBrand(query: string, brandId?: string): Promise<FamilyView[]> {
    const filter: FamilyFilter = brandId ? { brandId } : {};
    const result = await this.getAllView(1, 50, query, undefined, undefined, filter);
    return result.items;
  }

  /**
   * Global family search (all brands). Prefer `searchByBrand` when brand is known.
   */
  async search(query: string): Promise<FamilyView[]> {
    return this.searchByBrand(query);
  }

  /**
   * Quick-create a family under a brand.
   * Pass this as the `onAddValue` prop of CreatableSelect.
   *
   * @param name     Display name of the new family
   * @param brandId  Parent brand UUID — required
   * @param createdBy  User UUID performing the creation
   */
  async createFromName(name: string, brandId: string, createdBy?: string): Promise<FamilyView> {
    return this.create({ name: name.trim(), brandId, createdBy });
  }
}

export const familyService = createLazyService(() => new FamilyService());
