export interface CashClosureSummary {
  totalSalesBs: number;
  totalSalesArg: number;
  totalCashBs: number;
  totalQrBs: number;
  totalCashArg: number;
  totalQrArg: number;
  differenceBs: number;
  differenceArg: number;
  hasArgSales: boolean;
}

export interface CashClosureFormData {
  date: string;
  cashBreakdownBs: { denomination: number; quantity: number }[];
  qrAmountBs: number;
  cashBreakdownArg?: { denomination: number; quantity: number }[];
  qrAmountArg?: number;
}

export type CurrencyTab = 'bs' | 'arg';
