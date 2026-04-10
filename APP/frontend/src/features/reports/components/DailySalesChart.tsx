import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Line } from "react-chartjs-2";
import type { DailySales } from "./types/Types";
import { formatDateSafe } from "@/shared/utils/date.utils";

interface DailySalesChartProps {
  isLoading: boolean;
  hasData: boolean;
  dailySales: DailySales[];
}

export const DailySalesChart = ({
  isLoading,
  hasData,
  dailySales,
}: DailySalesChartProps) => {
  const chartData = {
    labels: dailySales.map((d) => formatDateSafe(d.date)),
    datasets: [
      {
        label: "Ventas en BS",
        data: dailySales.map((d) => d.totalBs),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        tension: 0.3,
      },
     
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución de ventas diarias</CardTitle>
        <CardDescription>
          Total de ventas por día separadas por moneda
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : !hasData ? (
          <p className="text-gray-500 py-12 text-center">
            No hay datos de ventas en el período seleccionado
          </p>
        ) : (
          <div className="h-[400px]">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: { mode: "index" },
                  legend: { display: true },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: "Monto de ventas",
                    },
                  },
                },
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

