// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import type { Sale } from "@/shared/types/modelTypes/Sale";
import type { PurchaseView } from "@/shared/types/modelTypes/PurchaseBox";
import type { ReparationView } from "@/shared/types/modelTypes/Reparation";
import type { FinancialProductDetail } from "./types/Types";
import { formatCurrency, formatDate } from "@/features/sales/utils/SaleUtils";
import { productService } from "@/shared/services/ProductService";
import type { ProductView } from "@/shared/types/modelTypes/Product";

interface FinancialDetailsTableProps {
  sales: Sale[];
  purchases: PurchaseView[];
  reparations: ReparationView[];
  productDetails: FinancialProductDetail[];
}

type ActiveSection = "products" | "purchases" | "reparations" | null;

export const FinancialDetailsTable = ({
  sales: _sales,
  purchases,
  reparations,
  productDetails,
}: FinancialDetailsTableProps) => {
  const [activeSection, setActiveSection] = useState<ActiveSection>("products");
  const [productDataMap, setProductDataMap] = useState<
    Record<string, ProductView>
  >({});

  // Resolve product names
  useEffect(() => {
    const fetchProducts = async () => {
      const productIds = Array.from(
        new Set([
          ...productDetails.map((p) => p.productId),
          ...purchases.map((p) => p.productId),
        ])
      );
      const views = await Promise.all(
        productIds.map((id) => productService.findById(id))
      );
      const data: Record<string, ProductView> = {};
      productIds.forEach((id, idx) => {
        if (views[idx]) data[id] = views[idx];
      });
      setProductDataMap(data);
    };
    if (productDetails.length > 0 || purchases.length > 0) {
      fetchProducts();
    }
  }, [productDetails, purchases]);

  const toggleSection = (section: ActiveSection) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const hasNoData =
    productDetails.length === 0 &&
    purchases.length === 0 &&
    reparations.length === 0;

  if (hasNoData) return null;

  return (
    <div className="space-y-4 mt-4">
      {/* Product Profitability Table */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("products")}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Rentabilidad por Producto
            </CardTitle>
            <span className="text-gray-400 text-xl">
              {activeSection === "products" ? "▲" : "▼"}
            </span>
          </div>
        </CardHeader>
        {activeSection === "products" && (
          <CardContent>
            {productDetails.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">
                No hay datos de productos en el período
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Producto</th>
                      <th className="text-right py-2 px-2">Cant. Vendida</th>
                      <th className="text-right py-2 px-2">Ingreso (Bs)</th>
                      <th className="text-right py-2 px-2">Costo Compra</th>
                      <th className="text-right py-2 px-2">
                        Ganancia Est.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productDetails.map((product, index) => {
                      const name =
                        productDataMap[product.productId]?.name ||
                        product.productName;
                      const code =
                        productDataMap[product.productId]?.code ||
                        product.productCode;
                      return (
                        <tr
                          key={product.productId}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-2 px-2">{index + 1}</td>
                          <td className="py-2 px-2">
                            <div>
                              <span className="font-medium">{name}</span>
                              {code && (
                                <span className="text-gray-400 text-xs ml-1">
                                  ({code})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right">
                            {product.quantitySold}
                          </td>
                          <td className="py-2 px-2 text-right text-green-600">
                            {formatCurrency(product.totalRevenue, "bs")}
                          </td>
                          <td className="py-2 px-2 text-right text-red-600">
                            {product.totalCostPurchased > 0
                              ? formatCurrency(
                                  product.totalCostPurchased,
                                  "bs"
                                )
                              : "-"}
                          </td>
                          <td
                            className={`py-2 px-2 text-right font-medium ${
                              product.estimatedProfit >= 0
                                ? "text-indigo-700"
                                : "text-orange-600"
                            }`}
                          >
                            {formatCurrency(product.estimatedProfit, "bs")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-gray-50">
                      <td className="py-2 px-2" colSpan={2}>
                        Total
                      </td>
                      <td className="py-2 px-2 text-right">
                        {productDetails.reduce(
                          (sum, p) => sum + p.quantitySold,
                          0
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-green-600">
                        {formatCurrency(
                          productDetails.reduce(
                            (sum, p) => sum + p.totalRevenue,
                            0
                          ),
                          "bs"
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        {formatCurrency(
                          productDetails.reduce(
                            (sum, p) => sum + p.totalCostPurchased,
                            0
                          ),
                          "bs"
                        )}
                      </td>
                      <td
                        className={`py-2 px-2 text-right ${
                          productDetails.reduce(
                            (sum, p) => sum + p.estimatedProfit,
                            0
                          ) >= 0
                            ? "text-indigo-700"
                            : "text-orange-600"
                        }`}
                      >
                        {formatCurrency(
                          productDetails.reduce(
                            (sum, p) => sum + p.estimatedProfit,
                            0
                          ),
                          "bs"
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Purchases Detail Table */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("purchases")}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Detalle de Compras (Egresos)
            </CardTitle>
            <span className="text-gray-400 text-xl">
              {activeSection === "purchases" ? "▲" : "▼"}
            </span>
          </div>
        </CardHeader>
        {activeSection === "purchases" && (
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">
                No hay compras en el período
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Producto</th>
                      <th className="text-left py-2 px-2">Proveedor</th>
                      <th className="text-right py-2 px-2">Cantidad</th>
                      <th className="text-right py-2 px-2">Costo Unit.</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase, index) => {
                      const productName =
                        productDataMap[purchase.productId]?.name ||
                        purchase.productName ||
                        purchase.productId;
                      return (
                        <tr
                          key={purchase.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-2 px-2">{index + 1}</td>
                          <td className="py-2 px-2">
                            {formatDate(purchase.purchaseDate)}
                          </td>
                          <td className="py-2 px-2">{productName}</td>
                          <td className="py-2 px-2">
                            {purchase.supplierName || "-"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {purchase.quantity}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency(purchase.unitCost, "bs")}
                          </td>
                          <td className="py-2 px-2 text-right text-red-600 font-medium">
                            {formatCurrency(purchase.totalCost, "bs")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-gray-50">
                      <td className="py-2 px-2" colSpan={4}>
                        Total Egresos
                      </td>
                      <td className="py-2 px-2 text-right">
                        {purchases.reduce(
                          (sum, p) => sum + p.quantity,
                          0
                        )}
                      </td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2 text-right text-red-600">
                        {formatCurrency(
                          purchases.reduce((sum, p) => sum + p.totalCost, 0),
                          "bs"
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Reparations Detail Table */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection("reparations")}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Detalle de Reparaciones (Ingresos)
            </CardTitle>
            <span className="text-gray-400 text-xl">
              {activeSection === "reparations" ? "▲" : "▼"}
            </span>
          </div>
        </CardHeader>
        {activeSection === "reparations" && (
          <CardContent>
            {reparations.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">
                No hay reparaciones completadas en el período
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Modelo</th>
                      <th className="text-left py-2 px-2">Cliente</th>
                      <th className="text-left py-2 px-2">Estado</th>
                      <th className="text-right py-2 px-2">Anticipo</th>
                      <th className="text-right py-2 px-2">Pendiente</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reparations.map((rep, index) => (
                      <tr key={rep.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{index + 1}</td>
                        <td className="py-2 px-2">
                          {formatDate(rep.createdAt)}
                        </td>
                        <td className="py-2 px-2">{rep.model}</td>
                        <td className="py-2 px-2">
                          {rep.clientData?.name || rep.clientId}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              rep.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {rep.status === "delivered"
                              ? "Entregado"
                              : "Completado"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          {formatCurrency(rep.advanceAmount, "bs")}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {formatCurrency(rep.pendingAmount, "bs")}
                        </td>
                        <td className="py-2 px-2 text-right text-blue-600 font-medium">
                          {formatCurrency(rep.totalCost, "bs")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-gray-50">
                      <td className="py-2 px-2" colSpan={5}>
                        Total Reparaciones
                      </td>
                      <td className="py-2 px-2 text-right">
                        {formatCurrency(
                          reparations.reduce(
                            (sum, r) => sum + r.advanceAmount,
                            0
                          ),
                          "bs"
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {formatCurrency(
                          reparations.reduce(
                            (sum, r) => sum + r.pendingAmount,
                            0
                          ),
                          "bs"
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-blue-600">
                        {formatCurrency(
                          reparations.reduce(
                            (sum, r) => sum + r.totalCost,
                            0
                          ),
                          "bs"
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
