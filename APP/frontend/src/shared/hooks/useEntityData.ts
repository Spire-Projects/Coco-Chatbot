import { useState, useCallback, useEffect } from 'react';
import type { ItemsResponse } from '../types/UtilTypes';
import { useDebounce } from './useDebounce';
import { usePagination } from './usePagination';

/**
 * Servicio base requerido para el hook
 */
export interface EntityService<TEntity, TView, TFilter> {
  getAllView(
    page: number,
    size: number,
    searchQuery?: string,
    dateFrom?: string,
    dateTo?: string,
    filter?: TFilter
  ): Promise<ItemsResponse<TView>>;
  readonly _entity?: TEntity; // phantom type, unused at runtime
}

/**
 * Parámetros de configuración
 */
export interface UseEntityDataParams<TFilter> {
  initialPage?: number;
  initialPageSize?: number;
  initialSearch?: string;
  initialFilters?: TFilter;
  initialDateFrom?: string;
  initialDateTo?: string;
  debounceMs?: number;
}

/**
 * Valor de retorno del hook
 */
export interface UseEntityDataReturn<TView, TFilter> {
  // Data
  items: TView[];
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // Search & Filters
  searchQuery: string;
  debouncedSearch: string;
  filters: TFilter;
  dateFrom?: string;
  dateTo?: string;

  // Actions - Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;

  // Actions - Search & Filters
  setSearch: (query: string) => void;
  setFilters: (filters: TFilter) => void;
  setDateRange: (from?: string, to?: string) => void;
  clearFilters: () => void;

  // Actions - General
  refresh: () => Promise<void>;
}

/**
 * Hook principal para manejar estado de entidades con paginación, búsqueda y filtros
 * 
 * @template TEntity - Tipo base de la entidad (del repositorio)
 * @template TView - Tipo de vista de la entidad (con campos resueltos)
 * @template TFilter - Tipo de filtros específicos
 * 
 * @example
 * ```typescript
 * const products = useEntityData({
 *   service: productService,
 *   initialPageSize: 20,
 * });
 * ```
 */
export function useEntityData<TEntity, TView, TFilter extends Record<string, any>>(
  service: EntityService<TEntity, TView, TFilter>,
  params: UseEntityDataParams<TFilter> = {}
): UseEntityDataReturn<TView, TFilter> {
  const {
    initialPage = 1,
    initialPageSize = 20,
    initialSearch = '',
    initialFilters = {} as TFilter,
    initialDateFrom,
    initialDateTo,
    debounceMs = 300,
  } = params;

  // State
  const [items, setItems] = useState<TView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filters, setFiltersState] = useState<TFilter>(initialFilters);
  const [dateFrom, setDateFrom] = useState<string | undefined>(initialDateFrom);
  const [dateTo, setDateTo] = useState<string | undefined>(initialDateTo);

  // Pagination
  const pagination = usePagination({
    initialPage,
    initialPageSize,
  });

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, debounceMs);

  /**
   * Fetch data from service
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await service.getAllView(
        pagination.currentPage,
        pagination.pageSize,
        debouncedSearch || undefined,
        dateFrom,
        dateTo,
        filters
      );

      setItems(response.items);
      pagination.setTotalItems(response.totalItems);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando datos';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    service,
    pagination.currentPage,
    pagination.pageSize,
    pagination.setTotalItems,
    debouncedSearch,
    dateFrom,
    dateTo,
    filters,
  ]);

  /**
   * Effect para cargar datos
   */
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Actions
  const setSearch = useCallback((query: string) => {
    setSearchQuery(query);
    pagination.goToFirstPage();
  }, [pagination]);

  const setFilters = useCallback((newFilters: TFilter) => {
    setFiltersState(newFilters);
    pagination.goToFirstPage();
  }, [pagination]);

  const setDateRange = useCallback((from?: string, to?: string) => {
    setDateFrom(from);
    setDateTo(to);
    pagination.goToFirstPage();
  }, [pagination]);

  const clearFilters = useCallback(() => {
    setFiltersState({} as TFilter);
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
    pagination.reset();
  }, [pagination]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    // Data
    items,
    loading,
    error,

    // Pagination
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPreviousPage: pagination.hasPreviousPage,

    // Search & Filters
    searchQuery,
    debouncedSearch,
    filters,
    dateFrom,
    dateTo,

    // Actions - Pagination
    setPage: pagination.setPage,
    setPageSize: pagination.setPageSize,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,
    goToFirstPage: pagination.goToFirstPage,
    goToLastPage: pagination.goToLastPage,

    // Actions - Search & Filters
    setSearch,
    setFilters,
    setDateRange,
    clearFilters,

    // Actions - General
    refresh,
  };
}
