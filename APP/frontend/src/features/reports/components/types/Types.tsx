export interface TopProductItem {
  productId: string;
  name: string;
  code?: string;
  quantity: number;
  revenueBs: number;
  revenueArg: number;
}

export interface DailySales {
  date: string;
  totalBs: number;
  totalArg: number;
  count: number;
}

export interface PaymentMethodSummary {
  method: string;
  totalBs: number;
  totalArg: number;
  count: number;
  percentage: number;
}

export interface SalesSummary {
  totalBs: number;
  totalArg: number;
  count: number;
  averageBs: number;
  averageArg: number;
}

// ── Financial Report Types ──

export interface FinancialSummary {
  // Income
  salesIncome: number;
  reparationIncome: number;
  totalIncome: number; // salesIncome + reparationIncome

  // Expenses
  purchaseExpenses: number;

  // Profit
  netProfit: number; // totalIncome - purchaseExpenses
  profitMargin: number; // (netProfit / totalIncome) * 100

  // Counts
  salesCount: number;
  purchasesCount: number;
  reparationsCount: number;

  // Sales detail
  averageTicket: number; // salesIncome / salesCount
}

export interface FinancialProductDetail {
  productId: string;
  productName: string;
  productCode: string;
  quantitySold: number;
  totalRevenue: number;
  totalCostPurchased: number;
  estimatedProfit: number;
}

export interface FinancialDailyBreakdown {
  date: string;
  income: number;
  expenses: number;
  reparationIncome: number;
  net: number;
}
