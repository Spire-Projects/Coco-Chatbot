/**
 * Brand repository — PostgREST implementation backed by the `brands` table.
 *
 * Brands have no soft-delete or timestamps in the DB schema.
 * The `is_deleted` / `createdAt` fields are synthetic defaults added to
 * satisfy the ICrudBaseRepository contract.
 */

import { BasePostgRESTRepository, type RawRow } from './BasePostgRESTRepository';
import type { ICrudBaseRepository } from '../../db/repositories/interfaces/IRepository';
import type {
  Brand,
  BrandFilter,
  CreateBrandData,
  UpdateBrandData,
} from '../../types/modelTypes/Brand';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface IBrandRepository
  extends ICrudBaseRepository<Brand, CreateBrandData, UpdateBrandData, BrandFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row shape
// ---------------------------------------------------------------------------

interface RawBrandRow extends RawRow {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTBrandRepository
  extends BasePostgRESTRepository<Brand, CreateBrandData, UpdateBrandData, BrandFilter>
  implements IBrandRepository
{
  constructor() {
    super('brands');
  }

  protected override readonly hasSoftDelete = false;
  protected override readonly defaultOrderColumn = 'name';

  protected override buildFilters(filter: BrandFilter, params: URLSearchParams): void {
    if (filter.name) params.set('name', `ilike.*${filter.name}*`);
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    params.set('name', `ilike.*${query}*`);
  }

  protected mapRow(raw: RawRow): Brand {
    const row = raw as RawBrandRow;
    return {
      id: row.id,
      name: row.name,
      // Synthetic fields to satisfy ICrudBaseRepository contract
      isDeleted: false,
      createdAt: '',
    };
  }

  protected mapCreateToBody(data: CreateBrandData): RawRow {
    return { name: data.name };
  }

  protected mapUpdateToBody(data: UpdateBrandData): RawRow {
    const body: RawRow = {};
    if (data.name !== undefined) body.name = data.name;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getBrandRepository = (): IBrandRepository =>
  new PostgRESTBrandRepository();
