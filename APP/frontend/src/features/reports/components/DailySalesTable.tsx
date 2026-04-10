import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/services/BatchService";
import { formatDateSafe } from "@/shared/utils/date.utils";
import type { DailySales } from "./types/Types";

interface DailySalesTableProps {
  dailySales: DailySales[];
}

export const DailySalesTable = ({ dailySales }: DailySalesTableProps) => {
  if (dailySales.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Detalle de ventas por día</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Fecha</th>
                <th className="text-right py-2 px-2">Ventas BS</th>

                <th className="text-right py-2 px-2">Transacciones</th>
              </tr>
            </thead>
            <tbody>
              {dailySales.map((day) => (
                <tr key={day.date} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">
                    {formatDateSafe(day.date)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {formatCurrency(day.totalBs)} Bs
                  </td>
               
                  <td className="py-2 px-2 text-right">{day.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

