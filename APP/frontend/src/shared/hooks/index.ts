/**
 * Custom React Hooks para gestión de datos con RxDB
 * 
 * Este módulo exporta hooks especializados para trabajar con tablas de datos
 * que incluyen paginación, búsqueda, filtros y actualización en tiempo real.
 */

// Hook genérico base
export { useDataTable } from './useDataTable';
export { useEntityData } from './useEntityData';
export { useEntityDataQuery } from './useEntityDataQuery';
export { usePagination } from './usePagination';
export { useDebounce } from './useDebounce';
export type {
  UseDataTableParams,
  UseDataTableReturn,
  DataTableService,
} from './useDataTable';



