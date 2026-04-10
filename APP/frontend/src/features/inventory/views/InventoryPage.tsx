
import { memo, useState, useEffect } from "react";
import { Package, Download, X, Plus, MoreVertical, Upload, List, Layers } from "lucide-react";

import { DataPagination } from "@/shared/components/DataPagination";
import { useEntityData } from "@/shared/hooks";
import { productService } from "@/shared/services/ProductService";
import { accessoryService } from "@/shared/services/AccessoryService";
import { brandService } from "@/shared/services/BrandService";
import { familyService } from "@/shared/services/FamilyService";
import { categoryService } from "@/shared/services/CategoryService";
import { modelService } from "@/shared/services/ModelService";
import type { ProductView, ProductFilter, Product } from "@/shared/types/modelTypes/Product";
import type { AccessoryView, AccessoryFilter, Accessory } from "@/shared/types/modelTypes/Accessory";
import type { BrandView } from "@/shared/types/modelTypes/Brand";
import type { FamilyView } from "@/shared/types/modelTypes/Family";
import type { CategoryView } from "@/shared/types/modelTypes/Category";
import type { ModelView } from "@/shared/types/modelTypes/Model";
import { FilterTabs } from "@/shared/components/FilterTabs";

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
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button";
import TableProductDesktop from "../components/Tables/TableProductDesktop";
import TableProductMobile from "../components/Tables/TableProductMobile";
import TableProductGroupedDesktop from "../components/Tables/TableProductGroupedDesktop";
import TableProductGroupedMobile from "../components/Tables/TableProductGroupedMobile";
import TableAccessoryDesktop from "../components/Tables/TableAccessoryDesktop";
import TableAccessoryMobile from "../components/Tables/TableAccessoryMobile";
import { CreateProductModal } from "../components/CreateProductModal";
import { UploadExcelProductModal } from "../components/UploadExcelProductModal";
import { excelExportService } from "@/shared/services/ExcelExportService";
import useGlobalStates from "@/shared/hooks/useGlobalStates";
import { useBranchStore } from "@/shared/store/branchStore";


const InventoryPageComponent = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadExcelModalOpen, setIsUploadExcelModalOpen] = useState(false);

  // Section tab: devices vs accessories
  const [sectionTab, setSectionTab] = useState<'devices' | 'accessories'>('devices');

  // Accessory edit state
  const [accessoryToEdit, setAccessoryToEdit] = useState<AccessoryView | null>(null);
  const [deleteAccessoryDialogOpen, setDeleteAccessoryDialogOpen] = useState(false);
  const [accessoryToDelete, setAccessoryToDelete] = useState<AccessoryView | null>(null);

  // Filter option lists
  const [brandOptions,    setBrandOptions]    = useState<BrandView[]>([]);
  const [familyOptions,   setFamilyOptions]   = useState<FamilyView[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryView[]>([]);
  const [modelOptions,    setModelOptions]    = useState<ModelView[]>([]);

  // Selected filter values
  const [selectedBrandId,    setSelectedBrandId]    = useState<string>('');
  const [selectedFamilyId,   setSelectedFamilyId]   = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedModelId,    setSelectedModelId]    = useState<string>('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductView | null>(null);
  const [productToEdit, setProductToEdit] = useState<ProductView | null>(null);
  const [productsWithBranchStock, setProductsWithBranchStock] = useState<ProductView[]>([]);
  const [branchStockLoading, setBranchStockLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'variants' | 'grouped'>('variants');
  const { currentBranch } = useBranchStore();

  // Load brands + categories once on mount
  useEffect(() => {
    brandService.getInitialList().then(setBrandOptions).catch(console.error);
    categoryService.getInitialList().then(setCategoryOptions).catch(console.error);
    modelService.getAllView(1, 200).then(r => setModelOptions(r.items)).catch(console.error);
  }, []);

  // Reload families when brand changes
  useEffect(() => {
    if (!selectedBrandId) { setFamilyOptions([]); return; }
    familyService.getByBrand(selectedBrandId).then(setFamilyOptions).catch(console.error);
  }, [selectedBrandId]);

  // Reload models when brand or family changes
  useEffect(() => {
    const filter: ProductFilter = {};
    if (selectedBrandId)  filter.brandId  = selectedBrandId;
    if (selectedFamilyId) filter.familyId = selectedFamilyId;
    const hasActiveFilter = selectedBrandId || selectedFamilyId;
    const fetchFilter = hasActiveFilter
      ? modelService.getAllView(1, 200, undefined, undefined, undefined, filter as any)
      : modelService.getAllView(1, 200);
    fetchFilter.then(r => setModelOptions(r.items)).catch(console.error);
  }, [selectedBrandId, selectedFamilyId]);

  const {
    // Data
    items: products,
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
  } = useEntityData<Product, ProductView, ProductFilter>(productService, {
    initialPageSize: 10,
  });

  // Accessories data
  const {
    items: accessories,
    loading: accLoading,
    currentPage: accCurrentPage,
    pageSize: accPageSize,
    totalItems: accTotalItems,
    totalPages: accTotalPages,
    searchQuery: accSearchQuery,
    setPage: setAccPage,
    setPageSize: setAccPageSize,
    setSearch: setAccSearch,
    setFilters: setAccFilters,
    clearFilters: _clearAccFilters,
    refresh: refreshAccessories,
  } = useEntityData<Accessory, AccessoryView, AccessoryFilter>(accessoryService, {
    initialPageSize: 10,
    initialFilters: { branchId: currentBranch?.id },
  });

  useEffect(() => {
    let cancelled = false;

    const applyBranchStock = async () => {
      setBranchStockLoading(true);
      try {
        const enriched = await productService.withBranchStock(products, currentBranch?.id);
        if (!cancelled) {
          setProductsWithBranchStock(enriched);
        }
      } catch (err) {
        console.error("Error applying branch stock:", err);
        if (!cancelled) {
          setProductsWithBranchStock(products);
        }
      } finally {
        if (!cancelled) {
          setBranchStockLoading(false);
        }
      }
    };

    void applyBranchStock();

    return () => {
      cancelled = true;
    };
  }, [products, currentBranch?.id]);

  // Update accessory stock filter whenever the active branch changes
  useEffect(() => {
    setAccFilters({ branchId: currentBranch?.id });
  }, [currentBranch?.id]);

  const tableProducts = currentBranch?.id ? productsWithBranchStock : products;
  const isTableLoading = loading || branchStockLoading;

  const handleImportSuccess = async () => {
    setIsUploadExcelModalOpen(false);
    await refresh();
  };

  // Build a consolidated ProductFilter from the four selected values
  const buildActiveFilters = (
    brandId: string, familyId: string, categoryId: string, modelId: string,
  ): ProductFilter => {
    const f: ProductFilter = {};
    if (brandId)    f.brandId    = brandId;
    if (familyId)   f.familyId   = familyId;
    if (categoryId) f.categoryId = categoryId;
    if (modelId)    f.modelId    = modelId;
    return f;
  };

  const handleBrandChange = (brandId: string) => {
    const v = brandId === 'all' ? '' : brandId;
    setSelectedBrandId(v);
    setSelectedFamilyId('');
    setSelectedModelId('');
    setFilters(buildActiveFilters(v, '', selectedCategoryId, ''));
  };

  const handleFamilyChange = (familyId: string) => {
    const v = familyId === 'all' ? '' : familyId;
    setSelectedFamilyId(v);
    setSelectedModelId('');
    setFilters(buildActiveFilters(selectedBrandId, v, selectedCategoryId, ''));
  };

  const handleCategoryFilterChange = (categoryId: string) => {
    const v = categoryId === 'all' ? '' : categoryId;
    setSelectedCategoryId(v);
    setFilters(buildActiveFilters(selectedBrandId, selectedFamilyId, v, selectedModelId));
  };

  const handleModelFilterChange = (modelId: string) => {
    const v = modelId === 'all' ? '' : modelId;
    setSelectedModelId(v);
    setFilters(buildActiveFilters(selectedBrandId, selectedFamilyId, selectedCategoryId, v));
  };

  const handleClearFilters = () => {
    setSelectedBrandId('');
    setSelectedFamilyId('');
    setSelectedCategoryId('');
    setSelectedModelId('');
    setSearch('');
    clearFilters();
  };

  // Accessory handlers
  const handleAccDeleteClick = (a: AccessoryView) => {
    setAccessoryToDelete(a);
    setDeleteAccessoryDialogOpen(true);
  };

  const handleAccConfirmDelete = async () => {
    if (!accessoryToDelete) return;
    try {
      await accessoryService.delete(accessoryToDelete.id);
      setDeleteAccessoryDialogOpen(false);
      setAccessoryToDelete(null);
      await refreshAccessories();
    } catch {
      toast.error("Error al eliminar el accesorio");
    }
  };

  const handleAccCancelDelete = () => {
    setDeleteAccessoryDialogOpen(false);
    setAccessoryToDelete(null);
  };

  // Handler para eliminar producto
  const handleDeleteClick = (product: ProductView) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await productService.delete(productToDelete.id);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      await refresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error("Error al eliminar el producto. Intenta nuevamente")
    }
  };

  // Cancelar eliminación
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const {user} = useGlobalStates();
 
  const handleExportTable = async () => {
   
    toast.info("Generando reporte de productos...");
    const allProducts = await productService.getAllView(
      1,
      10000,
      searchQuery || undefined,
      undefined,
      undefined,
      filters,
    );
    const exportProducts = await productService.withBranchStock(allProducts.items, currentBranch?.id);

    await excelExportService.exportToExcel(exportProducts as any, {
      title: 'Reporte de Productos',
      fileName: 'reporte_productos',
      exportedBy: user?.fullName || user?.email || 'Desconocido', // TODO: Reemplazar con el nombre del usuario autenticado
      sheetName: 'Productos',
      columnMapping: {
        name: 'Nombre',
        categoryName: 'Categoría',
        stock: 'Stock',
        price: "Precio",
        createdAt: 'Fecha de Creación',
      },
      excludeColumns: ['_lastModifiedAt'],
    });
    toast.success("Reporte de productos generado exitosamente");
  }



  if (error) {

    if (error.includes("Inicializando base de datos")) {
      return <StartAppText error={error} />;
    }

    return (
      <div className="p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">
            Error al cargar productos
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
        title="Inventario"
        subtitle={currentBranch ? `Sucursal: ${currentBranch.name}` : "Gestiona los productos de tu inventario"}
        icon={<Package />}
        classNameIcon="text-blue-600"
      />

      {/* ── Section tabs: Dispositivos / Accesorios ── */}
      <FilterTabs
        options={[
          { value: 'devices',     label: '📱 Dispositivos' },
          { value: 'accessories', label: '🔌 Accesorios' },
        ]}
        activeFilter={sectionTab}
        onFilterChange={(v) => setSectionTab(v as 'devices' | 'accessories')}
      />

      {sectionTab === 'devices' && (
        <>
      {/* ── Row 1: Search + actions ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <SearchInput
          value={searchQuery}
          onChange={setSearch}
          isLoading={loading}
        />
        {/* View mode toggle */}
        <div className="flex rounded-md border overflow-hidden shrink-0">
          <Button
            variant={viewMode === 'variants' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0"
            onClick={() => setViewMode('variants')}
            title="Vista por variantes"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grouped' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0"
            onClick={() => setViewMode('grouped')}
            title="Vista agrupada por modelo"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            setProductToEdit(null);
            setIsCreateModalOpen(true);
          }}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
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
            <DropdownMenuItem onClick={() => setIsUploadExcelModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Row 2: Cascade filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Marca */}
        <Select value={selectedBrandId || 'all'} onValueChange={handleBrandChange} disabled={loading}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todas las marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {brandOptions.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Familia — solo si hay marca seleccionada */}
        {selectedBrandId && (
          <Select value={selectedFamilyId || 'all'} onValueChange={handleFamilyChange} disabled={loading}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todas las familias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las familias</SelectItem>
              {familyOptions.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Categoría */}
        <Select value={selectedCategoryId || 'all'} onValueChange={handleCategoryFilterChange} disabled={loading}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Modelo */}
        <Select value={selectedModelId || 'all'} onValueChange={handleModelFilterChange} disabled={loading}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los modelos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los modelos</SelectItem>
            {modelOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Limpiar filtros */}
        {(selectedBrandId || selectedFamilyId || selectedCategoryId || selectedModelId || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={loading}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>


      {/* Tables — switch between variant list and grouped-by-model */}
      {viewMode === 'variants' ? (
        <>
          <TableProductDesktop
            products={tableProducts}
            loading={isTableLoading}
            searchQuery={searchQuery}
            onEdit={(product) => { setProductToEdit(product); setIsCreateModalOpen(true); }}
            onDelete={handleDeleteClick}
          />
          <TableProductMobile
            products={tableProducts}
            loading={isTableLoading}
            searchQuery={searchQuery}
            onEdit={(product: ProductView) => { setProductToEdit(product); setIsCreateModalOpen(true); }}
            onDelete={handleDeleteClick}
          />
        </>
      ) : (
        <>
          <TableProductGroupedDesktop
            products={tableProducts}
            loading={isTableLoading}
            searchQuery={searchQuery}
            onEdit={(product) => { setProductToEdit(product); setIsCreateModalOpen(true); }}
            onDelete={handleDeleteClick}
          />
          <TableProductGroupedMobile
            products={tableProducts}
            loading={isTableLoading}
            searchQuery={searchQuery}
            onEdit={(product: ProductView) => { setProductToEdit(product); setIsCreateModalOpen(true); }}
            onDelete={handleDeleteClick}
          />
        </>
      )}


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
            itemName="productos"
          />
        </div>
      )}
        </>
      )}

      {sectionTab === 'accessories' && (
        <>
          {/* ── Accessory search + new button ── */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <SearchInput
              value={accSearchQuery}
              onChange={setAccSearch}
              isLoading={accLoading}
            />
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setAccessoryToEdit(null);
                setIsCreateModalOpen(true);
              }}
              disabled={accLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Accesorio
            </Button>
          </div>

          {/* ── Accessory tables ── */}
          <TableAccessoryDesktop
            accessories={accessories}
            loading={accLoading}
            searchQuery={accSearchQuery}
            onEdit={(a) => { setAccessoryToEdit(a); setIsCreateModalOpen(true); }}
            onDelete={handleAccDeleteClick}
          />
          <TableAccessoryMobile
            accessories={accessories}
            loading={accLoading}
            searchQuery={accSearchQuery}
            onEdit={(a) => { setAccessoryToEdit(a); setIsCreateModalOpen(true); }}
            onDelete={handleAccDeleteClick}
          />

          {!accLoading && accTotalItems > 0 && (
            <div className="w-full">
              <DataPagination
                currentPage={accCurrentPage}
                totalPages={accTotalPages}
                totalItems={accTotalItems}
                itemsPerPage={accPageSize}
                onPageChange={setAccPage}
                onItemsPerPageChange={setAccPageSize}
                startIndex={(accCurrentPage - 1) * accPageSize + 1}
                endIndex={Math.min(accCurrentPage * accPageSize, accTotalItems)}
                itemName="accesorios"
              />
            </div>
          )}
        </>
      )}

      {/* Modal de Creación/Edición de Producto */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setProductToEdit(null);
          setAccessoryToEdit(null);
        }}
        onSuccess={async () => {
          setIsCreateModalOpen(false);
          setProductToEdit(null);
          setAccessoryToEdit(null);
          await refresh();
          await refreshAccessories();
        }}
        createdBy={user?.id || "current-user"}
        productToEdit={productToEdit}
        accessoryToEdit={accessoryToEdit}
      />

      {/* Dialog de Confirmación de Eliminación de Producto */}
      <CustomDialog
        isOpen={deleteDialogOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        loading={loading}
        title="¿Eliminar producto?"
        description={`¿Estás seguro de que deseas eliminar el producto "${productToDelete?.name ?? ''}"? Esta acción no se puede deshacer.`}
        textConfirm="Eliminar"
        textCancel="Cancelar"
      />

      {/* Dialog de Confirmación de Eliminación de Accesorio */}
      <CustomDialog
        isOpen={deleteAccessoryDialogOpen}
        onCancel={handleAccCancelDelete}
        onConfirm={handleAccConfirmDelete}
        loading={accLoading}
        title="¿Eliminar accesorio?"
        description={`¿Estás seguro de que deseas eliminar el accesorio "${accessoryToDelete?.name ?? ''}"? Esta acción no se puede deshacer.`}
        textConfirm="Eliminar"
        textCancel="Cancelar"
      />

      {/* Modal de Importación desde Excel */}
      <UploadExcelProductModal
        isOpen={isUploadExcelModalOpen}
        onClose={() => setIsUploadExcelModalOpen(false)}
        onSuccess={handleImportSuccess}
        createdBy={user?.id || "current-user"}
      />
    </div>
  );
};

export const InventoryPage = memo(InventoryPageComponent);
