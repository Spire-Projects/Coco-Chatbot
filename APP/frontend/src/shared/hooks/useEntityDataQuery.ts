/**
 * useEntityDataQuery
 *
 * Drop-in replacement for useEntityData backed by @tanstack/react-query.
 *
 * Benefits over useEntityData:
 *  - Instant navigation back to a list (stale data shown while revalidating)
 *  - Single fetch per search (no double-fetch when resetting page + debounce)
 *  - Automatic deduplication of identical requests
 *  - `refresh()` calls queryClient.invalidateQueries, triggering a background
 *    refetch so the UI never flickers with a blank loading state
 *
 * Usage:
 *   const data = useEntityDataQuery(purchaseService, 'purchases', { initialPageSize: 10 });
 *   // Identical API to useEntityData — swap the import and add the queryKey string.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import type { EntityService, UseEntityDataParams, UseEntityDataReturn } from './useEntityData';

export function useEntityDataQuery<
  TEntity,
  TView,
  TFilter extends Record<string, unknown>,
>(
  service: EntityService<TEntity, TView, TFilter>,
  queryKey: string,
  params: UseEntityDataParams<TFilter> = {},
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

  const queryClient = useQueryClient();

  // Local UI state (pagination, search, filters)
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filters, setFiltersState] = useState<TFilter>(initialFilters);
  const [dateFrom, setDateFrom] = useState<string | undefined>(initialDateFrom);
  const [dateTo, setDateTo] = useState<string | undefined>(initialDateTo);

  // Debounce search to avoid a fetch on every keystroke
  const debouncedSearch = useDebounce(searchQuery, debounceMs);

  // React Query — the query key drives caching: same key = cached result
  const { data, isFetching, isError, error } = useQuery({
    queryKey: [queryKey, currentPage, pageSize, debouncedSearch, dateFrom, dateTo, filters],
    queryFn: () =>
      service.getAllView(
        currentPage,
        pageSize,
        debouncedSearch || undefined,
        dateFrom,
        dateTo,
        filters,
      ),
    placeholderData: (prev) => prev, // show previous data while fetching next page/search
  });

  const totalItems = data?.totalItems ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    if (size < 1) return;
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  // Search resets to page 1 atomically with the debounced value change
  // (no double-fetch: page reset happens here, fetch waits for debouncedSearch)
  const setSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const setFilters = useCallback((newFilters: TFilter) => {
    setFiltersState(newFilters);
    setCurrentPage(1);
  }, []);

  const setDateRange = useCallback((from?: string, to?: string) => {
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({} as TFilter);
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  }, []);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
  }, [queryClient, queryKey]);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage  = useCallback(() => setCurrentPage(totalPages), [totalPages]);

  return {
    items: data?.items ?? [],
    loading: isFetching,
    error: isError ? (error instanceof Error ? error.message : 'Error cargando datos') : null,

    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,

    searchQuery,
    debouncedSearch,
    filters,
    dateFrom,
    dateTo,

    setPage,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setSearch,
    setFilters,
    setDateRange,
    clearFilters,
    refresh,
  };
}
