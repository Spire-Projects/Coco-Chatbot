import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle, Calendar } from "lucide-react";
import type { ReparationView, StatusReparation } from "@/shared/types/modelTypes/Reparation";

interface Props {
  reparation: ReparationView | null;
  nextStatus: StatusReparation | null;
  nextStatusLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isUpdating: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'repairing':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">En Reparación</Badge>;
    case 'completed':
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Completado</Badge>;
    case 'delivered':
      return <Badge variant="outline" className="border-green-500 text-green-600">Entregado</Badge>;
    default:
      return <Badge variant="secondary">Desconocido</Badge>;
  }
};

const StatusChangeModal = ({ reparation, nextStatus, nextStatusLabel, open, onOpenChange, onConfirm, isUpdating }: Props) => {
  const [deliveryDate] = useState(new Date().toISOString().split('T')[0]);

  if (!reparation || !nextStatus) return null;

  const isMarkingAsDelivered = nextStatus === 'delivered';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Confirmar cambio de estado
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas marcar esta reparación como{" "}
            <span className="font-semibold">{nextStatusLabel}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información de la reparación */}
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Cliente:</span> {reparation.clientData?.name || 'Sin cliente'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Modelo:</span> {reparation.model}
            </p>
            <p className="text-sm flex items-center gap-2">
              <span className="font-medium">Estado actual:</span> {getStatusBadge(reparation.status)}
            </p>
          </div>

          {/* Campo de fecha para estado "entregado" */}
          {isMarkingAsDelivered && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Fecha de entrega</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate" className="text-xs text-gray-600">
                  La fecha de entrega se registrará automáticamente:
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  disabled
                  className="bg-white cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">
                  Esta fecha indica cuándo el dispositivo fue entregado al cliente.
                </p>
              </div>
            </div>
          )}

          {/* Advertencia de pago pendiente al entregar */}
          {isMarkingAsDelivered && reparation.pendingAmount > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Nota:</span> Esta reparación aún tiene un monto pendiente de{" "}
                <span className="font-bold">
                  {new Intl.NumberFormat('es-BO', {
                    style: 'currency',
                    currency: 'BOB',
                  }).format(reparation.pendingAmount)}
                </span>
                . Asegúrate de haber recibido el pago antes de marcarla como entregada.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isUpdating}
            className={isMarkingAsDelivered ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isUpdating ? "Actualizando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusChangeModal;
