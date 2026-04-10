import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { DollarSign, AlertCircle } from "lucide-react";
import type { ReparationView } from "@/shared/types/modelTypes/Reparation";

interface Props {
  reparation: ReparationView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (advanceAmount: number, pendingAmount: number) => Promise<void>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(amount);
};

const PaymentAdjustmentModal = ({ reparation, open, onOpenChange, onConfirm }: Props) => {
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (reparation && open) {
      setAdvanceAmount(reparation.advanceAmount);
      setPendingAmount(reparation.pendingAmount);
      setError("");
    }
  }, [reparation, open]);

  const handleAdvanceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setAdvanceAmount(numValue);
    
    // Validación: no puede ser menor al monto ya pagado
    if (reparation && numValue < reparation.advanceAmount) {
      setError("No puedes disminuir el monto ya pagado");
      return;
    }

    // Validación: no puede exceder el costo total
    if (reparation && numValue > reparation.totalCost) {
      setError("El anticipo no puede exceder el costo total");
      return;
    }

    setError("");
    // Calcular pendiente automáticamente
    if (reparation) {
      setPendingAmount(reparation.totalCost - numValue);
    }
  };

  const handlePendingChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (reparation) {
      const calculatedAdvance = reparation.totalCost - numValue;
      
      // Validación: el anticipo calculado no puede ser menor al ya pagado
      if (calculatedAdvance < reparation.advanceAmount) {
        setError("No puedes disminuir el monto ya pagado");
        return;
      }

      // Validación: pendiente no puede ser negativo
      if (numValue < 0) {
        setError("El monto pendiente no puede ser negativo");
        return;
      }

      setError("");
      setPendingAmount(numValue);
      setAdvanceAmount(calculatedAdvance);
    }
  };

  const handleMarkAsFullyPaid = () => {
    if (!reparation) return;
    
    setAdvanceAmount(reparation.totalCost);
    setPendingAmount(0);
    setError("");
  };

  const handleConfirm = async () => {
    if (!reparation) return;

    // Validación final
    if (advanceAmount < reparation.advanceAmount) {
      setError("No puedes disminuir el monto ya pagado");
      return;
    }

    if (advanceAmount + pendingAmount !== reparation.totalCost) {
      setError("La suma del anticipo y pendiente debe ser igual al costo total");
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(advanceAmount, pendingAmount);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al ajustar pagos:", error);
      setError("Error al guardar los cambios");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!reparation) return null;

  const hasChanges = 
    advanceAmount !== reparation.advanceAmount || 
    pendingAmount !== reparation.pendingAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Ajustar Pagos
          </DialogTitle>
          <DialogDescription>
            Ajusta los montos de anticipo y pendiente para esta reparación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del cliente y modelo */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            <p className="text-sm">
              <span className="font-medium">Cliente:</span> {reparation.clientData?.name || 'Sin cliente'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Modelo:</span> {reparation.model}
            </p>
            <p className="text-sm">
              <span className="font-medium">Costo Total:</span>{" "}
              <span className="font-semibold text-blue-600">{formatCurrency(reparation.totalCost)}</span>
            </p>
          </div>

          {/* Valores originales */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg space-y-1">
            <p className="text-xs font-medium text-blue-700">Valores actuales:</p>
            <div className="flex justify-between text-sm">
              <span>Anticipo:</span>
              <span className="font-semibold">{formatCurrency(reparation.advanceAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pendiente:</span>
              <span className="font-semibold">{formatCurrency(reparation.pendingAmount)}</span>
            </div>
          </div>

          {/* Botón de pago completo */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-green-500 text-green-700 hover:bg-green-50"
            onClick={handleMarkAsFullyPaid}
            disabled={pendingAmount === 0}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Marcar como Pago Completo
          </Button>

          {/* Campos de edición */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="advanceAmount">Monto depositado (Bs.)</Label>
              <Input
                id="advanceAmount"
                type="number"
                step="0.01"
                min={reparation.advanceAmount}
                max={reparation.totalCost}
                value={advanceAmount}
                onChange={(e) => handleAdvanceChange(e.target.value)}
                className="text-right font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pendingAmount">Pendiente (Bs.)</Label>
              <Input
                id="pendingAmount"
                type="number"
                step="0.01"
                min={0}
                max={reparation.totalCost - reparation.advanceAmount}
                value={pendingAmount}
                onChange={(e) => handlePendingChange(e.target.value)}
                className="text-right font-semibold"
              />
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Resumen de cambios */}
          {hasChanges && !error && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg space-y-1">
              <p className="text-xs font-medium text-green-700">Nuevos valores:</p>
              <div className="flex justify-between text-sm">
                <span>Anticipo:</span>
                <span className="font-semibold">{formatCurrency(advanceAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pendiente:</span>
                <span className="font-semibold">{formatCurrency(pendingAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !!error || !hasChanges}
          >
            {isProcessing ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentAdjustmentModal;
