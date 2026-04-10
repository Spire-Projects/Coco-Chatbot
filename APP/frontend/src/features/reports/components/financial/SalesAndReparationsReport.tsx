import { Card, CardContent } from "@/shared/components/ui/card";
import type { FinancialSummary } from "../types/Types";
import { formatCurrency } from "@/features/sales/utils/SaleUtils";

interface SalesAndReparationsReportProps {
  summary: FinancialSummary;
  dateFrom: string;
  dateTo: string;
}

export const SalesAndReparationsReport = ({
  summary,
  dateFrom,
  dateTo,
}: SalesAndReparationsReportProps) => {
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Card className="border-2 border-green-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="border-b-2 border-gray-200 pb-3">
            <h3 className="text-lg font-bold text-gray-900">
              💰 VENTAS Y REPARACIONES
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Del {formatDisplayDate(dateFrom)} al {formatDisplayDate(dateTo)}
            </p>
          </div>

          {/* Resumen de Ingresos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              📊 RESUMEN
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ventas:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(summary.salesIncome, "bs")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reparaciones:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(summary.reparationIncome, "bs")}
                </span>
              </div>
              <div className="border-t-2 border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-800">
                    Total Ingresos:
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatCurrency(summary.totalIncome, "bs")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de Ventas */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              🛒 DETALLE DE VENTAS
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

          {/* Detalle de Reparaciones */}
          {summary.reparationsCount > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                🔧 DETALLE DE REPARACIONES
              </h4>
              <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    Total reparaciones:
                  </span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(summary.reparationIncome, "bs")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    Número de reparaciones:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {summary.reparationsCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    Promedio por reparación:
                  </span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(
                      summary.reparationIncome / summary.reparationsCount,
                      "bs"
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
