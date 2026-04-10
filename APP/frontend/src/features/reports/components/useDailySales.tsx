// @ts-nocheck
import { useMemo } from "react";
import type { Sale } from "@/shared/types/modelTypes/Sale";
import type { DailySales } from "./types/Types";

export function useDailySales(sales: Sale[]) {
  return useMemo(() => {
    if (sales.length === 0) return [];

    const salesByDay = new Map<string, DailySales>();

    sales.forEach((sale) => {
      const date = sale.createdAt.split("T")[0];
      
      if (salesByDay.has(date)) {
        const existing = salesByDay.get(date)!;
        existing.count += 1;
        if (sale.paymentCurrency === 'bs') {
          existing.totalBs += sale.total;
        } else if (sale.paymentCurrency === 'arg') {
          existing.totalArg += sale.total;
        }
      } else {
        salesByDay.set(date, {
          date,
          totalBs: sale.paymentCurrency === 'bs' ? sale.total : 0,
          totalArg: sale.paymentCurrency === 'arg' ? sale.total : 0,
          count: 1,
        });
      }
    });

    return Array.from(salesByDay.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [sales]);
}
