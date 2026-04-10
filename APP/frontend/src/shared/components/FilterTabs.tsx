  import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: string;
}

interface FilterTabsProps {
  options: FilterOption[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  className?: string;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  options,
  activeFilter,
  onFilterChange,
  className
}) => {
  // Estado para el tamaño de la pantalla
  const [isTablet, setIsTablet] = useState(false);

  // Efecto para detectar el tamaño de la pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 768);
    };
    
    // Inicializar
    handleResize();
    
    // Agregar listener
    window.addEventListener('resize', handleResize);
    
    // Limpiar listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={cn("overflow-x-auto py-1", className)}>
      <div className="flex gap-2 md:gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              "px-4 py-2 text-sm rounded-full border border-gray-300 transition-all whitespace-nowrap flex items-center",
              activeFilter === option.value
                ? "bg-primary text-primary-foreground border-primary font-medium"
                : "bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <span>
              {option.icon && `${option.icon} `}
              {isTablet && option.label.length > 10
                ? option.label.split(' ')[0]
                : option.label}
            </span>
            {option.count !== undefined && option.count > 0 && (
              <span className={cn(
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[20px]",
                activeFilter === option.value
                  ? "bg-primary-foreground text-primary"
                  : "bg-gray-200 text-gray-700"
              )}>
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
