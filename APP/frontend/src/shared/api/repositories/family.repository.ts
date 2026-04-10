/**
 * Family repository — PostgREST implementation backed by the `families` table.
 *
 * A family groups models within a brand (e.g. "iPhone 13" belongs to "Apple").
 * The `brandId` filter is the key cascading filter used from the UI.
 */

import { BasePostgRESTRepository, type RawRow } from './BasePostgRESTRepository';
import type { ICrudBaseRepository } from '../../db/repositories/interfaces/IRepository';
import type {
  Family,
  FamilyFilter,
  CreateFamilyData,
  UpdateFamilyData,
} from '../../types/modelTypes/Family';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface IFamilyRepository
  extends ICrudBaseRepository<Family, CreateFamilyData, UpdateFamilyData, FamilyFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row shape
// ---------------------------------------------------------------------------

interface RawFamilyRow extends RawRow {
  id: string;
  brand_id: string;
  name: string;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  is_deleted: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTFamilyRepository
  extends BasePostgRESTRepository<Family, CreateFamilyData, UpdateFamilyData, FamilyFilter>
  implements IFamilyRepository
{
  constructor() {
    super('families');
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    params.set('name', `ilike.*${query}*`);
  }

  protected override buildFilters(filter: FamilyFilter, params: URLSearchParams): void {
    if (filter.name)    params.set('name',     `ilike.*${filter.name}*`);
    if (filter.brandId) params.set('brand_id', `eq.${filter.brandId}`);
  }

  protected mapRow(raw: RawRow): Family {
    const row = raw as RawFamilyRow;
    return {
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      createdAt: row.created_at,
      createdBy: row.created_by ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      isDeleted: Boolean(row.is_deleted),
    };
  }

  protected mapCreateToBody(data: CreateFamilyData): RawRow {
    return {
      brand_id: data.brandId,
      name: data.name,
      created_by: data.createdBy ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  protected mapUpdateToBody(data: UpdateFamilyData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.name !== undefined)      body.name = data.name;
    if (data.updatedBy !== undefined) body.updated_by = data.updatedBy;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getFamilyRepository = (): IFamilyRepository =>
  new PostgRESTFamilyRepository();
