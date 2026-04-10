import { memo, useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Plus, Search } from "lucide-react";

interface ClientSearchControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateClick: () => void;
}

/**
 * Controles de búsqueda y botón de crear cliente
 * Memoizado para evitar re-renders innecesarios
 * Usa estado local para el input para máxima responsividad
 */
export const ClientSearchControls = memo<ClientSearchControlsProps>(({
  searchTerm,
  onSearchChange,
  onCreateClick
}) => {
  // Estado local para el input - esto hace que el typing sea instantáneo
  const [localValue, setLocalValue] = useState(searchTerm);

  // Debounce interno para comunicar cambios al padre
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== searchTerm) {
        onSearchChange(localValue);
      }
    }, 300); // Debounce más agresivo (300ms en lugar de 500ms)

    return () => {
      clearTimeout(handler);
    };
  }, [localValue, onSearchChange, searchTerm]);

  // Sincronizar cuando el padre cambie el searchTerm externamente
  useEffect(() => {
    if (searchTerm !== localValue) {
      setLocalValue(searchTerm);
    }
  }, [searchTerm]); // Solo sincronizar cuando searchTerm cambie desde el padre

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por nombre o NIT..."
          value={localValue}
          onChange={handleInputChange}
          className="pl-10"
        />
      </div>
      <Button onClick={onCreateClick} className="whitespace-nowrap">
        <Plus className="w-4 h-4 mr-2" />
        Agregar Cliente
      </Button>
    </div>
  );
});                                                                                                                     

ClientSearchControls.displayName = "ClientSearchControls";
