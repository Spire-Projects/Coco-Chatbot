import { useState, useEffect } from "react";
import { purchaseService } from "@/shared/services/PurchaseService";
import type { PurchaseView } from "@/shared/types/modelTypes/PurchaseBox";

export function usePurchaseData(dateFrom: string, dateTo: string) {
  const [purchases, setPurchases] = useState<PurchaseView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPurchases = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateFromFormatted = dateFrom + "T00:00:00.000Z";
        const dateToFormatted = dateTo + "T23:59:59.999Z";

        const result = await purchaseService.getAllView(
          1,
          10000,
          undefined,
          dateFromFormatted,
          dateToFormatted
        );

        setPurchases(result.items);
      } catch (err) {
        console.error("Error al cargar compras:", err);
        setError("Error al cargar los datos de compras");
      } finally {
        setIsLoading(false);
      }
    };

    if (dateFrom && dateTo) {
      loadPurchases();
    }
  }, [dateFrom, dateTo]);

  return { purchases, isLoading, error };
}
