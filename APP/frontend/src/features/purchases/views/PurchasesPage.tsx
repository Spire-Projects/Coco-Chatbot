// @ts-nocheck
import { memo, useState, useEffect } from "react";
import { ShoppingCart, Plus, X, MoreVertical, Download } from "lucide-react";

import { DataPagination } from "@/shared/components/DataPagination";
import { useEntityDataQuery } from "@/shared/hooks";
import { purchaseService } from "@/shared/services/PurchaseService";
import { supplierService } from "@/shared/services/SupplierService";
import { useBranchStore } from "@/shared/store/branchStore";
import type { Purchase, PurchaseView, PurchaseFilter } from "@/shared/types/modelTypes/PurchaseBox";
import type { SupplierView } from "@/shared/types/modelTypes/Supplier";
import { Button } from "@/shared/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";
import CustomDialog from "@/shared/components/CustomDialog";
import TablePurchaseDesktop from "../components/Tables/TablePurchaseDesktop";
import { CreatePurchaseModal } from "../components/CreatePurchaseModal";
import StartAppText from "@/shared/components/StartAppText";
import PageHeader from "@/shared/components/PageHeader";
import SearchInput from "@/shared/components/SearchInput";
import { toast } from "sonner";
import { excelExportService } from "@/shared/services/ExcelExportService";
import useGlobalStates from "@/shared/hooks/useGlobalStates";

const PurchasesPageComponent = () => {
  const { currentBranch } = useBranchStore();
  const { user } = useGlobalStates();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseView | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierView[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  useEffect(() => {
    supplierService
      .getAllView(1, 100)
      .then((r) => setSuppliers(r.items))
      .catch((e) => console.error("Error loading suppliers:", e));
  }, []);

  const {
    items: purchases,
    loading,
    error,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    searchQuery,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refresh,
  } = useEntityDataQuery<Purchase, PurchaseView, PurchaseFilter>(purchaseService, 'purchases', {
    initialPageSize: 10,
    initialFilters: currentBranch?.id ? { branchId: currentBranch.id } : ({} as PurchaseFilter),
  });

  const handlePurchaseCreated = async () => {
    setIsCreateModalOpen(false);
    await refresh();
    toast.success("Compra registrada exitosamente");
  };

  const handleSupplierFilterChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const base: PurchaseFilter = currentBranch?.id ? { branchId: currentBranch.id } : {};
    if (supplierId === "all") {
      setFilters(base);
    } else {
      setFilters({ ...base, supplierId });
    }
  };

  const handleClearFilters = () => {
    setSelectedSupplierId("all");
    setSearch("");
    const base: PurchaseFilter = currentBranch?.id ? { branchId: currentBranch.id } : {};
    setFilters(base);
  };

  const handleDeleteClick = (purchase: PurchaseView) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!purchaseToDelete) return;
    try {
      await purchaseService.delete(purchaseToDelete.id);
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      await refresh();
      toast.success("Compra eliminada exitosamente");
    } catch (err) {
      console.error("Error deleting purchase:", err);
      toast.error("Error al eliminar la compra");
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setPurchaseToDelete(null);
  };

  const handleExportTable = async () => {
    toast.info("Generando reporte de compras...");
    try {
      const all = await purchaseService.getAllView(1, 90000, searchQuery, undefined, undefined, filters);
      await excelExportService.exportToExcel(all.items, {
        title: "Reporte de Compras",
        fileName: "reporte_compras",
        exportedBy: user?.fullName ?? user?.email ?? "Desconocido",
        columnMapping: {
          purchasedAt: "Fecha de Compra",
          supplierName: "Proveedor",
          branchName: "Sucursal",
          itemCount: "Unidades",
          totalUsd: "Total USD",
          notes: "Notas",
        },
        excludeColumns: ["id", "supplierId", "branchId", "createdAt", "updatedAt", "createdBy", "updatedBy", "isDeleted",
          "resolvedSupplierName", "resolvedBranchName", "resolvedItemCount"],
      });
      toast.success("Reporte generado exitosamente");
    } catch (err) {
      console.error("Error exporting:", err);
      toast.error("Error al generar el reporte");
    }
  };

  if (error) {
    if (error.includes("Inicializando base de datos")) return <StartAppText error={error} />;
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error al cargar compras</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <Button onClick={refresh} variant="outline" size="sm" className="mt-2">Intentar nuevamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 xs:p-1 sm:p-2 md:p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Compras"
        subtitle={currentBranch ? `Sucursal: ${currentBranch.name}` : "Registra el ingreso de dispositivos y accesorios al inventario"}
        icon={<ShoppingCart />}
        classNameIcon="text-blue-600"
      />

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <SearchInput value={searchQuery} onChange={setSearch} isLoading={loading} />

        <Button variant="default" size="sm" onClick={() => setIsCreateModalOpen(true)} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Compra
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={loading} aria-label="Mas opciones">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportTable}>
              <Download className="h-4 w-4 mr-2" /> Exportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-row gap-2">
        {selectedSupplierId !== "" && selectedSupplierId !== "all" && (
          <Button variant="outline" size="sm" onClick={handleClearFilters} disabled={loading}>
            <X className="h-4 w-4 mr-2" /> Limpiar filtros
          </Button>
        )}
        <Select value={selectedSupplierId} onValueChange={handleSupplierFilterChange} disabled={loading}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Todos los proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TablePurchaseDesktop
        purchases={purchases}
        loading={loading}
        searchQuery={searchQuery}
        onEdit={() => {}}
        onDelete={handleDeleteClick}
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
            itemName="compras"
          />
        </div>
      )}

      <CreatePurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePurchaseCreated}
        createdBy={user?.id ?? "unknown-user"}
        branchId={currentBranch?.id ?? ""}
      />

      <CustomDialog
        isOpen={deleteDialogOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        loading={loading}
        title="Eliminar compra"
        description="Esta accion eliminara el registro de compra. Los items de inventario asociados permaneceran. Esta accion no se puede deshacer."
        textConfirm="Eliminar"
        textCancel="Cancelar"
      />
    </div>
  );
};

PurchasesPageComponent.displayName = "PurchasesPage";
export const PurchasesPage = memo(PurchasesPageComponent);
