/**
 * ExchangeRate types — maps to the `exchange_rates` table.
 *
 * Stores the equivalence: 1 USD = rate Bs.
 * The "current" row is the one where is_current = true.
 * Updating: INSERT new row with is_current=true;
 * the service marks previous rows as is_current=false first.
 */

// ---------------------------------------------------------------------------
// Core entity
// ---------------------------------------------------------------------------

export interface ExchangeRate {
  id: string;
  rate: number;           // 1 USD = rate Bs
  validFrom: string;      // TIMESTAMPTZ as ISO string
  isCurrent: boolean;
  // Synthetic fields required by ICrudBaseRepository constraint
  isDeleted: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateExchangeRateData {
  rate: number;
}

export interface UpdateExchangeRateData {
  isCurrent?: boolean;
}

export interface ExchangeRateFilter {
  isCurrent?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Aliases
// ---------------------------------------------------------------------------

export type Currency = ExchangeRate;
export type CreateCurrencyData = CreateExchangeRateData;
export type UpdateCurrencyData = UpdateExchangeRateData;
export type CurrencyFilter = ExchangeRateFilter;

