// @ts-nocheck
import { useMemo } from "react";
import type { Sale } from "@/shared/types/modelTypes/Sale";
import type { SalesSummary } from "./types/Types";

export function useSalesSummary(sales: Sale[]): SalesSummary {
  return useMemo(() => {
    if (sales.length === 0) {
      return { 
        totalBs: 0, 
        totalArg: 0, 
        count: 0, 
        averageBs: 0, 
        averageArg: 0 
      };
    }

    let totalBs = 0;
    let totalArg = 0;
    let countBs = 0;
    let countArg = 0;

    sales.forEach((sale) => {
      if (sale.paymentCurrency === 'bs') {
        totalBs += sale.total;
        countBs++;
      } else if (sale.paymentCurrency === 'arg') {
        totalArg += sale.total;
        countArg++;
      }
    });

    return {
      totalBs,
      totalArg,
      count: sales.length,
      averageBs: countBs > 0 ? totalBs / countBs : 0,
      averageArg: countArg > 0 ? totalArg / countArg : 0,
    };
  }, [sales]);
}

