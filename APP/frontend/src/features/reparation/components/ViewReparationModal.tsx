import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import type { ReparationView } from "@/shared/types/modelTypes/Reparation";
import GraphPatternInput from "@/shared/components/GraphPatternInput";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reparation: ReparationView | null;
}

const ViewReparationModal = ({ isOpen, onClose, reparation }: Props) => {
  if (!reparation) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      repairing: "En Reparación",
      completed: "Completado",
      delivered: "Entregado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      repairing: "bg-yellow-500",
      completed: "bg-blue-500",
      delivered: "bg-green-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const isGraphPattern = Array.isArray(reparation.password);
  const isTextPassword = typeof reparation.password === "string";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Detalles de la Reparación</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Estado</h3>
            <Badge className={`${getStatusColor(reparation.status)} text-white`}>
              {getStatusLabel(reparation.status)}
            </Badge>
          </div>

          {/* Cliente */}
          {reparation.clientData && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Cliente</h3>
              <p className="text-base">{reparation.clientData.name}</p>
              {reparation.clientData.phone && (
                <p className="text-sm text-gray-600">{reparation.clientData.phone}</p>
              )}
            </div>
          )}

          {/* Modelo */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Modelo del Dispositivo</h3>
            <p className="text-base">{reparation.model}</p>
          </div>

          {/* Descripción */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Descripción del Problema</h3>
            <p className="text-base whitespace-pre-wrap">{reparation.description}</p>
          </div>

          {/* Estado al Recibir */}
          {reparation.stateReceived && reparation.stateReceived.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Estado al Recibir</h3>
              <div className="flex flex-wrap gap-2">
                {reparation.stateReceived.map((state, index) => (
                  <Badge key={index} variant="outline">
                    {state}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contraseña */}
          {reparation.password && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Contraseña/Patrón</h3>
              {isGraphPattern && (
                <div className="flex justify-center">
                  <GraphPatternInput
                    value={reparation.password as number[]}
                    disabled={true}
                    size="sm"
                  />
                </div>
              )}
              {isTextPassword && (
                <p className="text-base font-mono bg-gray-100 px-3 py-2 rounded">
                  {reparation.password}
                </p>
              )}
            </div>
          )}

          {/* Costos */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Información de Pago</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Costo Total</p>
                <p className="text-lg font-semibold">Bs. {reparation.totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Anticipo</p>
                <p className="text-lg font-semibold text-green-600">
                  Bs. {reparation.advanceAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendiente</p>
                <p className="text-lg font-semibold text-orange-600">
                  Bs. {reparation.pendingAmount.toFixed(2)}
                </p>
              </div>
              {reparation.pendingAmount === 0 && (
                <div className="col-span-2">
                  <Badge className="bg-green-500 text-white">Pagado Completamente</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Fechas</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Fecha de Creación</p>
                <p className="text-base">{formatDate(reparation.createdAt)}</p>
              </div>
              {reparation.updatedAt && (
                <div>
                  <p className="text-sm text-gray-600">Última Actualización</p>
                  <p className="text-base">{formatDate(reparation.updatedAt)}</p>
                </div>
              )}
              {reparation.deliveredAt && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de Entrega</p>
                  <p className="text-base">{formatDate(reparation.deliveredAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewReparationModal;
