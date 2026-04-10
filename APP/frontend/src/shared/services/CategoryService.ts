/**
 * CategoryService
 *
 * Handles business logic for categories (`categories` table).
 *
 * Exposes `search()`, `getInitialList()`, and `createFromName()` helpers
 * that are compatible with the `searchFunction` and `onAddValue` props of
 * CreatableSelect.
 */

import { BaseService } from './BaseService';
import type {
  Category,
  CategoryView,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryFilter,
} from '../types/modelTypes/Category';
import { getCategoryRepository } from '../db/repositories/category.repository';
import { createLazyService } from './lazyService';

class CategoryService extends BaseService<
  Category,
  CategoryView,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryFilter
> {
  constructor() {
    super(getCategoryRepository());
  }

  protected async toView(entity: Category): Promise<CategoryView> {
    return entity;
  }

  // ---------------------------------------------------------------------------
  // CreatableSelect helpers
  // ---------------------------------------------------------------------------

  /**
   * Search categories by name.
   * Pass this as the `searchFunction` prop of CreatableSelect.
   *
   * @example
   * <CreatableSelect
   *   searchFunction={categoryService.search.bind(categoryService)}
   *   onAddValue={(name) => categoryService.createFromName(name)}
   *   displayField="name"
   *   valueField="id"
   *   ...
   * />
   */
  async search(query: string): Promise<CategoryView[]> {
    const result = await this.getAllView(1, 50, query);
    return result.items;
  }

  /**
   * Load the initial category list (used to pre-populate CreatableSelect).
   *
   * @param onlyDevices  If true, returns only categories where isDevice = true
   */
  async getInitialList(onlyDevices?: boolean): Promise<CategoryView[]> {
    const filter: CategoryFilter = onlyDevices ? { isDevice: true } : {};
    const result = await this.getAllView(1, 100, undefined, undefined, undefined, filter);
    return result.items;
  }

  /**
   * Quick-create a category from just its name.
   * Pass this as the `onAddValue` prop of CreatableSelect.
   */
  async createFromName(name: string): Promise<CategoryView> {
    return this.create({ name: name.trim() });
  }
}

export const categoryService = createLazyService(() => new CategoryService());

// Re-export CategoryView for backward-compatible imports
export type { CategoryView };

