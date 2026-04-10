import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import type { TopProductItem } from "./types/Types";
import { productService } from "@/shared/services/ProductService";
import { useEffect, useState } from "react";
import type { ProductView } from "@/shared/types/modelTypes/Product";

interface TopProductsTableProps {
  topProducts: TopProductItem[];
}

export const TopProductsTable = ({ topProducts }: TopProductsTableProps) => {
  if (topProducts.length === 0) return null;
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

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">
          Detalle de productos más vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Producto</th>
                <th className="text-right py-2 px-2">Cantidad</th>
              
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr
                  key={product.productId}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="py-2 px-2">{index + 1}</td>
                  <td className="py-2 px-2">{productDataMap[product.productId]?.name || product.name}</td>
                  <td className="py-2 px-2 text-right">{product.quantity}</td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
