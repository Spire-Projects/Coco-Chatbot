/**
 * exchangeRateStore — Zustand global store for USD→Bs exchange rate.
 *
 * Mirrors the pattern of branchStore:
 *  - Persists `currentRate` to localStorage between sessions.
 *  - `fetchRate()` is called by authStore after login / storage-load.
 *  - Components read `currentRate` (e.g. 1 USD = 6.96 Bs) directly.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCurrencyRepository } from '../db/repositories/currency.repository';

/** Default rate used when no rate has been configured yet. */
const DEFAULT_RATE = 6.96;

interface ExchangeRateState {
  /** 1 USD = currentRate Bs */
  currentRate: number;
  isLoading: boolean;
}

interface ExchangeRateActions {
  /** Fetch the active rate from the DB and store it globally. */
  fetchRate: () => Promise<void>;
  /** Manually set the rate (called after saving from settings). */
  setRate: (rate: number) => void;
  /** Reset to default (called on logout). */
  clearRate: () => void;
}

export const useExchangeRateStore = create<ExchangeRateState & ExchangeRateActions>()(
  persist(
    (set) => ({
      currentRate: DEFAULT_RATE,
      isLoading: false,

      fetchRate: async () => {
        set({ isLoading: true });
        try {
          const repo = getCurrencyRepository();
          const current = await repo.getCurrent();
          set({ currentRate: current?.rate ?? DEFAULT_RATE, isLoading: false });
        } catch (err) {
          console.error('[exchangeRateStore] fetchRate failed:', err);
          set({ isLoading: false });
        }
      },

      setRate: (rate) => set({ currentRate: rate }),

      clearRate: () => set({ currentRate: DEFAULT_RATE }),
    }),
    {
      name: 'falcon_exchange_rate',
      // Only persist the rate value, not the loading flag
      partialize: (state) => ({ currentRate: state.currentRate }),
    }
  )
);
