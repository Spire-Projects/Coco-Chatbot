import { Card, CardContent } from "@/shared/components/ui/card";
import type { FinancialSummary } from "../types/Types";
import { formatCurrency } from "@/features/sales/utils/SaleUtils";

interface SalesAndPurchasesReportProps {
  summary: FinancialSummary;
  dateFrom: string;
  dateTo: string;
}

export const SalesAndPurchasesReport = ({
  summary,
  dateFrom,
  dateTo,
}: SalesAndPurchasesReportProps) => {
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const netProfit = summary.salesIncome - summary.purchaseExpenses;
  const profitMargin =
    summary.salesIncome > 0
      ? ((netProfit / summary.salesIncome) * 100).toFixed(1)
      : "0.0";

  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="border-b-2 border-gray-200 pb-3">
            <h3 className="text-lg font-bold text-gray-900">
              📦 VENTAS Y COMPRAS DE PRODUCTOS
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Del {formatDisplayDate(dateFrom)} al {formatDisplayDate(dateTo)}
            </p>
          </div>

          {/* Resumen */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              📊 RESUMEN
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ingresos (Ventas):</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(summary.salesIncome, "bs")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Egresos (Compras):</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(summary.purchaseExpenses, "bs")}
                </span>
              </div>
              <div className="border-t-2 border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-800">
                    Utilidad Neta:
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      netProfit >= 0 ? "text-indigo-700" : "text-orange-600"
                    }`}
                  >
                    {formatCurrency(netProfit, "bs")}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Margen:</span>
                  <span className="font-semibold text-gray-800">
                    {profitMargin}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de Ventas */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              💰 DETALLE DE VENTAS
            </h4>
            <div className="space-y-2 bg-green-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Total ventas:</span>
                <span className="font-semibold text-green-700">
                  {formatCurrency(summary.salesIncome, "bs")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Número de ventas:</span>
                <span className="font-semibold text-gray-800">
                  {summary.salesCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Ticket promedio:</span>
                <span className="font-semibold text-green-700">
                  {formatCurrency(summary.averageTicket, "bs")}
                </span>
              </div>
            </div>
          </div>

          {/* Detalle de Compras */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              📦 DETALLE DE COMPRAS
            </h4>
            <div className="space-y-2 bg-red-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Total compras:</span>
                <span className="font-semibold text-red-700">
                  {formatCurrency(summary.purchaseExpenses, "bs")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">
                  Número de compras:
                </span>
                <span className="font-semibold text-gray-800">
                  {summary.purchasesCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">
                  Promedio por compra:
                </span>
                <span className="font-semibold text-red-700">
                  {summary.purchasesCount > 0
                    ? formatCurrency(
                        summary.purchaseExpenses / summary.purchasesCount,
                        "bs"
                      )
                    : "Bs 0.00"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
