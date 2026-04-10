import { pgFetch } from '../../api/client';
import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type { NIT, CreateNitData, UpdateNitData, NitFilter } from '../../types/Nit';
import type { ItemsResponse } from '../../types/UtilTypes';

// ---------------------------------------------------------------------------
// Extended repository interface (adds NIT-specific search methods)
// ---------------------------------------------------------------------------

export interface INitRepository
  extends ICrudBaseRepository<NIT, CreateNitData, UpdateNitData, NitFilter> {
  findByNumberNit(numberNit: string): Promise<NIT | null>;
  getActiveNits(): Promise<NIT[]>;
  searchByText(searchText: string, page: number, size: number): Promise<ItemsResponse<NIT>>;
}

// ---------------------------------------------------------------------------
// Raw DB row shape
// ---------------------------------------------------------------------------

interface RawNitRow extends RawRow {
  id: string;
  number_nit: string;
  social_reason?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  is_deleted: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTNitRepository
  extends BasePostgRESTRepository<NIT, CreateNitData, UpdateNitData, NitFilter>
  implements INitRepository
{
  constructor() {
    super('nits');
  }

  protected override buildSelectParams(): string {
    return 'id,number_nit,social_reason,created_at,created_by,updated_at,is_deleted';
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    const q = `*${query}*`;
    params.set('or', `(number_nit.ilike.${q},social_reason.ilike.${q})`);
  }

  protected override buildFilters(_filter: NitFilter, _params: URLSearchParams): void {
    // branchId / isDeleted — base class handles is_deleted automatically
  }

  protected mapRow(raw: RawRow): NIT {
    const row = raw as RawNitRow;
    return {
      id:           row.id,
      numberNit:    row.number_nit,
      socialReason: row.social_reason ?? undefined,
      createdAt:    row.created_at,
      createdBy:    row.created_by  ?? undefined,
      updatedAt:    row.updated_at  ?? undefined,
      isDeleted:    Boolean(row.is_deleted),
    };
  }

  protected mapCreateToBody(data: CreateNitData): RawRow {
    return {
      number_nit:    data.numberNit.trim(),
      social_reason: data.socialReason?.trim() ?? null,
      created_by:    data.createdBy ?? null,
      created_at:    new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    };
  }

  protected mapUpdateToBody(data: UpdateNitData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.numberNit    !== undefined) body.number_nit    = data.numberNit.trim();
    if (data.socialReason !== undefined) body.social_reason = data.socialReason.trim();
    return body;
  }

  // ---------------------------------------------------------------------------
  // Extra methods beyond ICrudBaseRepository
  // ---------------------------------------------------------------------------

  async findByNumberNit(numberNit: string): Promise<NIT | null> {
    const rows = await pgFetch<RawRow[]>(
      `/nits?number_nit=eq.${encodeURIComponent(numberNit)}&is_deleted=eq.false&select=${this.buildSelectParams()}`,
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async getActiveNits(): Promise<NIT[]> {
    const rows = await pgFetch<RawRow[]>(
      `/nits?is_deleted=eq.false&select=${this.buildSelectParams()}&order=number_nit.asc`,
    );
    return rows.map((r) => this.mapRow(r));
  }

  async searchByText(
    searchText: string,
    page: number,
    size: number,
  ): Promise<ItemsResponse<NIT>> {
    return this.getAll(page, size, searchText);
  }
}

let _instance: PostgRESTNitRepository | null = null;

export const getNitRepository = (): INitRepository => {
  if (!_instance) _instance = new PostgRESTNitRepository();
  return _instance;
};
