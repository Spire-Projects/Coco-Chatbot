// @ts-nocheck
import { useMemo } from "react";
import type { Sale } from "@/shared/types/modelTypes/Sale";
import type { TopProductItem } from "./types/Types";

export function useTopProducts(sales: Sale[]) {
  return useMemo(() => {
    if (sales.length === 0) return [];

    const productsMap = new Map<string, TopProductItem>();
 
    sales.forEach((sale) => {
     console.log("Procesando venta:", sale.paymentCurrency, sale.total);
      sale.items.forEach((item) => {
        console.log("  Procesando item:", item.product, item.quantity, item.total);
        if (productsMap.has(item.product)) {
          const existing = productsMap.get(item.product)!;

          existing.quantity += item.quantity;
          if (sale.paymentCurrency === "bs") {
            existing.revenueBs += item.total;
          } else {
            existing.revenueArg += item.total;
          }
        } else {
          productsMap.set(item.product, {
            productId: item.product,
            name: item.product,
            quantity: item.quantity,
            revenueBs: sale.paymentCurrency === "bs" ? item.total : 0,
            revenueArg: sale.paymentCurrency === "arg" ? item.total : 0,
          });
        }
      });
    });
    const arrayWithData = Array.from(productsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    console.log("Top products calculated:", arrayWithData);
    return arrayWithData;
  }, [sales]);
}
