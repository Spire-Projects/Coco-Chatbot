import { memo, useState } from "react";
import { Wrench, Download, X, MoreVertical, Plus } from "lucide-react";

import { DataPagination } from "@/shared/components/DataPagination";
import { useEntityData } from "@/shared/hooks";
import { reparationService } from "@/shared/services/ReparationService";
import type { Reparation, ReparationView, ReparationFilter } from "@/shared/types/modelTypes/Reparation";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import CustomDialog from "@/shared/components/CustomDialog";

import StartAppText from "@/shared/components/StartAppText";
import PageHeader from "@/shared/components/PageHeader";
import SearchInput from "@/shared/components/SearchInput";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import TableReparationDesktop from "../components/Tables/TableReparationDesktop";
import TableReparationMobile from "../components/Tables/TableReparationMobile";
import CreateReparationModal from "../components/CreateReparationModal";
import { excelExportService } from "@/shared/services/ExcelExportService";
import useGlobalStates from "@/shared/hooks/useGlobalStates";

const ReparationPageComponent = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reparationToDelete, setReparationToDelete] = useState<ReparationView | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reparationToEdit, setReparationToEdit] = useState<ReparationView | null>(null);

  const {
    // Data
    items: reparations,
    loading,
    error,

    // Pagination
    currentPage,
    pageSize,
    totalItems,
    totalPages,

    // Search & Filters
    searchQuery,
    filters,

    // Actions - Pagination
    setPage,
    setPageSize,

    // Actions - Search & Filters
    setSearch,
    setFilters,
    clearFilters,

    // Actions - General
    refresh,
  } = useEntityData<Reparation, ReparationView, ReparationFilter>(reparationService, {
    initialPageSize: 10,
  });

  // Handler para cambiar filtro de estado
  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    if (status === "all") {
      setFilters({});
    } else {
      setFilters({ status: status as any });
    }
  };

  // Handler para limpiar filtros
  const handleClearFilters = () => {
    setSelectedStatus("all");
    setSearch("");
    clearFilters();
  };

  // Handler para abrir modal de edición
  const handleEditClick = (reparation: ReparationView) => {
    setReparationToEdit(reparation);
    setIsCreateModalOpen(true);
  };

  // Handler para abrir modal de creación
  const handleCreateClick = () => {
    setReparationToEdit(null);
    setIsCreateModalOpen(true);
  };

  // Handler cuando se crea/edita exitosamente
  const handleReparationSuccess = () => {
    setIsCreateModalOpen(false);
    setReparationToEdit(null);
    refresh();
  };

  // Handler para eliminar reparación
  const handleDeleteClick = (reparation: ReparationView) => {
    setReparationToDelete(reparation);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!reparationToDelete) return;

    try {
      await reparationService.delete(reparationToDelete.id);
      setDeleteDialogOpen(false);
      setReparationToDelete(null);
      await refresh();
      toast.success("Reparación eliminada exitosamente");
    } catch (error) {
      console.error('Error deleting reparation:', error);
      toast.error("Error al eliminar la reparación. Intenta nuevamente");
    }
  };

  // Cancelar eliminación
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setReparationToDelete(null);
  };

  const { user } = useGlobalStates();

  const handleExportTable = async () => {
    toast.info("Generando reporte de reparaciones...");
    const allReparations = await reparationService.getAllView(1, 10000);

    await excelExportService.exportToExcel(allReparations.items, {
      title: 'Reporte de Reparaciones',
      fileName: 'reporte_reparaciones',
      exportedBy: user?.fullName || user?.email || 'Desconocido',
      sheetName: 'Reparaciones',
      columnMapping: {
        model: 'Modelo',
        description: 'Descripción',
        totalCost: 'Costo Total',
        advanceAmount: 'Anticipo',
        pendingAmount: 'Monto Pendiente',
        status: 'Estado',
        createdAt: 'Fecha de Creación',
      },
      excludeColumns: ['_lastModifiedAt', 'clientId', 'errors', 'stateReceived', 'password'],
    });
    toast.success("Reporte de reparaciones generado exitosamente");
  };

  if (error) {
    if (error.includes("Inicializando base de datos")) {
      return <StartAppText error={error} />;
    }

    return (
      <div className="p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">
            Error al cargar reparaciones
          </h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Intentar nuevamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 xs:p-1 sm:p-2 md:p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Reparaciones"
        subtitle="Gestiona las reparaciones de tus clientes"
        icon={<Wrench />}
        classNameIcon="text-blue-600"
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <SearchInput
          value={searchQuery}
          onChange={setSearch}
          isLoading={loading}
        />

        {/* Filtro por Estado */}
        <Select
          value={selectedStatus}
          onValueChange={handleStatusFilterChange}
          disabled={loading}
        >
          <SelectTrigger className="w-full sm:w-50">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="repairing">En Reparación</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="default"
          size="sm"
          onClick={handleCreateClick}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Reparación
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={loading} aria-label="Más opciones">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExportTable()}>
              <Download className="h-4 w-4 mr-2" /> Exportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {Object.keys(filters).length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Limpiar filtros
        </Button>
      )}

      {/* Table - Desktop */}
      <TableReparationDesktop
        reparations={reparations}
        loading={loading}
        searchQuery={searchQuery}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onRefresh={refresh}
      />

      {/* Mobile View */}
      <TableReparationMobile
        reparations={reparations}
        loading={loading}
        searchQuery={searchQuery}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onRefresh={refresh}
      />

      {!loading && totalItems > 0 && (
        <div className="w-full">
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            onItemsPerPageChange={setPageSize}
            startIndex={(currentPage - 1) * pageSize + 1}
            endIndex={Math.min(currentPage * pageSize, totalItems)}
            itemName="reparaciones"
          />
        </div>
      )}

      {/* Dialog de Confirmación de Eliminación */}
      <CustomDialog
        isOpen={deleteDialogOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        loading={loading}
        title="¿Eliminar reparación?"
        description={`¿Estás seguro de que deseas eliminar la reparación del modelo "${reparationToDelete?.model ?? ''}"? Esta acción no se puede deshacer.`}
        textConfirm="Eliminar"
        textCancel="Cancelar"
      />

      {/* Modal de Creación/Edición */}
      <CreateReparationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setReparationToEdit(null);
        }}
        onSuccess={handleReparationSuccess}
        createdBy={user?.id || "current-user"}
        reparationToEdit={reparationToEdit}
      />
    </div>
  );
};

export const ReparationPage = memo(ReparationPageComponent);
