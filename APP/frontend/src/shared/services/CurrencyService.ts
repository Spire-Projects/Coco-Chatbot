import { BaseService } from './BaseService';
import type {
  ExchangeRate,
  ExchangeRateFilter,
  CreateExchangeRateData,
  UpdateExchangeRateData,
} from '../types/modelTypes/Currency';
import { getCurrencyRepository } from '../db/repositories/currency.repository';
import { createLazyService } from './lazyService';

class CurrencyService extends BaseService<
  ExchangeRate,
  ExchangeRate,
  CreateExchangeRateData,
  UpdateExchangeRateData,
  ExchangeRateFilter
> {
  constructor() {
    super(getCurrencyRepository());
  }

  protected async toView(entity: ExchangeRate): Promise<ExchangeRate> {
    return entity;
  }

  /** Returns the current active exchange rate, or null if none exists. */
  async getCurrent(): Promise<ExchangeRate | null> {
    return getCurrencyRepository().getCurrent();
  }

  /**
   * Sets a new current exchange rate (1 USD = rate Bs).
   * Marks all existing rows as not current, then inserts the new one.
   */
  async setCurrent(rate: number): Promise<ExchangeRate> {
    const repo = getCurrencyRepository();
    await repo.markAllNotCurrent();
    return this.create({ rate });
  }
}

export const currencyService = createLazyService(() => new CurrencyService());

