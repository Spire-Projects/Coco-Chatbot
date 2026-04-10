// ============================================================================
// TIPOS PARA EXPORTACIÓN EXCEL
// ============================================================================

/**
 * Configuración de campo para exportación
 */
export interface ExportFieldConfig<T = any> {
  key: keyof T | string;
  label: string;
  selected: boolean;
  format?: (value: any) => string | number;
  width?: number;
}

/**
 * Configuración de rango de fechas para exportación
 */
export interface ExportDateRange {
  from: Date;
  to: Date;
}

/**
 * Configuración de exportación
 */
export interface ExportConfig<T = any> {
  title: string;
  fields: ExportFieldConfig<T>[];
  dateRange: ExportDateRange;
  includeMetadata: boolean;
}

/**
 * Metadatos del reporte de exportación
 */
export interface ExportMetadata {
  title: string;
  dateRange: {
    from: string;
    to: string;
  };
  totalItems: number;
  exportDate: string;
  exportedBy?: string;
  filters?: Record<string, any>;
}

/**
 * Función extractora de datos para exportación
 */
export type DataExtractor<T> = (
  dateRange: ExportDateRange,
  selectedFields: string[]
) => Promise<T[]>;

/**
 * Props para el hook de exportación
 */
export interface UseExcelExportProps<T> {
  title: string;
  dataExtractor: DataExtractor<T>;
  defaultFields: ExportFieldConfig<T>[];
  fileName?: string;
}

/**
 * Return type del hook de exportación
 */
export interface UseExcelExportReturn {
  isExporting: boolean;
  exportData: () => Promise<void>;
  openExportModal: () => void;
  closeExportModal: () => void;
  isModalOpen: boolean;
}
