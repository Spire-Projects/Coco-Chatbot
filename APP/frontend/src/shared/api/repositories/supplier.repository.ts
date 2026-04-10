/**
 * Supplier repository — PostgREST implementation backed by the `suppliers` table.
 *
 * The suppliers table has no is_deleted or created_at columns.
 * isDeleted / createdAt are synthetic defaults to satisfy ICrudBaseRepository.
 */

import { BasePostgRESTRepository, type RawRow } from './BasePostgRESTRepository';
import type { ICrudBaseRepository } from '../../db/repositories/interfaces/IRepository';
import type {
  Supplier,
  SupplierFilter,
  CreateSupplierData,
  UpdateSupplierData,
} from '../../types/modelTypes/Supplier';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface ISupplierRepository
  extends ICrudBaseRepository<Supplier, CreateSupplierData, UpdateSupplierData, SupplierFilter> {}

// ---------------------------------------------------------------------------
// Raw DB row shape
// ---------------------------------------------------------------------------

interface RawSupplierRow extends RawRow {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTSupplierRepository
  extends BasePostgRESTRepository<Supplier, CreateSupplierData, UpdateSupplierData, SupplierFilter>
  implements ISupplierRepository
{
  constructor() {
    super('suppliers');
  }

  protected override readonly hasSoftDelete = false;
  protected override readonly defaultOrderColumn = 'name';

  protected override buildFilters(filter: SupplierFilter, params: URLSearchParams): void {
    if (filter.name)     params.set('name',      `ilike.*${filter.name}*`);
    if (filter.isActive !== undefined) params.set('is_active', `eq.${filter.isActive}`);
  }

  protected override buildSearchParams(query: string, params: URLSearchParams): void {
    params.set('or', `(name.ilike.*${query}*,email.ilike.*${query}*)`);
  }

  protected mapRow(raw: RawRow): Supplier {
    const row = raw as RawSupplierRow;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      notes: row.notes ?? undefined,
      isActive: row.is_active ?? true,
      // Synthetic fields to satisfy base contract
      isDeleted: false,
      createdAt: '',
    };
  }

  protected mapCreateToBody(data: CreateSupplierData): RawRow {
    return {
      name:  data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
    };
  }

  protected mapUpdateToBody(data: UpdateSupplierData): RawRow {
    const body: RawRow = {};
    if (data.name     !== undefined) body.name      = data.name;
    if (data.phone    !== undefined) body.phone     = data.phone;
    if (data.email    !== undefined) body.email     = data.email;
    if (data.notes    !== undefined) body.notes     = data.notes;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    return body;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getSupplierRepository = (): ISupplierRepository =>
  new PostgRESTSupplierRepository();
