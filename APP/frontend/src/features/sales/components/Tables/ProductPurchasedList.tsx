import { Badge } from "@/shared/components/ui/badge";
import type { SaleView } from "@/shared/types/modelTypes/Sale";
import { formatCurrency } from "../../utils/SaleUtils";

const CONDITION_LABEL: Record<string, string> = {
  new: "Nuevo",
  pre_owned: "Seminuevo",
  used: "Usado",
};

interface ProductPurchasedListProps {
  sale: SaleView;
}

const ProductPurchasedList = ({ sale }: ProductPurchasedListProps) => {
  return (
    <div>
      <div className="font-semibold text-sm text-gray-700 mb-2">
        Productos vendidos ({sale.items.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-300 rounded-lg bg-white shadow-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 font-bold text-gray-700 border border-gray-300">Producto</th>
              <th className="text-right py-2 px-3 font-bold text-gray-700 border border-gray-300">Cantidad</th>
              <th className="text-right py-2 px-3 font-bold text-gray-700 border border-gray-300">Precio Unit.</th>
              <th className="text-right py-2 px-3 font-bold text-gray-700 border border-gray-300">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2 px-3 border border-gray-300">
                  <div className="flex flex-col">
                    <span>{item.itemName ?? (item.isDevice ? "Dispositivo" : "Accesorio")}</span>
                    {item.imei && (
                      <span className="text-xs text-gray-500">IMEI: {item.imei}</span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-right border border-gray-300">{item.quantity}</td>
                <td className="py-2 px-3 text-right border border-gray-300">{formatCurrency(item.unitPriceUsd)}</td>
                <td className="py-2 px-3 text-right font-semibold border border-gray-300">{formatCurrency(item.totalUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trade-in device */}
      {sale.tradeIn && (
        <div className="mt-3">
          <div className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
            Dispositivo recibido en Trade-in
            <Badge variant="secondary" className="text-xs">Trade-in</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-orange-200 rounded-lg bg-orange-50 shadow-sm">
              <thead>
                <tr className="bg-orange-100">
                  <th className="text-left py-2 px-3 font-bold text-gray-700 border border-orange-200">Dispositivo</th>
                  <th className="text-left py-2 px-3 font-bold text-gray-700 border border-orange-200">Condición</th>
                  <th className="text-right py-2 px-3 font-bold text-gray-700 border border-orange-200">Valor acordado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 border border-orange-200">
                    <div className="flex flex-col">
                      <span>{sale.tradeIn.variantDisplay ?? "Dispositivo"}</span>
                      {sale.tradeIn.imei && (
                        <span className="text-xs text-gray-500">IMEI: {sale.tradeIn.imei}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 border border-orange-200">
                    {sale.tradeIn.condition
                      ? CONDITION_LABEL[sale.tradeIn.condition] ?? sale.tradeIn.condition
                      : "—"}
                    {sale.tradeIn.batteryPercentage != null && (
                      <span className="ml-2 text-xs text-gray-500">
                        Batería: {sale.tradeIn.batteryPercentage}%
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-orange-700 border border-orange-200">
                    - {formatCurrency(sale.tradeIn.agreedValueUsd)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPurchasedList;
