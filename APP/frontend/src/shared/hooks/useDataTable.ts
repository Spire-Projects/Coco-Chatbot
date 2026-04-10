import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ItemsResponse } from '../types/UtilTypes';

type RealtimeSubscription = { unsubscribe: () => void };
type RealtimeObservable<T> = {
  subscribe: (observer: {
    next: (items: T[]) => void;
    error?: (err: unknown) => void;
  }) => RealtimeSubscription;
};

/**
 * Parámetros de configuración para el hook genérico
 */
export interface UseDataTableParams<TFilters, TSort> {
  initialPage?: number;
  initialPageSize?: number;
  initialFilters?: TFilters;
  initialSort?: TSort;
  enableRealtime?: boolean; // Activar listeners en tiempo real
  debounceMs?: number; // Tiempo de debounce para búsquedas
}

/**
 * Interfaz del servicio requerido para el hook
 */
export interface DataTableService<TEntity, TFilters, TSort> {
  findAllPaginated(
    page: number,
    size: number,
    searchQuery?: string,
    filters?: TFilters,
    sort?: TSort
  ): Promise<{ success: boolean; data?: ItemsResponse<TEntity>; error?: string }>;
  
  // Opcional: listener en tiempo real
  findAllPaginatedLive$?(
    page: number,
    size: number,
    searchQuery?: string,
    filters?: TFilters,
    sort?: TSort
  ): RealtimeObservable<TEntity>;
}

/**
 * Valor de retorno del hook genérico
 */
export interface UseDataTableReturn<TEntity, TFilters, TSort> {
  // Data
  data: ItemsResponse<TEntity> | null;
  items: TEntity[];
  
  // Loading states
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
  filters: TFilters;
  sort: TSort | undefined;
  
  // Actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (query: string) => void;
  setFilters: (filters: TFilters) => void;
  setSort: (sort: TSort | undefined) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Hook genérico para tablas de datos con paginación, búsqueda, filtros y listeners en tiempo real
 * 
 * @template TEntity - Tipo de la entidad (Product, Sale, Purchase, etc.)
 * @template TFilters - Tipo de filtros específicos de la entidad
 * @template TSort - Tipo de ordenamiento específico de la entidad
 * 
 * @example
 * ```typescript
 * const products = useDataTable({
 *   service: ProductService,
 *   initialPageSize: 20,
 *   enableRealtime: true
 * });
 * ```
 */
export function useDataTable<TEntity, TFilters extends Record<string, any>, TSort>(
  service: DataTableService<TEntity, TFilters, TSort>,
  params: UseDataTableParams<TFilters, TSort> = {}
): UseDataTableReturn<TEntity, TFilters, TSort> {
  const {
    initialPage = 1,
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialFilters = {} as TFilters,
    initialSort,
    enableRealtime = false,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = params;

  // State
  const [data, setData] = useState<ItemsResponse<TEntity> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [sort, setSort] = useState<TSort | undefined>(initialSort);

  // Ref para la suscripción de listeners en tiempo real
  const subscriptionRef = useRef<any>(null);

  /**
   * Fetch data usando el servicio (sin realtime)
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await service.findAllPaginated(
        currentPage,
        pageSize,
        searchQuery.trim() || undefined,
        filters,
        sort
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Error desconocido');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando datos';
      
      // Si el error es de DB no inicializada, mostrar mensaje más amigable
      if (errorMessage.includes('Database not initialized')) {
        setError('Inicializando base de datos...');
        // Reintentar después de un breve delay
        setTimeout(() => {
          void fetchData();
        }, 1000);
        return;
      }
      
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [service, currentPage, pageSize, searchQuery, filters, sort]);

  /**
   * Setup listener en tiempo real (si está habilitado)
   */
  const setupRealtimeListener = useCallback(() => {
    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Solo configurar si el servicio soporta listeners y está habilitado
    if (!enableRealtime || !service.findAllPaginatedLive$) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const subscription = service.findAllPaginatedLive$(
        currentPage,
        pageSize,
        searchQuery.trim() || undefined,
        filters,
        sort
      ).subscribe({
        next: (items) => {
          // Crear ItemsResponse manualmente ya que el observable solo retorna items
          setData({
            items,
            page: currentPage,
            size: pageSize,
            totalItems: items.length, // Estimación
            totalPages: Math.ceil(items.length / pageSize),
          });
          setLoading(false);
        },
        error: (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Error en listener';
          setError(errorMessage);
          setLoading(false);
          console.error('Error in realtime listener:', err);
        },
      });

      subscriptionRef.current = subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error configurando listener';
      setError(errorMessage);
      setLoading(false);
      console.error('Error setting up realtime listener:', err);
    }
  }, [service, currentPage, pageSize, searchQuery, filters, sort, enableRealtime]);

  /**
   * Efecto para cargar datos o configurar listener
   */
  useEffect(() => {
    if (enableRealtime && service.findAllPaginatedLive$) {
      // Usar listener en tiempo real
      const timeoutId = setTimeout(() => {
        setupRealtimeListener();
      }, debounceMs);

      return () => {
        clearTimeout(timeoutId);
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }
      };
    } else {
      // Usar fetch normal con debounce
      const timeoutId = setTimeout(() => {
        void fetchData();
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    }
  }, [fetchData, setupRealtimeListener, enableRealtime, debounceMs, service]);

  // Derived values
  const items = useMemo(() => data?.items || [], [data?.items]);
  const totalItems = useMemo(() => data?.totalItems || 0, [data?.totalItems]);
  const totalPages = useMemo(() => data?.totalPages || 0, [data?.totalPages]);
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPreviousPage = useMemo(() => currentPage > 1, [currentPage]);

  // Actions
  const setPage = useCallback((page: number) => {
    if (page < 1 || (totalPages > 0 && page > totalPages)) {
      console.warn(`Invalid page number: ${page}`);
      return;
    }
    setCurrentPage(page);
  }, [totalPages]);

  const setPageSizeAndReset = useCallback((size: number) => {
    if (size < 1) {
      console.warn(`Invalid page size: ${size}`);
      return;
    }
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const setSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const setFiltersAndReset = useCallback((newFilters: TFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const setSortAndReset = useCallback((newSort: TSort | undefined) => {
    setSort(newSort);
    setCurrentPage(1); // Reset to first page when sorting
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({} as TFilters);
    setSearchQuery('');
    setSort(undefined);
    setCurrentPage(1);
  }, []);

  const refresh = useCallback(async () => {
    if (enableRealtime && service.findAllPaginatedLive$) {
      setupRealtimeListener();
    } else {
      await fetchData();
    }
  }, [fetchData, setupRealtimeListener, enableRealtime, service]);

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

  return {
    // Data
    data,
    items,
    
    // Loading states
    loading,
    error,
    
    // Pagination
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    
    // Search & Filters
    searchQuery,
    filters,
    sort,
    
    // Actions
    setPage,
    setPageSize: setPageSizeAndReset,
    setSearch,
    setFilters: setFiltersAndReset,
    setSort: setSortAndReset,
    clearFilters,
    refresh,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
  };
}
