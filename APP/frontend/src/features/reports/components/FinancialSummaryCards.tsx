import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { FinancialSummary } from "./types/Types";
import { formatCurrency } from "@/features/sales/utils/SaleUtils";

interface FinancialSummaryCardsProps {
  isLoading: boolean;
  summary: FinancialSummary;
}

export const FinancialSummaryCards = ({
  isLoading,
  summary,
}: FinancialSummaryCardsProps) => {
  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Sales Income */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Ingresos Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.salesIncome, "bs")}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {summary.salesCount} ventas totales
          </p>
        </CardContent>
      </Card>

      {/* Reparation Income */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Ingresos Reparaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.reparationIncome, "bs")}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {summary.reparationsCount} reparaciones completadas
          </p>
        </CardContent>
      </Card>

      {/* Purchase Expenses */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Egresos (Compras)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.purchaseExpenses, "bs")}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {summary.purchasesCount} compras realizadas
          </p>
        </CardContent>
      </Card>

      {/* Net Profit */}
      <Card
        className={`border-l-4 ${
          summary.netProfit >= 0
            ? "border-l-indigo-600"
            : "border-l-orange-500"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Ganancia Neta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div
              className={`text-2xl font-bold ${
                summary.netProfit >= 0
                  ? "text-indigo-700"
                  : "text-orange-600"
              }`}
            >
              {formatCurrency(summary.netProfit, "bs")}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Margen: {summary.profitMargin.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
