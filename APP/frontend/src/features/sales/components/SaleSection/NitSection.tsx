import { memo, useState, useEffect } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Receipt, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import CreatableSelect from "@/shared/components/CreatableSelect";
import { CreateNitDialog } from "./CreateNitDialog.tsx";
import { searchNits, createNit as createNitService, getAllNits } from "@/shared/services/NitService";
import type { NIT } from "@/shared/types/Nit";

interface NitSectionProps {
  selectedNitClient?: string;
  selectedSocialReasonClient?: string;
  onNitSelect: (nit: NIT | null) => void;
  disabled?: boolean;
}

const NitSection = memo(({ 
  selectedNitClient, 
  selectedSocialReasonClient, 
  onNitSelect,
  disabled = false 
}: NitSectionProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedNit, setSelectedNit] = useState<NIT | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [initialNits, setInitialNits] = useState<NIT[]>([]);

  // Cargar NITs iniciales al montar
  useEffect(() => {
    const fetchInitialNits = async () => {
      try {
        const nits = await getAllNits();
        
        setInitialNits(nits);
      } catch (error) {
        console.error("Error cargando NITs iniciales:", error);
      }
    };
    fetchInitialNits();
  }, []);

  // Función de búsqueda para el CreatableSelect
  const searchNitsFunction = async (query: string): Promise<NIT[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return await searchNits(query);
  };

  // Manejar selección de NIT
  const handleNitSelect = (nit: NIT) => {
    setSelectedNit(nit);
    onNitSelect(nit);
  };

  // Manejar creación de nuevo NIT desde el select
  const handleCreateNitFromSelect = async (_searchTerm: string): Promise<NIT> => {
    // Abrir el diálogo para crear un NIT completo
    setShowCreateDialog(true);
    throw new Error('Usar diálogo para crear NIT completo');
  };

  // Manejar creación de nuevo NIT desde el diálogo
  const handleCreateNit = async (numberNit: string, socialReason: string) => {
    try {
      const newNit = await createNitService({ numberNit, socialReason });
      setSelectedNit(newNit);
      onNitSelect(newNit);
      setShowCreateDialog(false);
      return newNit;
    } catch (error) {
      console.error('Error creando NIT:', error);
      throw error;
    }
  };

  // Limpiar selección
  const handleClearSelection = () => {
    setSelectedNit(null);
    onNitSelect(null);
  };

  const hasSelection = selectedNitClient && selectedSocialReasonClient;

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
                <Receipt className="h-4 w-4" />
                <span className="text-sm font-medium">NIT (opcional)</span>
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
            <CardContent className="pt-0 pr-2 pl-2">
              {hasSelection ? (
                // Mostrar NIT seleccionado
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-blue-900">{selectedSocialReasonClient}</p>
                        <p className="text-sm text-blue-700">NIT: {selectedNitClient}</p>
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
                // Selector de NIT
                <div className="space-y-3">
                  <div className="space-y-2">
                    <CreatableSelect<NIT>
                      label="Buscar NIT"
                      values={initialNits}
                      selectedValue={selectedNit}
                      onChange={handleNitSelect}
                      searchFunction={searchNitsFunction}
                      onAddValue={handleCreateNitFromSelect}
                      displayField="socialReason"
                      valueField="id"
                      secondaryDisplayField="numberNit"
                      secondaryLabel="NIT:"
                      placeholder="Buscar por número de NIT o razón social..."
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
                      Nuevo NIT
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Diálogo para crear nuevo NIT */}
      <CreateNitDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onNitCreated={handleCreateNit}
      />
    </>
  );
});

NitSection.displayName = 'NitSection';

export default NitSection;
