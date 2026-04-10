import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select';

interface UserPaginationProps {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  usersPerPage: number;
  onPageChange: (page: number) => void;
  onUsersPerPageChange: (usersPerPage: number) => void;
  startIndex: number;
  endIndex: number;
}

export const UserPagination: React.FC<UserPaginationProps> = ({
  currentPage,
  totalPages,
  totalUsers,
  usersPerPage,
  onPageChange,
  onUsersPerPageChange,
  startIndex,
  endIndex
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t">
      {/* Información de resultados */}
      <div className="text-sm text-gray-700">
        Mostrando {startIndex + 1}-{Math.min(endIndex, totalUsers)} de {totalUsers} usuarios
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center gap-2">
        {/* Selector de elementos por página - Solo en desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-gray-700">Mostrar:</span>
          <Select 
            value={usersPerPage.toString()} 
            onValueChange={(value) => onUsersPerPageChange(parseInt(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
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
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números de página */}
          <div className="hidden sm:flex items-center gap-1">
            {visiblePages.map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(page)}
                className={`h-8 w-8 ${
                  page === currentPage 
                    ? 'bg-primary  text-white' 
                    : ''
                }`}
              >
                {page}
              </Button>
            ))}
          </div>

          {/* Indicador de página actual en móvil */}
          <div className="sm:hidden px-3 py-1 text-sm bg-gray-100 rounded">
            {currentPage} / {totalPages}
          </div>

          {/* Botón siguiente */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selector para móvil */}
      <div className="sm:hidden w-full">
        <Select 
          value={usersPerPage.toString()} 
          onValueChange={(value) => onUsersPerPageChange(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 por página</SelectItem>
            <SelectItem value="20">20 por página</SelectItem>
            <SelectItem value="50">50 por página</SelectItem>
            <SelectItem value="100">100 por página</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
