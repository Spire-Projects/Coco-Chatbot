/**
 * Model repository — PostgREST implementation backed by the `models` table.
 *
 * Embedded select:
 *   models
 *     ↳ brands(name)
 *     ↳ families(name)
 *     ↳ categories(name)
 */

import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type {
  Model,
  CreateModelData,
  UpdateModelData,
  ModelFilter,
} from '../../types/modelTypes/Model';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface IModelRepository
  extends ICrudBaseRepository<Model, CreateModelData, UpdateModelData, ModelFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row shapes
// ---------------------------------------------------------------------------

interface RawModelRow extends RawRow {
  id: string;
  category_id: string;
  brand_id: string;
  family_id?: string | null;
  name: string;
  model_number?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  is_deleted: boolean;
  // Embedded
  brands?: { name: string } | null;
  families?: { name: string } | null;
  categories?: { name: string } | null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTModelRepository
  extends BasePostgRESTRepository<Model, CreateModelData, UpdateModelData, ModelFilter>
  implements IModelRepository
{
  constructor() {
    super('models');
  }

  protected override buildSelectParams(): string {
    return '*,brands(name),families(name),categories(name)';
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    params.set('name', `ilike.*${query}*`);
  }

  protected override buildFilters(filter: ModelFilter, params: URLSearchParams): void {
    if (filter.name)       params.set('name',        `ilike.*${filter.name}*`);
    if (filter.brandId)    params.set('brand_id',    `eq.${filter.brandId}`);
    if (filter.familyId)   params.set('family_id',   `eq.${filter.familyId}`);
    if (filter.categoryId) params.set('category_id', `eq.${filter.categoryId}`);
  }

  protected mapRow(raw: RawRow): Model {
    const row = raw as RawModelRow;
    return {
      id: row.id,
      categoryId: row.category_id,
      brandId: row.brand_id,
      familyId: row.family_id ?? undefined,
      name: row.name,
      modelNumber: row.model_number ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      isDeleted: Boolean(row.is_deleted),
      // Resolved from embedded joins
      resolvedBrandName:    row.brands?.name,
      resolvedFamilyName:   row.families?.name,
      resolvedCategoryName: row.categories?.name,
    };
  }

  protected mapCreateToBody(data: CreateModelData): RawRow {
    return {
      category_id: data.categoryId,
      brand_id: data.brandId,
      family_id: data.familyId ?? null,
      name: data.name,
      model_number: data.modelNumber ?? null,
      created_by: data.createdBy ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  protected mapUpdateToBody(data: UpdateModelData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.name !== undefined)       body.name = data.name;
    if (data.modelNumber !== undefined) body.model_number = data.modelNumber;
    if (data.categoryId !== undefined) body.category_id = data.categoryId;
    if (data.brandId !== undefined)    body.brand_id = data.brandId;
    if (data.familyId !== undefined)   body.family_id = data.familyId;
    if (data.updatedBy !== undefined)  body.updated_by = data.updatedBy;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getModelRepository = (): IModelRepository =>
  new PostgRESTModelRepository();
