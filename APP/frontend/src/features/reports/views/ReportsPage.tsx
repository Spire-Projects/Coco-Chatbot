import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { FilterTabs } from "@/shared/components/FilterTabs";
import type { FilterOption } from "@/shared/components/FilterTabs";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { SummaryCards } from "../components/SummaryCards";
import { ErrorCard } from "../components/ErrorCard";
import { TopProductsChart } from "../components/TopProductsChart";
import { TopProductsTable } from "../components/TopProductsTable";
import { DailySalesChart } from "../components/DailySalesChart";
import { DailySalesTable } from "../components/DailySalesTable";
import { PaymentMethodChart } from "../components/PaymentMethodChart";
import { useSalesData } from "../components/useSalesData";
import { useTopProducts } from "../components/useTopProducts";
import { useDailySales } from "../components/useDailySales";
import { usePaymentMethods } from "../components/usePaymentMethods";
import { useSalesSummary } from "../components/useSalesSummary";
import { usePurchaseData } from "../components/usePurchaseData";
import { useReparationData } from "../components/useReparationData";
import {
  useFinancialSummary,
  useFinancialProductDetails,
  useFinancialDailyBreakdown,
} from "../components/useFinancialSummary";
import { FinancialSummaryCards } from "../components/FinancialSummaryCards";
import { FinancialChart } from "../components/FinancialChart";
import { FinancialDetailsTable } from "../components/FinancialDetailsTable";
import { FinancialOverview } from "../components/FinancialOverview";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const ReportsPage = () => {
  const [dateFrom, setDateFrom] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const { sales, isLoading, error } = useSalesData(dateFrom, dateTo);
  const salesSummary = useSalesSummary(sales);
  const topProducts = useTopProducts(sales);
  const dailySales = useDailySales(sales);
  const paymentMethodSummary = usePaymentMethods(sales);

  // Financial report data
  const { purchases, isLoading: isPurchasesLoading, error: purchasesError } = usePurchaseData(dateFrom, dateTo);
  const { reparations, isLoading: isReparationsLoading, error: reparationsError } = useReparationData(dateFrom, dateTo);
  const financialSummary = useFinancialSummary(sales, purchases, reparations);
  const financialProductDetails = useFinancialProductDetails(sales, purchases);
  const financialDailyBreakdown = useFinancialDailyBreakdown(sales, purchases, reparations);
  const isFinancialLoading = isLoading || isPurchasesLoading || isReparationsLoading;
  const financialError = error || purchasesError || reparationsError;

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
  };

  const filterOptions: FilterOption[] = [
    { value: "products", label: "Productos más vendidos", icon: "📦" },
    { value: "sales", label: "Ventas por día", icon: "📈" },
    { value: "payment", label: "Métodos de pago", icon: "💳" },
    { value: "financial", label: "Reporte financiero", icon: "💰" },
  ];

  const [activeFilter, setActiveFilter] = useState<string>("products");
 
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Reportes y Análisis
            </p>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              <span className="inline sm:hidden">Estadísticas y rendimiento</span>
              <span className="hidden sm:inline">
                Estadísticas de ventas, productos populares y rendimiento del negocio
              </span>
            </p>
          </div>
          
        </div>

        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={handleDateFromChange}
          onDateToChange={handleDateToChange}
        />

        <SummaryCards
          isLoading={isLoading}
          salesSummary={salesSummary}
          dailySales={dailySales}
        />

        {error && <ErrorCard message={error} />}

        <div>
          <FilterTabs
            options={filterOptions}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            className="mb-4"
          />

          {activeFilter === "products" && (
            <>
              <TopProductsChart
                isLoading={isLoading}
                hasData={sales.length > 0}
                topProducts={topProducts}
              />

              {!isLoading && <TopProductsTable topProducts={topProducts} />}
            </>
          )}

          {activeFilter === "sales" && (
            <>
              <DailySalesChart
                isLoading={isLoading}
                hasData={sales.length > 0}
                dailySales={dailySales}
              />

              {!isLoading && <DailySalesTable dailySales={dailySales} />}
            </>
          )}

          {activeFilter === "payment" && (
            <PaymentMethodChart
              isLoading={isLoading}
              hasData={sales.length > 0}
              paymentMethodSummary={paymentMethodSummary}
            />
          )}

          {activeFilter === "financial" && (
            <>
              {financialError && <ErrorCard message={financialError} />}

              <FinancialOverview
                isLoading={isFinancialLoading}
                summary={financialSummary}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />

              <div className="mt-4">
                <FinancialSummaryCards
                  isLoading={isFinancialLoading}
                  summary={financialSummary}
                />
              </div>

              <div className="mt-4">
                <FinancialChart
                  isLoading={isFinancialLoading}
                  hasData={sales.length > 0 || purchases.length > 0 || reparations.length > 0}
                  summary={financialSummary}
                  dailyBreakdown={financialDailyBreakdown}
                />
              </div>

              {!isFinancialLoading && (
                <FinancialDetailsTable
                  sales={sales}
                  purchases={purchases}
                  reparations={reparations}
                  productDetails={financialProductDetails}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
