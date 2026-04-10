// @ts-nocheck
import { memo, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { DollarSign, CheckCircle2, X } from "lucide-react";
import type { SaleState } from "@/shared/types/modelTypes/Sale";
import { useExchangeRateStore } from "@/shared/store/exchangeRateStore";
 import { formatCurrency, canConfirmSale } from "../../utils/SaleUtils";
import Decimal from "decimal.js";

interface SaleSummarySectionProps {
  saleState: SaleState;
  onClientDiscountChange: (type: "percentage" | "fixed", value: number) => void;
  onConfirmSale: () => void;
  onSaveQuotation?: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const SaleSummarySection = memo(
  ({
    saleState,
    onClientDiscountChange,
    onConfirmSale,
    onCancel,
    isProcessing = false,
  }: SaleSummarySectionProps) => {
    const [discountEditMode, setDiscountEditMode] = useState(false);
    const [tempDiscountType, setTempDiscountType] = useState<
      "percentage" | "fixed"
    >(saleState.clientDiscountType);
    const [tempDiscountValue, setTempDiscountValue] = useState(
      saleState.clientDiscountValue
    );
    const exchangeRate = useExchangeRateStore((s) => s.currentRate);

    // Aplicar descuento personalizado
    const handleApplyDiscount = () => {
      if (tempDiscountType === "fixed" && saleState.paymentCurrency === 'arg' && exchangeRate) {
        // Ajustar el valor fijo a moneda base (Bs) antes de enviarlo
        const adjustedValue = tempDiscountValue * exchangeRate;
        onClientDiscountChange(tempDiscountType, adjustedValue);
      } else {
        onClientDiscountChange(tempDiscountType, tempDiscountValue);
      }
      //
      setDiscountEditMode(false);
    };

    useEffect(() => {
      handleApplyDiscount();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saleState.paymentCurrency]);

    

    // Cancelar edición
    const handleCancelDiscount = () => {
      setTempDiscountType(saleState.clientDiscountType);
      setTempDiscountValue(saleState.clientDiscountValue);
      setDiscountEditMode(false);
    };

    // Utilidades externas
   


    const printSaleState = () => {
      console.log("SaleState printed:", saleState);
      return "";
    };
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen de Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subtotal sin descuentos */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>

              <span className="font-medium">
                {formatCurrency(
                  saleState.paymentCurrency === "arg"
                    ? new Decimal(saleState.subtotal).div(exchangeRate || 1).toNumber()
                    : saleState.subtotal,
                  saleState.paymentCurrency
                )}
              </span>
            </div>
          </div>

          <Separator />

          {/* Descuento adicional del cliente */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Descuento cliente:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiscountEditMode(!discountEditMode)}
                disabled={isProcessing}
                className="h-7 text-xs"
              >
                {discountEditMode
                  ? "Cancelar"
                  : saleState.clientDiscountValue > 0
                  ? "Modificar"
                  : "Agregar"}
              </Button>
            </div>

            {/* Mostrar descuento actual */}
            {!discountEditMode && saleState.clientDiscountValue > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>
                  {saleState.clientDiscountType === "percentage"
                    ? `${saleState.clientDiscountValue}%`
                    : formatCurrency(
                        saleState.paymentCurrency === "arg" ? saleState.clientDiscountValue/exchangeRate :saleState.clientDiscountValue,
                        saleState.paymentCurrency
                      )}
                </span>
                <span>
                  {printSaleState()}
                  -
                    {formatCurrency(
                      saleState.clientDiscountType === "percentage"
                        ? (saleState.paymentCurrency === "arg"
                            ? saleState.subtotal / (exchangeRate || 1)
                            : saleState.subtotal) * (saleState.clientDiscountValue / 100)
                        : saleState.paymentCurrency === "arg"
                          ? saleState.clientDiscountValue / exchangeRate
                          : saleState.clientDiscountValue,
                      saleState.paymentCurrency
                    )}
                </span>
              </div>
            )}

            {/* Controles de edición del descuento */}
            {discountEditMode && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex gap-2">
                  <Select
                    value={tempDiscountType}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setTempDiscountType(value)
                    }
                    disabled={isProcessing}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">
                        {saleState.paymentCurrency === "arg" ? "USD" : "Bs"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={tempDiscountValue === 0 ? "" : tempDiscountValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setTempDiscountValue(0);
                      } else {
                        setTempDiscountValue(parseFloat(value) || 0);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") {
                        setTempDiscountValue(0);
                      }
                    }}
                    disabled={isProcessing}
                    min={0}
                    max={
                      tempDiscountType === "percentage"
                        ? 100
                        : saleState.subtotal
                    }
                    step={0.01}
                    className="flex-1 h-9"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelDiscount}
                    disabled={isProcessing}
                    className="flex-1 h-8"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplyDiscount}
                    disabled={isProcessing}
                    className="flex-1 h-8"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Total final */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">TOTAL A PAGAR:</span>
              <span className="text-lg font-bold text-green-600">
                {
                
                formatCurrency(
                  saleState.paymentCurrency === "arg"
                    ? new Decimal(saleState.total).div(exchangeRate || 1).toNumber()
                    : saleState.total,
                  saleState.paymentCurrency
                )}
              </span>
            </div>

            {/* Información de método de pago */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Método de pago:</span>
              <span className="capitalize">{saleState.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Moneda:</span>
              <span className="uppercase">{saleState.paymentCurrency}</span>
            </div>
          </div>

          <Separator />

          {/* Botones de acción */}
          <div className="space-y-2">
            <Button
              onClick={onConfirmSale}
              disabled={!canConfirmSale}
              className="w-full h-11 text-base font-medium"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Confirmar Venta
                </>
              )}
            </Button>

            
            <Button
              onClick={onCancel}
              disabled={isProcessing}
              variant="outline"
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
          {saleState.items.length === 0 && (
            <div className="text-xs text-center text-gray-500 bg-yellow-50 p-2 rounded">
              Agrega productos para continuar
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

SaleSummarySection.displayName = "SaleSummarySection";

export default SaleSummarySection;
