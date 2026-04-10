// @ts-nocheck
import { useState, useEffect } from 'react';
import { salesService } from '@/shared/services/SalesService';
import type { Sale } from '@/shared/types/modelTypes/Sale';

export function useSalesData(date: string) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSalesBs, setTotalSalesBs] = useState(0);
  const [totalSalesArg, setTotalSalesArg] = useState(0);
  const [hasArgSales, setHasArgSales] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSales = async () => {
      if (!date) return;

      setLoading(true);
      try {
        const dateFrom = `${date}T00:00:00.000Z`;
        const dateTo = `${date}T23:59:59.999Z`;

        const result = await salesService.getAllView(
          1,
          10000,
          undefined,
          dateFrom,
          dateTo
        );

        setSales(result.items);

        let totalBs = 0;
        let totalArg = 0;
        let hasArg = false;

        result.items.forEach((sale) => {
          if (sale.paymentCurrency === 'bs') {
            totalBs += sale.total;
          } else if (sale.paymentCurrency === 'arg') {
            totalArg += sale.total;
            hasArg = true;
          }
        });

        setTotalSalesBs(totalBs);
        setTotalSalesArg(totalArg);
        setHasArgSales(hasArg);
      } catch (error) {
        console.error('Error loading sales data:', error);
        setTotalSalesBs(0);
        setTotalSalesArg(0);
        setHasArgSales(false);
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, [date]);

  return {
    sales,
    totalSalesBs,
    totalSalesArg,
    hasArgSales,
    loading,
  };
}
