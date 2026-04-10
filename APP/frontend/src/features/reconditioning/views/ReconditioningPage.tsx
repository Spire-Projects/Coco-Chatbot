import { memo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';

import PageHeader from '@/shared/components/PageHeader';
import SearchInput from '@/shared/components/SearchInput';
import { DataPagination } from '@/shared/components/DataPagination';
import { Button } from '@/shared/components/ui/button';
import { useDebounce } from '@/shared/hooks/useDebounce';
import useGlobalStates from '@/shared/hooks/useGlobalStates';
import { useBranchStore } from '@/shared/store/branchStore';
import { tradeInService } from '@/shared/services/TradeInService';
import type { TradeInDevice, TradeInItemStatus } from '@/shared/types/modelTypes/TradeInDevice';

import TradeInTableDesktop from '../components/TradeInTableDesktop';
import TradeInTableMobile from '../components/TradeInTableMobile';
import EditTradeInModal from '../components/EditTradeInModal';
import ApproveTradeInModal from '../components/ApproveTradeInModal';

// ─── Status filter tabs ───────────────────────────────────────────────────────
const STATUS_TABS: { value: TradeInItemStatus | 'all'; label: string }[] = [
  { value: 'trade_in', label: 'En Recondicioamiento' },
  { value: 'available', label: 'Aprobados' },
  { value: 'all',      label: 'Todos' },
];

const PAGE_SIZE = 15;

// ─── Component ────────────────────────────────────────────────────────────────
const ReconditioningPageComponent = () => {
  const { user }          = useGlobalStates();
  const { currentBranch } = useBranchStore();

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<TradeInItemStatus | 'all'>('trade_in');
  const [page, setPage]             = useState(1);

  // Modals
  const [itemToEdit, setItemToEdit]       = useState<TradeInDevice | null>(null);
  const [itemToApprove, setItemToApprove] = useState<TradeInDevice | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['reconditioning', page, debouncedSearch, statusFilter, currentBranch?.id],
    queryFn: () =>
      tradeInService.list(page, PAGE_SIZE, debouncedSearch, {
        status:   statusFilter,
        branchId: currentBranch?.id,
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const items      = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex   = Math.min(page * PAGE_SIZE, totalItems);

  const canApprove = user?.role === 'superadmin';

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const handleStatusTab = useCallback((s: TradeInItemStatus | 'all') => {
    setStatusFilter(s);
    setPage(1);
  }, []);

  const handleEdit    = useCallback((item: TradeInDevice) => setItemToEdit(item),    []);
  const handleApprove = useCallback((item: TradeInDevice) => setItemToApprove(item), []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full">
      {/* Header */}
      <PageHeader
        title="Reacondicionamiento"
        subtitle="Dispositivos recibidos como pago pendientes de revisión y aprobación"
        icon={<Wrench />}
        classNameIcon="text-blue-600"
      />

      {/* Search + Status filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={handleSearch}
            isLoading={isFetching}
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg self-start shrink-0">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant="ghost"
              onClick={() => handleStatusTab(tab.value)}
              className={`text-xs px-3 h-8 rounded-md transition-all ${
                statusFilter === tab.value
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats summary for trade_in filter */}
      {statusFilter === 'trade_in' && totalItems > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>{totalItems}</strong> dispositivo{totalItems !== 1 ? 's' : ''} en cola de
            reacondicionamiento
            {currentBranch ? ` · ${currentBranch.name}` : ''}
          </p>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden lg:block">
        <TradeInTableDesktop
          items={items}
          loading={isFetching && items.length === 0}
          canApprove={canApprove}
          onEdit={handleEdit}
          onApprove={handleApprove}
        />
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden">
        <TradeInTableMobile
          items={items}
          loading={isFetching && items.length === 0}
          canApprove={canApprove}
          onEdit={handleEdit}
          onApprove={handleApprove}
        />
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setPage}
          onItemsPerPageChange={() => {}}
          startIndex={startIndex}
          endIndex={endIndex}
          itemName="dispositivos"
        />
      )}

      {/* Modals */}
      <EditTradeInModal
        open={!!itemToEdit}
        onClose={() => setItemToEdit(null)}
        item={itemToEdit}
        userId={user?.id ?? ''}
      />
      <ApproveTradeInModal
        open={!!itemToApprove}
        onClose={() => setItemToApprove(null)}
        item={itemToApprove}
        userId={user?.id ?? ''}
      />
    </div>
  );
};

ReconditioningPageComponent.displayName = 'ReconditioningPage';
export const ReconditioningPage = memo(ReconditioningPageComponent);
