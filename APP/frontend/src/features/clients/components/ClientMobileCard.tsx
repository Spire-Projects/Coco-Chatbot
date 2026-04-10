import { memo } from "react";
import { Mail, Phone, MapPin, Edit, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { ClientView } from "@/shared/types/Client";

interface ClientMobileCardProps {
  client: ClientView;
  onEdit?: (client: ClientView) => void;
  onDelete?: (client: ClientView) => void;
}

/**
 * Componente de tarjeta móvil para clientes
 * Memoizado para evitar re-renders innecesarios cuando los datos del cliente no cambian
 */
export const ClientMobileCard = memo(({ client, onEdit, onDelete }: ClientMobileCardProps) => {
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{client.name}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(client)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(client)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="truncate">{client.email || "Sin email"}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <span>{client.phone || "Sin teléfono"}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="truncate">{client.address || "Sin dirección"}</span>
        </div>
      </div>
    </div>
  );
});

ClientMobileCard.displayName = "ClientMobileCard";
