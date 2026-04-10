import { memo, useState, useEffect } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { User, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import CreatableSelect from "@/shared/components/CreatableSelect";
import type { Client } from "@/shared/types/Client";
import { ClientFormDialog } from "./ClientFormDialog";
import { clientService } from "@/shared/services";


interface ClientSectionProps {
  selectedClientId?: string;
  selectedClientName?: string;
  onClientSelect: (client: Client | null) => void;
  disabled?: boolean;
}

const ClientSection = memo(({ 
  selectedClientId, 
  selectedClientName, 
  onClientSelect,
  disabled = false
}: ClientSectionProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [initialClients, setInitialClients] = useState<Client[]>([]);

  // Cargar clientes iniciales al montar
  useEffect(() => {
    const fetchInitialClients = async () => {
      try {
        const response = await clientService.getAllView(1, 10);
        setInitialClients(response.items);
      } catch (error) {
        console.error("Error cargando clientes iniciales:", error);
      }
    };
    fetchInitialClients();
  }, []);

  // Función de búsqueda para el CreatableSelect
  const searchClientsFunction = async (query: string): Promise<Client[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }
    try {
      const response = await clientService.getAllView(1, 10, query);
      return response.items;
    } catch (error) {
      console.error("Error buscando clientes:", error);
      return [];
    }
  };

  // Manejar selección de cliente
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    onClientSelect(client);
  };

  // Limpiar selección
  const handleClearSelection = () => {
    setSelectedClient(null);
    onClientSelect(null);
  };

  // Manejar creación de nuevo cliente desde el diálogo
  const handleCreateClient = async (client: Client) => {
    setSelectedClient(client);
    onClientSelect(client);
    setShowCreateDialog(false);
    setInitialClients(prev => [client, ...prev]);
  };

  const hasSelection = selectedClientId && selectedClientName;

  return (
    <>
      <Card className="!gap-1 !py-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full h-auto p-4 justify-between hover:bg-gray-50"
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Cliente</span>
                {hasSelection && (
                  <Badge variant="secondary" className="ml-2">
                    Seleccionado
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pr-2 pl-2 pt-0">
              {hasSelection ? (
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-blue-900">{selectedClientName}</p>
                        <p className="text-sm text-blue-700">Cliente seleccionado</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        disabled={disabled}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <CreatableSelect<Client>
                      label="Buscar Cliente"
                      values={initialClients}
                      selectedValue={selectedClient}
                      onChange={handleClientSelect}
                      searchFunction={searchClientsFunction}
                      displayField="name"
                      valueField="id"
                      secondaryDisplayField="email"
                      secondaryLabel="Email:"
                      placeholder="Buscar por nombre, email..."
                      disabled={disabled}
                      hideLabel={true}
                    />
                  </div>
                  <div className="flex justify-center w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateDialog(true)}
                      disabled={disabled}
                      className="!text-xs w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nuevo Cliente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      {/* Diálogo para crear nuevo Cliente */}
      <ClientFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onClientCreated={handleCreateClient}
      />
    </>
  );
});

ClientSection.displayName = 'ClientSection';

export default ClientSection;
