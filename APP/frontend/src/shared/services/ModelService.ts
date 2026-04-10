/**
 * ModelService
 *
 * Handles business logic for models (`models` table).
 * Exposes a `search()` helper compatible with CreatableSelect.
 */

import { BaseService } from './BaseService';
import { getModelRepository } from '../db/repositories/model.repository';
import { createLazyService } from './lazyService';
import type {
  CreateModelData,
  Model,
  ModelFilter,
  ModelView,
  UpdateModelData,
} from '../types/modelTypes/Model';

class ModelService extends BaseService<
  Model,
  ModelView,
  CreateModelData,
  UpdateModelData,
  ModelFilter
> {
  constructor() {
    super(getModelRepository());
  }

  protected async toView(entity: Model): Promise<ModelView> {
    // Resolved names are populated by the repository from embedded joins
    return {
      ...entity,
      brandName:    entity.resolvedBrandName,
      familyName:   entity.resolvedFamilyName,
      categoryName: entity.resolvedCategoryName,
    };
  }

  /**
   * Search models by name.
   * Compatible with the `searchFunction` prop of CreatableSelect.
   *
   * @param query   Text to match against model names
   * @param filter  Optional additional filter (e.g. brandId, familyId)
   */
  async search(query: string, filter?: ModelFilter): Promise<ModelView[]> {
    const result = await this.getAllView(1, 30, query, undefined, undefined, filter);
    return result.items;
  }

  /**
   * Load all models belonging to a specific brand.
   * Used to populate the family → model cascading select in CreateProductModal.
   */
  async getByBrand(brandId: string): Promise<ModelView[]> {
    const result = await this.getAllView(1, 200, undefined, undefined, undefined, { brandId });
    return result.items;
  }

  /**
   * Load all models belonging to a specific family.
   */
  async getByFamily(familyId: string): Promise<ModelView[]> {
    const result = await this.getAllView(1, 200, undefined, undefined, undefined, { familyId });
    return result.items;
  }
}

export const modelService = createLazyService(() => new ModelService());
