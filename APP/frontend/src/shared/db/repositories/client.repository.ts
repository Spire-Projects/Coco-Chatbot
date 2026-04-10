import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type { Client, ClientFilter, CreateClientData, UpdateClientData } from '../../types/Client';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface IClientRepository
  extends ICrudBaseRepository<Client, CreateClientData, UpdateClientData, ClientFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row
// ---------------------------------------------------------------------------

interface RawClientRow extends RawRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  is_deleted: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTClientRepository
  extends BasePostgRESTRepository<Client, CreateClientData, UpdateClientData, ClientFilter>
  implements IClientRepository
{
  constructor() {
    super('clients');
  }

  // ---------------------------------------------------------------------------
  // Search — match on name, email, phone
  // ---------------------------------------------------------------------------

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    const q = `*${query}*`;
    params.set('or', `(name.ilike.${q},email.ilike.${q},phone.ilike.${q})`);
  }

  // ---------------------------------------------------------------------------
  // Filters — date range only for now
  // ---------------------------------------------------------------------------

  protected override buildFilters(_filter: ClientFilter, _params: URLSearchParams): void {
    // Date range is handled by the base class via dateFrom / dateTo
  }

  // ---------------------------------------------------------------------------
  // Row mapping
  // ---------------------------------------------------------------------------

  protected mapRow(raw: RawRow): Client {
    const row = raw as RawClientRow;
    return {
      id:        row.id,
      name:      row.name,
      email:     row.email    ?? undefined,
      phone:     row.phone    ?? undefined,
      address:   row.address  ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by  ?? undefined,
      updatedAt: row.updated_at  ?? undefined,
      updatedBy: row.updated_by  ?? undefined,
      isDeleted: Boolean(row.is_deleted),
    };
  }

  // ---------------------------------------------------------------------------
  // Create / Update body mapping
  // ---------------------------------------------------------------------------

  protected mapCreateToBody(data: CreateClientData): RawRow {
    return {
      name:       data.name,
      email:      data.email    ?? null,
      phone:      data.phone    ?? null,
      address:    data.address  ?? null,
      created_by: data.createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  protected mapUpdateToBody(data: UpdateClientData): RawRow {
    const body: RawRow = { updated_at: new Date().toISOString() };
    if (data.name      !== undefined) body.name       = data.name;
    if (data.email     !== undefined) body.email      = data.email || null;
    if (data.phone     !== undefined) body.phone      = data.phone || null;
    if (data.address   !== undefined) body.address    = data.address || null;
    if (data.updatedBy !== undefined) body.updated_by = data.updatedBy;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getClientRepository = (): IClientRepository =>
  new PostgRESTClientRepository();
