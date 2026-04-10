// @ts-nocheck
import { useMemo } from "react";
import type { Sale } from "@/shared/types/modelTypes/Sale";

interface PaymentMethodData {
  totalBs: number;
  totalArg: number;
  count: number;
}

export function usePaymentMethods(sales: Sale[]) {
  return useMemo(() => {
    if (sales.length === 0) return [];

    const methodMap = new Map<string, PaymentMethodData>();
    let totalAmountBs = 0;
    let totalAmountArg = 0;

    sales.forEach((sale) => {
      const amount = sale.total;
      const currency = sale.paymentCurrency;

      if (currency === 'bs') {
        totalAmountBs += amount;
      } else if (currency === 'arg') {
        totalAmountArg += amount;
      }

      if (methodMap.has(sale.paymentMethod)) {
        const existing = methodMap.get(sale.paymentMethod)!;
        if (currency === 'bs') {
          existing.totalBs += amount;
        } else if (currency === 'arg') {
          existing.totalArg += amount;
        }
        existing.count += 1;
      } else {
        methodMap.set(sale.paymentMethod, {
          totalBs: currency === 'bs' ? amount : 0,
          totalArg: currency === 'arg' ? amount : 0,
          count: 1,
        });
      }
    });

    // Traducir nombres de métodos de pago
    const methodNames: Record<string, string> = {
      efectivo: "Efectivo",
      qr: "QR",
    };

    const totalAmount = totalAmountBs + totalAmountArg;

    return Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method: methodNames[method as keyof typeof methodNames] || method,
        totalBs: data.totalBs,
        totalArg: data.totalArg,
        count: data.count,
        percentage: totalAmount > 0 ? ((data.totalBs + data.totalArg) / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => (b.totalBs + b.totalArg) - (a.totalBs + a.totalArg));
  }, [sales]);
}
