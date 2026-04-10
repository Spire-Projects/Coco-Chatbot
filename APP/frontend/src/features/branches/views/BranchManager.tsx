import React, { memo, useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../../shared/components/PageHeader';
import { BranchTable } from '../components/BranchTable';
import { BranchDialog } from '../components/BranchDialog';
import CustomDialog from '../../../shared/components/CustomDialog';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { DataPagination } from '../../../shared/components/DataPagination';
import { BranchService } from '../../../shared/services/BranchService';
import type { Branch } from '../../../shared/types/Branch';

const PAGE_SIZE = 10;

const BranchManagerComponent: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadBranches = useCallback(async () => {
    setLoading(true);
    const result = await BranchService.getAll();
    if (result.success) {
      setBranches(result.branches);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // ── Filtering + pagination ────────────────────────────────────────────────
  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.address ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.phone ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBranches.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredBranches.length);
  const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNew = () => {
    setDialogMode('create');
    setEditingBranch(null);
    setDialogOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setDialogMode('edit');
    setEditingBranch(branch);
    setDialogOpen(true);
  };

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    setDeleteLoading(true);
    const result = await BranchService.delete(branchToDelete.id);
    if (result.success) {
      toast.success(`Sucursal "${branchToDelete.name}" eliminada`);
      await loadBranches();
    } else {
      toast.error(result.error ?? 'Error al eliminar la sucursal');
    }
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setBranchToDelete(null);
  };

  const handleDialogSuccess = async () => {
    toast.success(dialogMode === 'create' ? 'Sucursal creada exitosamente' : 'Sucursal actualizada');
    await loadBranches();
  };

  return (
    <div className="p-0 xs:p-1 sm:p-2 md:p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Sucursales"
        subtitle="Gestiona las sucursales del sistema"
        icon={<Building2 />}
        classNameIcon="text-blue-600"
      />

      {/* Search + New button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre, dirección o teléfono..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleNew} className="shrink-0">
          <Plus size={16} className="mr-2" />
          Nueva Sucursal
        </Button>
      </div>

      {/* Table */}
      <BranchTable
        branches={paginatedBranches}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Pagination */}
      {!loading && filteredBranches.length > PAGE_SIZE && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredBranches.length}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={() => {}}
          startIndex={startIndex}
          endIndex={endIndex}
          itemName="sucursales"
        />
      )}

      {/* Create / Edit dialog */}
      <BranchDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleDialogSuccess}
        branch={editingBranch}
        mode={dialogMode}
      />

      {/* Delete confirmation */}
      <CustomDialog
        isOpen={deleteDialogOpen}
        onCancel={() => { setDeleteDialogOpen(false); setBranchToDelete(null); }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="¿Eliminar sucursal?"
        description={`¿Estás seguro de que deseas eliminar la sucursal "${branchToDelete?.name ?? ''}"? Esta acción no se puede deshacer.`}
        textConfirm="Eliminar"
        textCancel="Cancelar"
      />
    </div>
  );
};

export const BranchManager = memo(BranchManagerComponent);
