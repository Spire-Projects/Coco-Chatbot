import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { DailySales, SalesSummary } from "./types/Types";
import { formatCurrency } from "@/features/sales/utils/SaleUtils";

interface SummaryCardsProps {
  isLoading: boolean;
  salesSummary: SalesSummary;
  dailySales: DailySales[];
}

export const SummaryCards = ({
  isLoading,
  salesSummary,
  dailySales,
}: SummaryCardsProps) => {
  const avgDailyBs = dailySales.length > 0 
    ? salesSummary.totalBs / dailySales.length 
    : 0;
 

  return (
  <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
    
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Ventas Totales BS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="text-2xl font-bold">
              {formatCurrency(salesSummary.totalBs, 'bs')} 
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {salesSummary.count} ventas totales
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Promedio por Venta BS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="text-2xl font-bold">
              {formatCurrency(salesSummary.averageBs, 'bs')} 
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Por transacción</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Promedio Diario BS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="text-2xl font-bold">
              {formatCurrency(avgDailyBs, 'bs')}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Promedio por día</p>
        </CardContent>
      </Card>

    </div>
  );
};
