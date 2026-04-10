/**
 * ExchangeRate repository — PostgREST implementation backed by `exchange_rates`.
 *
 * The table has no is_deleted / created_at columns.
 * Both synthetic fields are mapped to safe defaults to satisfy BaseService.
 *
 * Special operation: markAllNotCurrent() PATCHes all rows to is_current=false.
 * Used by ExchangeRateService before inserting a new current rate.
 */

import { BasePostgRESTRepository, type RawRow } from '../../api/repositories/BasePostgRESTRepository';
import { pgFetch } from '../../api/client';
import type { ICrudBaseRepository } from './interfaces/IRepository';
import type {
  ExchangeRate,
  ExchangeRateFilter,
  CreateExchangeRateData,
  UpdateExchangeRateData,
} from '../../types/modelTypes/Currency';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface ICurrencyRepository
  extends ICrudBaseRepository<ExchangeRate, CreateExchangeRateData, UpdateExchangeRateData, ExchangeRateFilter> {
  markAllNotCurrent(): Promise<void>;
  getCurrent(): Promise<ExchangeRate | null>;
}

// ---------------------------------------------------------------------------
// Raw DB row
// ---------------------------------------------------------------------------

interface RawExchangeRateRow extends RawRow {
  id: string;
  rate: number | string;      // 1 USD = rate Bs
  valid_from: string;
  is_current: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PostgRESTCurrencyRepository
  extends BasePostgRESTRepository<ExchangeRate, CreateExchangeRateData, UpdateExchangeRateData, ExchangeRateFilter>
  implements ICurrencyRepository
{
  constructor() {
    super('exchange_rates');
  }

  protected override readonly hasSoftDelete  = false;
  protected override readonly defaultOrderColumn = 'valid_from';

  protected override buildFilters(filter: ExchangeRateFilter, params: URLSearchParams): void {
    if (filter.isCurrent !== undefined) params.set('is_current', `eq.${filter.isCurrent}`);
  }

  protected override buildSearchParams(_query: string, _params: URLSearchParams): void {
    // exchange_rates has no text fields to search
  }

  // ── Row mapping ─────────────────────────────────────────────────────────

  protected mapRow(raw: RawRow): ExchangeRate {
    const row = raw as RawExchangeRateRow;
    return {
      id:        row.id,
      rate:      Number(row.rate),
      validFrom: row.valid_from,
      isCurrent: Boolean(row.is_current),
      // Synthetic fields to satisfy BaseService constraint
      isDeleted: false,
      createdAt: row.valid_from,
    };
  }

  protected mapCreateToBody(data: CreateExchangeRateData): RawRow {
    return {
      rate:       data.rate,
      valid_from: new Date().toISOString(),
      is_current: true,
    };
  }

  protected mapUpdateToBody(data: UpdateExchangeRateData): RawRow {
    const body: RawRow = {};
    if (data.isCurrent !== undefined) body.is_current = data.isCurrent;
    return body;
  }

  // ── Extra methods ────────────────────────────────────────────────────────

  async markAllNotCurrent(): Promise<void> {
    await pgFetch<unknown>('/exchange_rates?is_current=eq.true', {
      method: 'PATCH',
      body: JSON.stringify({ is_current: false }),
    });
  }

  async getCurrent(): Promise<ExchangeRate | null> {
    const rows = await pgFetch<RawExchangeRateRow[]>(
      '/exchange_rates?is_current=eq.true&order=valid_from.desc&limit=1'
    );
    if (!rows.length) return null;
    return this.mapRow(rows[0]);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const getCurrencyRepository = (): ICurrencyRepository =>
  new PostgRESTCurrencyRepository();

