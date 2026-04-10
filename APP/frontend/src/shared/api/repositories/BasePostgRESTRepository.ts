/**
 * BasePostgRESTRepository
 *
 * Abstract base class that implements ICrudBaseRepository<T, TCreate, TUpdate, TFilter>
 * using PostgREST HTTP conventions.
 *
 * Subclasses must implement:
 *  - `buildFilters(filter, params)` — append entity-specific query params
 *  - `buildSearchParams(query, params)` — append text-search query params
 *  - `mapRow(row)` — map raw snake_case DB row to camelCase entity T
 *  - `mapCreateToBody(data)` — map TCreate DTO to a snake_case DB payload
 *  - `mapUpdateToBody(data)` — map TUpdate DTO to a snake_case DB payload
 *
 * Pagination uses PostgREST's `Range` / `Content-Range` header convention.
 * Search/filter construction is delegated to the subclass to keep this class
 * schema-agnostic.
 */

import { pgFetch } from '../client';
import type { ICrudBaseRepository } from '../../db/repositories/interfaces/IRepository';
import type { ItemsResponse } from '../../types/UtilTypes';

// ---------------------------------------------------------------------------
// Internal types for raw PostgREST rows
// ---------------------------------------------------------------------------

/** A raw DB row in snake_case as returned by PostgREST */
export type RawRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export abstract class BasePostgRESTRepository<
  T extends { id: string; isDeleted: boolean; createdAt: string },
  TCreate,
  TUpdate,
  TFilter,
> implements ICrudBaseRepository<T, TCreate, TUpdate, TFilter>
{
  constructor(protected readonly tableName: string) {}

  /**
   * Set to `false` for tables that have no `is_deleted` column (e.g. brands, categories).
   * When false, the `is_deleted=eq.false` filter is omitted from all queries.
   */
  protected readonly hasSoftDelete: boolean = true;

  /**
   * Column used for default ordering in `getAll`. Set to `null` to omit ORDER BY.
   * Tables without `created_at` (e.g. brands, categories) should set this to `'name'`.
   */
  protected readonly defaultOrderColumn: string | null = 'created_at';

  /**
   * When reading from a VIEW but writing to the underlying base table,
   * set this to the base table name. If null, `tableName` is used for writes too.
   */
  protected readonly writeTableName: string | null = null;

  private get effectiveWriteTable(): string {
    return this.writeTableName ?? this.tableName;
  }

  // ---------------------------------------------------------------------------
  // Abstract methods — subclasses must implement
  // ---------------------------------------------------------------------------

  /**
   * Map a raw snake_case row from PostgREST to the typed camelCase entity T.
   * Also handle any embedded relationships returned via PostgREST ?select=.
   */
  protected abstract mapRow(row: RawRow): T;

  /**
   * Convert a TCreate DTO to a snake_case object ready for POST body.
   */
  protected abstract mapCreateToBody(data: TCreate): RawRow;

  /**
   * Convert a TUpdate DTO to a snake_case partial object ready for PATCH body.
   * Must always include `updated_at`.
   */
  protected abstract mapUpdateToBody(data: TUpdate): RawRow;

  /**
   * Append entity-specific filter query parameters.
   * Called by `getAll` when a filter object is provided.
   *
   * @param filter   The TFilter object from the caller
   * @param params   URLSearchParams to mutate
   */
  protected buildFilters(_filter: TFilter, _params: URLSearchParams): void {
    // Default: no-op. Override in subclass.
  }

  /**
   * Append text-search query parameters.
   * Called by `getAll` when a non-empty searchQuery is provided.
   *
   * @param query   The search string from the caller
   * @param params  URLSearchParams to mutate
   */
  protected buildSearchParams(_query: string, _params: URLSearchParams): void {
    // Default: no-op. Override in subclass.
  }

  // ---------------------------------------------------------------------------
  // ICrudBaseRepository implementation
  // ---------------------------------------------------------------------------

  /** Insert a new row and return the created entity */
  async create(data: TCreate): Promise<T> {
    const body = this.mapCreateToBody(data);
    const rows = await pgFetch<RawRow[]>(`/${this.effectiveWriteTable}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.mapRow(rows[0]);
  }

  /** Partial update a row by ID and return the updated entity */
  async update(id: string, updateData: TUpdate): Promise<T | null> {
    const body = this.mapUpdateToBody(updateData);
    const rows = await pgFetch<RawRow[]>(
      `/${this.effectiveWriteTable}?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  /** Soft-delete a row by setting is_deleted = true */
  async softDelete(id: string): Promise<boolean> {
    await pgFetch(`/${this.effectiveWriteTable}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      }),
    });
    return true;
  }

  /** Find a single row by its primary-key UUID */
  async findById(id: string): Promise<T | null> {
    const isDeletedFilter = this.hasSoftDelete ? `&is_deleted=eq.false` : '';
    const selectStr = this.buildSelectParams();
    const selectParam = selectStr ? `select=${selectStr}&` : '';
    const rows = await pgFetch<RawRow[]>(
      `/${this.tableName}?${selectParam}id=eq.${encodeURIComponent(id)}${isDeletedFilter}`,
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  /**
   * Paginated list with optional full-text search and filter.
   *
   * PostgREST pagination:
   *   → Request header:  Range: {from}-{to}
   *   ← Response header: Content-Range: {from}-{to}/{total}
   */
  async getAll(
    page: number,
    size: number,
    searchQuery?: string,
    _dateFrom?: string,
    _dateTo?: string,
    filter?: TFilter,
  ): Promise<ItemsResponse<T>> {
    const from = (page - 1) * size;
    const to = from + size - 1;

    const params = new URLSearchParams();
    if (this.hasSoftDelete) params.set('is_deleted', 'eq.false');
    if (this.defaultOrderColumn) params.set('order', `${this.defaultOrderColumn}.desc`);

    const selectStr = this.buildSelectParams();
    if (selectStr) params.set('select', selectStr);

    if (searchQuery?.trim()) {
      this.buildSearchParams(searchQuery.trim(), params);
    }

    if (filter) {
      this.buildFilters(filter, params);
    }

    // Use fetch directly so we can pass and read Range/Content-Range headers
    const { rows, totalItems } = await this.fetchPaginated(
      `/${this.tableName}?${params.toString()}`,
      from,
      to,
    );

    return {
      items: rows.map(r => this.mapRow(r)),
      page,
      size,
      totalItems,
      totalPages: Math.ceil(totalItems / size),
    };
  }

  // ---------------------------------------------------------------------------
  // Overridable helpers
  // ---------------------------------------------------------------------------

  /**
   * Return the PostgREST `select` string for this table.
   * Override in subclasses to embed related tables.
   * Return empty string to select all columns with `*`.
   */
  protected buildSelectParams(): string {
    return '*';
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Perform a paginated GET request using PostgREST Range headers.
   * Returns the parsed rows and the total item count from Content-Range.
   */
  private async fetchPaginated(
    url: string,
    from: number,
    to: number,
  ): Promise<{ rows: RawRow[]; totalItems: number }> {
    const { fetchWithAuthRetry } = await import('../client');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Prefer': 'count=exact',
      'Range-Unit': 'items',
      'Range': `${from}-${to}`,
    };

    const res = await fetchWithAuthRetry(url, { headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw err;
    }

    // Content-Range: "0-9/150"  →  totalItems = 150
    const contentRange = res.headers.get('Content-Range') ?? '';
    const totalItems = parseInt(contentRange.split('/')[1] ?? '0', 10) || 0;

    const rows: RawRow[] = await res.json();
    return { rows, totalItems };
  }
}
