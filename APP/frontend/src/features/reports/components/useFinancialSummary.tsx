// @ts-nocheck
import { useMemo } from "react";
import type { Sale } from "@/shared/types/modelTypes/Sale";
import type { PurchaseView } from "@/shared/types/modelTypes/PurchaseBox";
import type { ReparationView } from "@/shared/types/modelTypes/Reparation";
import type {
  FinancialSummary,
  FinancialProductDetail,
  FinancialDailyBreakdown,
} from "./types/Types";

export function useFinancialSummary(
  sales: Sale[],
  purchases: PurchaseView[],
  reparations: ReparationView[]
): FinancialSummary {
  return useMemo(() => {
    // Income from sales (only Bs)
    const salesIncome = sales
      .filter((sale) => sale.paymentCurrency === "bs")
      .reduce((sum, sale) => sum + sale.total, 0);

    // Income from completed/delivered reparations
    const reparationIncome = reparations.reduce(
      (sum, r) => sum + r.totalCost,
      0
    );

    // Expenses from purchases
    const purchaseExpenses = purchases.reduce(
      (sum, p) => sum + p.totalCost,
      0
    );

    const totalIncome = salesIncome + reparationIncome;
    const netProfit = totalIncome - purchaseExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const averageTicket = sales.length > 0 ? salesIncome / sales.length : 0;

    return {
      salesIncome,
      reparationIncome,
      totalIncome,
      purchaseExpenses,
      netProfit,
      profitMargin,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      reparationsCount: reparations.length,
      averageTicket,
    };
  }, [sales, purchases, reparations]);
}

export function useFinancialProductDetails(
  sales: Sale[],
  purchases: PurchaseView[]
): FinancialProductDetail[] {
  return useMemo(() => {
    // Group sales by product (only Bs)
    const productMap: Record<
      string,
      {
        productId: string;
        productName: string;
        productCode: string;
        quantitySold: number;
        totalRevenue: number;
      }
    > = {};

    sales
      .filter((sale) => sale.paymentCurrency === "bs")
      .forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productMap[item.product]) {
            productMap[item.product] = {
              productId: item.product,
              productName: item.product,
              productCode: "",
              quantitySold: 0,
              totalRevenue: 0,
            };
          }
          productMap[item.product].quantitySold += item.quantity;
          productMap[item.product].totalRevenue += item.total;
        });
      });

    // Group purchases by product to calculate costs
    const purchaseCostMap: Record<string, number> = {};
    purchases.forEach((purchase) => {
      if (!purchaseCostMap[purchase.productId]) {
        purchaseCostMap[purchase.productId] = 0;
      }
      purchaseCostMap[purchase.productId] += purchase.totalCost;
    });

    // Build product details with profit calculation
    const details: FinancialProductDetail[] = Object.values(productMap).map(
      (p) => {
        const totalCostPurchased = purchaseCostMap[p.productId] || 0;
        return {
          ...p,
          totalCostPurchased,
          estimatedProfit: p.totalRevenue - totalCostPurchased,
        };
      }
    );

    // Sort by revenue descending
    details.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return details;
  }, [sales, purchases]);
}

export function useFinancialDailyBreakdown(
  sales: Sale[],
  purchases: PurchaseView[],
  reparations: ReparationView[]
): FinancialDailyBreakdown[] {
  return useMemo(() => {
    const dailyMap: Record<
      string,
      {
        income: number;
        expenses: number;
        reparationIncome: number;
      }
    > = {};

    // Sales income by day (only Bs)
    sales
      .filter((sale) => sale.paymentCurrency === "bs")
      .forEach((sale) => {
        const date = sale.createdAt.split("T")[0];
        if (!dailyMap[date]) {
          dailyMap[date] = {
            income: 0,
            expenses: 0,
            reparationIncome: 0,
          };
        }
        dailyMap[date].income += sale.total;
      });

    // Purchase expenses by day
    purchases.forEach((purchase) => {
      const date = purchase.purchaseDate.split("T")[0];
      if (!dailyMap[date]) {
        dailyMap[date] = {
          income: 0,
          expenses: 0,
          reparationIncome: 0,
        };
      }
      dailyMap[date].expenses += purchase.totalCost;
    });

    // Reparation income by day
    reparations.forEach((rep) => {
      const date = rep.createdAt.split("T")[0];
      if (!dailyMap[date]) {
        dailyMap[date] = {
          income: 0,
          expenses: 0,
          reparationIncome: 0,
        };
      }
      dailyMap[date].reparationIncome += rep.totalCost;
    });

    // Convert to array and sort by date
    return Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        ...data,
        net: data.income + data.reparationIncome - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sales, purchases, reparations]);
}
