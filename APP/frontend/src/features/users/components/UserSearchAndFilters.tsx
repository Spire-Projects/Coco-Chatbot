import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select';
import { FilterTabs, type FilterOption } from '../../../shared/components/FilterTabs';

export type UserFilter = 'all' | 'superadmin' | 'admin' | 'vendedor';

interface UserSearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: UserFilter;
  onFilterChange: (filter: UserFilter) => void;
  onNewUser: () => void;
  userCounts: Record<UserFilter, number>;
}

export const UserSearchAndFilters: React.FC<UserSearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onNewUser,
  userCounts
}) => {
  // Estado para el tamaño de la pantalla
  const [isMobile, setIsMobile] = useState(false);

  // Efecto para detectar el tamaño de la pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Inicializar
    handleResize();
    
    // Agregar listener
    window.addEventListener('resize', handleResize);
    
    // Limpiar listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filterOptions: FilterOption[] = [
    { value: 'all', label: 'Todos', count: userCounts.all },
    { value: 'superadmin', label: 'Super Admin', count: userCounts.superadmin },
    { value: 'admin', label: 'Administradores', count: userCounts.admin },
    { value: 'vendedor', label: 'Vendedores', count: userCounts.vendedor },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o correo"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 sm:w-auto w-full">
          <Button
            onClick={onNewUser}
            variant="default"
            className="sm:w-auto w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nuevo Usuario</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        
        </div>
      </div>

      {/* Tabs de filtros personalizados - Visibles en desktop */}
      <FilterTabs
        options={filterOptions}
        activeFilter={activeFilter}
        onFilterChange={(filter) => onFilterChange(filter as UserFilter)}
        className={isMobile ? "hidden" : "block"}
      />

      {/* Select para filtros en móvil */}
      <div className={isMobile ? "block w-full" : "hidden"}>
        <Select value={activeFilter} onValueChange={(value) => onFilterChange(value as UserFilter)}>
          <SelectTrigger className="bg-white w-full">
            <SelectValue placeholder="Seleccionar filtro" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} {(option.count ?? 0) > 0 && `(${option.count})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
