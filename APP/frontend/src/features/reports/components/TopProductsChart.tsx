import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Bar } from "react-chartjs-2";
import { useEffect, useState } from "react";
import type { TopProductItem } from "./types/Types";
import { productService } from "@/shared/services/ProductService";
import type { ProductView } from "@/shared/types/modelTypes/Product";

interface TopProductsChartProps {
  isLoading: boolean;
  hasData: boolean;
  topProducts: TopProductItem[];
}

export const TopProductsChart = ({
  isLoading,
  hasData,
  topProducts,
}: TopProductsChartProps) => {
  const [productDataMap, setProductDataMap] = useState<Record<string, ProductView>>({});

  useEffect(() => {
    const fetchData = async () => {
      const ids = topProducts.map((p) => p.productId);
      const views = await Promise.all(ids.map((id) => productService.findById(id)));
      const data: Record<string, ProductView> = {};
      ids.forEach((id, idx) => {
        if (views[idx]) data[id] = views[idx];
      });
      setProductDataMap(data);
    };
    fetchData();
  }, [topProducts]);

  const chartData = {
    labels: topProducts.map((p) => {
      const name = productDataMap[p.productId]?.name ?? p.name;
      return name.length > 15 ? name.substring(0, 15) + "..." : name;
    }),
    datasets: [
      {
        label: "Unidades vendidas",
        data: topProducts.map((p) => p.quantity),
        backgroundColor: "rgba(53, 162, 235, 0.7)",
        borderColor: "rgb(53, 162, 235)",
        borderWidth: 1,
      },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Productos más vendidos</CardTitle>
        <CardDescription>
          Por cantidad de unidades vendidas en el período seleccionado
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
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { mode: "index" },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: "Unidades vendidas",
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
