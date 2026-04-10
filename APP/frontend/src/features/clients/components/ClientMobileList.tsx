import { memo } from "react";
import { UserCog } from "lucide-react";
import { ClientMobileCard } from "./ClientMobileCard";
import type { ClientView } from "@/shared/types/Client";

interface ClientMobileListProps {
  clients: ClientView[];
  loading: boolean;
  searchQuery: string;
  onEdit?: (client: ClientView) => void;
  onDelete?: (client: ClientView) => void;
}

export const ClientMobileList = memo<ClientMobileListProps>(({ clients, loading, searchQuery, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="md:hidden flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Cargando clientes...</span>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="md:hidden text-center py-8 text-gray-500">
        <UserCog className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No hay clientes registrados</p>
        <p className="text-sm">
          {searchQuery
            ? "No se encontraron clientes con ese criterio"
            : "Comienza agregando tu primer cliente"}
        </p>
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-4">
      {clients.map((client) => (
        <ClientMobileCard
          key={client.id}
          client={client}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

ClientMobileList.displayName = "ClientMobileList";
