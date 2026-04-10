import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Bar } from "react-chartjs-2";
import type { FinancialSummary, FinancialDailyBreakdown } from "./types/Types";

interface FinancialChartProps {
  isLoading: boolean;
  hasData: boolean;
  summary: FinancialSummary;
  dailyBreakdown: FinancialDailyBreakdown[];
}

export const FinancialChart = ({
  isLoading,
  hasData,
  summary,
  dailyBreakdown,
}: FinancialChartProps) => {
  // Summary bar chart: income vs expenses overview
  const summaryChartData = {
    labels: [
      "Ventas",
      "Reparaciones",
      "Compras (Egresos)",
      "Ganancia Neta",
    ],
    datasets: [
      {
        label: "Monto",
        data: [
          summary.salesIncome,
          summary.reparationIncome,
          -summary.purchaseExpenses,
          summary.netProfit,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.7)",   // green - sales
          "rgba(59, 130, 246, 0.7)",   // blue - reparations
          "rgba(239, 68, 68, 0.7)",    // red - expenses
          summary.netProfit >= 0
            ? "rgba(99, 102, 241, 0.7)"  // indigo - profit
            : "rgba(249, 115, 22, 0.7)", // orange - loss
        ],
        borderColor: [
          "rgb(34, 197, 94)",
          "rgb(59, 130, 246)",
          "rgb(239, 68, 68)",
          summary.netProfit >= 0
            ? "rgb(99, 102, 241)"
            : "rgb(249, 115, 22)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Daily breakdown chart
  const dailyChartData = {
    labels: dailyBreakdown.map((d) => {
      const date = new Date(d.date + "T12:00:00");
      return date.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
      });
    }),
    datasets: [
      {
        label: "Ingresos",
        data: dailyBreakdown.map((d) => d.income + d.reparationIncome),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: dailyBreakdown.map((d) => -d.expenses),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* Summary Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
          <CardDescription>
            Comparación de ingresos, egresos y ganancia neta en el período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="w-full h-[300px] flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          ) : !hasData ? (
            <p className="text-gray-500 py-12 text-center">
              No hay datos financieros en el período seleccionado
            </p>
          ) : (
            <div className="h-[350px]">
              <Bar
                data={summaryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const value = context.raw as number;
                          const abs = Math.abs(value).toFixed(2);
                          return value < 0
                            ? `Egreso: Bs ${abs}`
                            : `Monto: Bs ${abs}`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: "Monto (Bs)",
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown Chart */}
      {dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flujo Diario</CardTitle>
            <CardDescription>
              Ingresos y egresos por día en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : (
              <div className="h-[350px]">
                <Bar
                  data={dailyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "top" },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const value = context.raw as number;
                            const abs = Math.abs(value).toFixed(2);
                            return `${context.dataset.label}: Bs ${abs}`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: { stacked: false },
                      y: {
                        title: {
                          display: true,
                          text: "Monto (Bs)",
                        },
                      },
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
