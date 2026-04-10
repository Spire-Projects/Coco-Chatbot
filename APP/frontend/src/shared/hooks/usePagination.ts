import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationParams {
  initialPage?: number;
  initialPageSize?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  reset: () => void;
}

/**
 * Hook para manejar estado de paginación
 */
export function usePagination(params: UsePaginationParams = {}): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 20 } = params;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = useMemo(() => 
    Math.ceil(totalItems / pageSize) || 1,
    [totalItems, pageSize]
  );

  const hasNextPage = useMemo(() => 
    currentPage < totalPages,
    [currentPage, totalPages]
  );

  const hasPreviousPage = useMemo(() => 
    currentPage > 1,
    [currentPage]
  );

  const setPage = useCallback((page: number) => {
    if (page < 1) {
      setCurrentPage(1);
      return;
    }
    if (totalPages > 0 && page > totalPages) {
      setCurrentPage(totalPages);
      return;
    }
    setCurrentPage(page);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    if (size < 1) return;
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page
  }, []);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    if (totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSizeState(initialPageSize);
    setTotalItems(0);
  }, [initialPage, initialPageSize]);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    setTotalItems,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    reset,
  };
}
