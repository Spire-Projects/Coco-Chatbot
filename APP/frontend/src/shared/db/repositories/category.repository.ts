/**
 * Category repository — PostgREST implementation backed by the `categories` table.
 *
 * Categories have no soft-delete or timestamps in the DB schema, so `is_deleted`
 * always returns false and `createdAt` is set to an empty string as a safe default.
 */

import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryFilter,
} from '../../types/modelTypes/Category';

// ---------------------------------------------------------------------------
// Re-export filter & interface for backward-compatible imports
// ---------------------------------------------------------------------------

export type { CategoryFilter };

export interface ICategoryRepository
  extends ICrudBaseRepository<Category, CreateCategoryData, UpdateCategoryData, CategoryFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row shape
// ---------------------------------------------------------------------------

interface RawCategoryRow extends RawRow {
  id: string;
  name: string;
  is_device: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTCategoryRepository
  extends BasePostgRESTRepository<Category, CreateCategoryData, UpdateCategoryData, CategoryFilter>
  implements ICategoryRepository
{
  constructor() {
    super('categories');
  }

  protected override readonly hasSoftDelete = false;
  protected override readonly defaultOrderColumn = 'name';

  /**
   * Categories table has no is_deleted column — override getAll to avoid
   * sending the is_deleted=eq.false filter.
   */
  protected override buildFilters(filter: CategoryFilter, params: URLSearchParams): void {
    if (filter.name)     params.set('name',      `ilike.*${filter.name}*`);
    if (filter.isDevice !== undefined)
      params.set('is_device', `eq.${filter.isDevice}`);
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    params.set('name', `ilike.*${query}*`);
  }

  protected mapRow(raw: RawRow): Category {
    const row = raw as RawCategoryRow;
    return {
      id: row.id,
      name: row.name,
      isDevice: Boolean(row.is_device),
      // BaseService requires these — categories table has no is_deleted / timestamps
      isDeleted: false,
      createdAt: '',
    };
  }

  protected mapCreateToBody(data: CreateCategoryData): RawRow {
    return {
      name: data.name,
      is_device: data.isDevice ?? false,
    };
  }

  protected mapUpdateToBody(data: UpdateCategoryData): RawRow {
    const body: RawRow = {};
    if (data.name !== undefined)     body.name = data.name;
    if (data.isDevice !== undefined) body.is_device = data.isDevice;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getCategoryRepository = (): ICategoryRepository =>
  new PostgRESTCategoryRepository();
