// ============================================================================
// INTERFACES PARA VISTAS DE CATÁLOGO DE MEDICAMENTOS
// ============================================================================

/**
 * Interface optimizada para la vista de catálogo de medicamentos
 * Incluye información agregada de stock y datos resueltos para UI
 */
export interface MedicationCatalogView {
  // Datos básicos del medicamento
  id: string;
  comercialName: string;
  tradeName: string;
  genericName: string;
  concentration: string;
  presentation: string;
  prescriptionRequired: boolean;
  barcode?: string;

  // Datos resueltos (nombres en lugar de IDs para UI)
  manufacturerName: string; // resuelto desde manufacturerId
  categoryName: string; // resuelto desde categoryId
  pharmaceuticalFormName: string; // resuelto desde pharmaceuticalFormId

  // Información de stock agregada (calculada desde batches activos)
  totalActiveStock: number; // suma de quantity de batches activos (quantity > 0 && !expired)
  activeBatchCount: number; // cantidad de batches con stock disponible
  hasStock: boolean; // true si totalActiveStock > 0

  // Información del batch más crítico
  oldestActiveBatch?: {
    id: string;
    batchId: string;
    expirationDate: string;
    quantity: number;
    daysToExpiration: number; // calculado dinámicamente
  };

  activeBatches?: {
    id: string;
    batchId: string;
    expirationDate: string;
    quantity: number;
    daysToExpiration: number;
    purchasePrice: number;
    sellingPrice: number;
    purchaseDate: string;
    supplier: string;
  }[];

  // Estado del medicamento
  stockStatus: "out_of_stock" | "low_stock" | "in_stock" | "overstocked";

  // Metadatos
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filtros específicos para el catálogo de medicamentos
 * Incluye filtros tanto de medicamento como de stock
 */
export interface MedicationCatalogFilters {
  // Filtros de medicamento
  categoryId?: string;
  manufacturerId?: string;
  pharmaceuticalFormId?: string;
  searchQuery?: string; // búsqueda en tradeName, genericName, comercialName

  // Filtros de stock
  hasStock?: boolean; // solo medicamentos con stock > 0
  stockStatus?: "out_of_stock" | "low_stock" | "in_stock" | "overstocked";
  minStock?: number; // stock mínimo
  maxStock?: number; // stock máximo

  // Filtros de vencimiento
  expiringInDays?: number; // medicamentos con lotes que vencen en X días
  hasExpiredBatches?: boolean; // medicamentos con lotes vencidos

  // Filtros de fecha
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

/**
 * Opciones de ordenamiento para el catálogo
 */
export type MedicationCatalogSortField =
  | "tradeName"
  | "genericName"
  | "comercialName"
  | "categoryName"
  | "manufacturerName"
  | "totalActiveStock"
  | "activeBatchCount"
  | "createdAt"
  | "updatedAt";

export type SortOrder = "asc" | "desc";

export interface MedicationCatalogSort {
  field: MedicationCatalogSortField;
  order: SortOrder;
}

/**
 * Parámetros para consultas del catálogo
 */
export interface MedicationCatalogQueryParams {
  page: number;
  size: number;
  filters?: MedicationCatalogFilters;
  sort?: MedicationCatalogSort;
}

// ============================================================================
// INTERFACES PARA ESTADÍSTICAS Y RESÚMENES
// ============================================================================

/**
 * Estadísticas generales del catálogo de medicamentos
 */
export interface MedicationCatalogStatistics {
  // Conteos generales
  totalMedications: number;
  medicationsWithStock: number;
  medicationsOutOfStock: number;

  // Distribución por categoría
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    stockTotal: number;
  }>;

  // Distribución por fabricante
  byManufacturer: Array<{
    manufacturerId: string;
    manufacturerName: string;
    count: number;
    stockTotal: number;
  }>;

  // Estados de stock
  stockDistribution: {
    outOfStock: number;
    lowStock: number;
    inStock: number;
    overstocked: number;
  };

  // Información de vencimiento
  expirationAlert: {
    expiringIn7Days: number;
    expiringIn30Days: number;
    expired: number;
  };
}

/**
 * Resumen rápido para dashboard/header
 */
export interface MedicationCatalogSummary {
  totalMedications: number;
  totalStock: number;
  medicationsWithStock: number;
  criticalStock: number; // medicamentos con stock bajo o sin stock
  expiringBatches: number; // lotes que vencen pronto
}

// ============================================================================
// INTERFACES PARA ACCIONES Y ESTADOS
// ============================================================================

/**
 * Estados de carga para componentes de catálogo
 */
export interface MedicationCatalogLoadingState {
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * Configuración de umbrales para alertas de stock
 */
export interface StockThresholds {
  lowStock: number; // por debajo de este valor se considera stock bajo
  overstock: number; // por encima de este valor se considera exceso
  criticalDays: number; // días para considerar un lote como "próximo a vencer"
}

/**
 * Configuración por defecto para umbrales de stock
 */
export const DEFAULT_STOCK_THRESHOLDS: StockThresholds = {
  lowStock: 10,
  overstock: 1000,
  criticalDays: 30,
};

// ============================================================================
// UTILITY TYPES Y HELPERS
// ============================================================================

/**
 * Función helper para determinar el estado de stock
 */
export const getStockStatus = (
  stock: number,
  thresholds: StockThresholds = DEFAULT_STOCK_THRESHOLDS
): MedicationCatalogView["stockStatus"] => {
  if (stock === 0) return "out_of_stock";
  if (stock <= thresholds.lowStock) return "low_stock";
  return "in_stock";
};

/**
 * Función helper para calcular días hasta vencimiento
 */
export const calculateDaysToExpiration = (expirationDate: string): number => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Función helper para verificar si un batch está activo
 */
export const isActiveBatch = (
  quantity: number,
  expirationDate: string
): boolean => {
  return quantity > 0 && calculateDaysToExpiration(expirationDate) > 0;
};
