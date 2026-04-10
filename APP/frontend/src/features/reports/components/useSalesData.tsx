// @ts-nocheck
import { useState, useEffect } from "react";
import { salesService } from "@/shared/services/SalesService";
import type { Sale } from "@/shared/types/modelTypes/Sale";

export function useSalesData(dateFrom: string, dateTo: string) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSales = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateFromFormatted = dateFrom + "T00:00:00.000Z";
        const dateToFormatted = dateTo + "T23:59:59.999Z";
        
        const result = await salesService.getAllView(
          1,
          10000,
          undefined,
          dateFromFormatted,
          dateToFormatted,
          {isDraft: false}
        );
        
        setSales(result.items);
      } catch (err) {
        console.error("Error al cargar ventas:", err);
        setError("Error al cargar los datos de ventas");
      } finally {
        setIsLoading(false);
      }
    };

    if (dateFrom && dateTo) {
      loadSales();
    }
  }, [dateFrom, dateTo]);

  return { sales, isLoading, error };
}

