import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  startIndex: number;
  endIndex: number;
  itemName: string; // e.g., "usuarios", "lotes"
}

export const DataPagination: React.FC<DataPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  startIndex,
  endIndex,
  itemName
}) => {
  const getVisiblePages = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const sidePages = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - sidePages);
      let endPage = Math.min(totalPages, currentPage + sidePages);
      
      if (currentPage <= sidePages) {
        endPage = maxVisiblePages;
      }
      
      if (currentPage >= totalPages - sidePages) {
        startPage = totalPages - maxVisiblePages + 1;
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4">
        {/* Información de resultados */}
        <div className="text-sm text-gray-700 font-medium">
          Mostrando <span className="font-semibold text-gray-900">{startIndex}</span>-<span className="font-semibold text-gray-900">{Math.min(endIndex, totalItems)}</span> de <span className="font-semibold text-gray-900">{totalItems}</span> {itemName}
        </div>

        {/* Controles de paginación */}
        <div className="flex items-center gap-3">
          {/* Selector de elementos por página - Solo en desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-gray-700">Mostrar:</span>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value: string) => onItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 rounded-lg border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="10" className="rounded-md">10</SelectItem>
                <SelectItem value="20" className="rounded-md">20</SelectItem>
                <SelectItem value="50" className="rounded-md">50</SelectItem>
                <SelectItem value="100" className="rounded-md">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navegación de páginas */}
          <div className="flex items-center gap-1">
            {/* Botón anterior */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9 w-9 rounded-lg border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Números de página */}
            <div className="hidden sm:flex items-center gap-1">
              {/* Primera página con separador si es necesario */}
              {visiblePages[0] > 1 && (
                <>
                  <Button
                    variant={1 === currentPage ? "default" : "outline"}
                    size="icon"
                    onClick={() => onPageChange(1)}
                    className={`h-9 w-9 rounded-lg font-medium ${
                      1 === currentPage 
                        ? "bg-primary hover:bg-secondary text-white shadow-md" 
                        : "border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    1
                  </Button>
                  {visiblePages[0] > 2 && (
                    <span className="px-2 text-gray-400 font-medium">...</span>
                  )}
                </>
              )}

              {/* Páginas visibles */}
              {visiblePages.map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon"
                  onClick={() => onPageChange(page)}
                  className={`h-9 w-9 rounded-lg font-medium ${
                    page === currentPage 
                      ? "bg-primary hover:bg-secondary text-white shadow-md" 
                      : "border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  {page}
                </Button>
              ))}

              {/* Última página con separador si es necesario */}
              {visiblePages[visiblePages.length - 1] < totalPages && (
                <>
                  {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                    <span className="px-2 text-gray-400 font-medium">...</span>
                  )}
                  <Button
                    variant={totalPages === currentPage ? "default" : "outline"}
                    size="icon"
                    onClick={() => onPageChange(totalPages)}
                    className={`h-9 w-9 rounded-lg font-medium ${
                      totalPages === currentPage 
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" 
                        : "border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            {/* Solo página actual en mobile */}
            <div className="sm:hidden flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
              <span className="text-sm text-gray-700 font-medium">
                Página <span className="font-semibold text-gray-900">{currentPage}</span> de <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>
            </div>

            {/* Botón siguiente */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9 w-9 rounded-lg border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Selector móvil de elementos por página */}
        <div className="sm:hidden w-full">
          <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Mostrar:</span>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value: string) => onItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 rounded-lg border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="10" className="rounded-md">10</SelectItem>
                <SelectItem value="20" className="rounded-md">20</SelectItem>
                <SelectItem value="50" className="rounded-md">50</SelectItem>
                <SelectItem value="100" className="rounded-md">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-700">{itemName} por página</span>
          </div>
        </div>
      </div>
    </div>
  );
};
