// @ts-nocheck
import { memo, useCallback, useState } from "react";
import ProductInfoModal from "./ProductInfoModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import CustomDialog from "@/shared/components/CustomDialog";
import CreatableSelect from "@/shared/components/CreatableSelect";
import { ShoppingCart, Trash2, Plus, Minus, Info } from "lucide-react";
import type { CartSaleItem, SaleState } from "@/shared/types/modelTypes/Sale";
import { useExchangeRateStore } from "@/shared/store/exchangeRateStore";

interface SaleItemsTableProps {
  items: CartSaleItem[];
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onUpdateItemImei: (cartItemId: string, imei: string) => void;
  onRemoveItem: (cartItemId: string) => void;
  disabled?: boolean;
  saleState?: SaleState;
}

const SaleItemsTable = memo(({
  items,
  onUpdateQuantity,
  onUpdateItemImei,
  onRemoveItem,
  disabled = false,
  saleState,
}: SaleItemsTableProps) => {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const exchangeRate = useExchangeRateStore((s) => s.currentRate);
  const handleIncrement = useCallback((item: CartSaleItem) => {
    if (item.requiresImei) return;

    if (item.quantity < item.availableStock) {
      onUpdateQuantity(item.cartItemId, item.quantity + 1);
    }
  }, [onUpdateQuantity]);

  const handleDecrement = useCallback((item: CartSaleItem) => {
    if (item.requiresImei) return;

    if (item.quantity > 1) {
      onUpdateQuantity(item.cartItemId, item.quantity - 1);
    }
  }, [onUpdateQuantity]);

  const handleQuantityChange = useCallback((item: CartSaleItem, value: string) => {
    if (item.requiresImei) {
      onUpdateQuantity(item.cartItemId, 1);
      return;
    }

    const quantity = parseInt(value) || 1;
    const validQuantity = Math.min(Math.max(quantity, 1), item.availableStock);
    onUpdateQuantity(item.cartItemId, validQuantity);
  }, [onUpdateQuantity]);

  const handleClearAll = useCallback(() => {
    items.forEach(item => onRemoveItem(item.cartItemId));
    setShowClearDialog(false);
  }, [items, onRemoveItem]);

  if (items.length === 0) {
    return (
      <Card className="min-h-152.5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Items de Venta (0)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart className="h-16 w-16 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No hay productos en el carrito</p>
            <p className="text-xs mt-1">Busca y agrega productos para comenzar la venta</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Items de Venta ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10">No.</TableHead>
                <TableHead className="min-w-50">Nombre Item</TableHead>
                <TableHead className="min-w-30">Cantidad</TableHead>
                <TableHead className="w-30">Precio Unitario</TableHead>
                <TableHead className="w-48">Subtotal / IMEI</TableHead>
                <TableHead className="w-20">Detalle</TableHead>
                <TableHead className="w-20 text-center">Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.cartItemId} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-center">
                    {index + 1}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{item.productName}</div>
                      {item.productCode && (
                        <Badge variant="outline" className="text-xs">
                          {item.productCode}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecrement(item)}
                        disabled={disabled || item.requiresImei || item.quantity <= 1}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                          type="number"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Permitir vacío temporalmente
                            if (value === "") {
                              onUpdateQuantity(item.cartItemId, 0);
                            } else {
                              handleQuantityChange(item, value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              onUpdateQuantity(item.cartItemId, 1);
                            }
                          }}
                          disabled={disabled || item.requiresImei}
                          min={1}
                          max={item.availableStock}
                          className="h-7 w-16 text-center text-sm"
                        />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIncrement(item)}
                        disabled={disabled || item.requiresImei || item.quantity >= item.availableStock}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      Stock: {item.availableStock}{item.requiresImei ? " | IMEI" : ""}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="font-medium text-green-600">
                       {saleState?.paymentCurrency === 'arg' ? 'USD ' : 'Bs '}

                       {saleState?.paymentCurrency === 'arg' ? (item.unitPrice / (exchangeRate || 1)).toFixed(2) : item.unitPrice.toFixed(2)}
                    </div>
                    
                  </TableCell>

                  <TableCell>
                    {item.requiresImei ? (
                      <div className="min-w-55">
                        <CreatableSelect<{ id: string; name: string }>
                          label=""
                          values={(item.availableImeis || []).map((imei) => ({ id: imei, name: imei }))}
                          selectedValue={
                            item.selectedImei
                              ? { id: item.selectedImei, name: item.selectedImei }
                              : null
                          }
                          onChange={(selected) => onUpdateItemImei(item.cartItemId, selected.id)}
                          searchFunction={async (query) => {
                            const normalized = query.trim().toLowerCase();
                            const imeiOptions = (item.availableImeis || []).map((imei) => ({ id: imei, name: imei }));
                            if (!normalized) return imeiOptions;
                            return imeiOptions.filter((option) =>
                              option.name.toLowerCase().includes(normalized)
                            );
                          }}
                          displayField="name"
                          valueField="id"
                          placeholder="Seleccionar IMEI"
                          hideLabel={true}
                          disabled={disabled}
                        />
                      </div>
                    ) : (
                      <div className="text-right font-bold text-blue-600">
                        {saleState?.paymentCurrency === 'arg' ? 'USD ' : 'Bs '}
                        {saleState?.paymentCurrency === 'arg' ? (item.total / (exchangeRate || 1)).toFixed(2) : item.total.toFixed(2)}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        className="p-0 m-0 bg-transparent border-none cursor-pointer"
                        aria-label="Ver detalles del producto"
                        onClick={() => {
                          setSelectedProductId(item.product);
                          setInfoModalOpen(true);
                        }}
                      >
                        <Info className="text-secondary h-5" />
                      </button>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveItem(item.cartItemId)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            disabled={disabled}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Todo
          </Button>
        </div>
      </CardContent>

      {/* Dialog de confirmación para limpiar todo */}
      <CustomDialog
        isOpen={showClearDialog}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearDialog(false)}
        title="¿Limpiar carrito?"
        description="¿Estás seguro de limpiar todos los items del carrito? Esta acción no se puede deshacer."
        textConfirm="Sí, limpiar"
        textCancel="Cancelar"
      />

      {/* Modal de información de producto */}
      {selectedProductId && (
        <ProductInfoModal
          productId={selectedProductId}
          open={infoModalOpen}
          onOpenChange={(open) => {
            setInfoModalOpen(open);
            if (!open) setSelectedProductId(null);
          }}
        />
      )}
    </Card>
  );
});

SaleItemsTable.displayName = 'SaleItemsTable';

export default SaleItemsTable;
