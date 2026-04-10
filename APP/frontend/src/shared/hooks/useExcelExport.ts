import { useState, useCallback } from 'react';
import { ExcelExporter } from '@/shared/utils/excel.utils';
import { useAuthStore } from '@/shared/store/authStore';
import type {
  ExportConfig,
  ExportFieldConfig,
  ExportMetadata,
  DataExtractor
} from '@/shared/types/ExportTypes';

interface UseExcelExportProps<T> {
  title: string;
  dataExtractor: DataExtractor<T>;
  defaultFields: ExportFieldConfig<T>[];
  fileName?: string;
  getAdditionalMetadata?: () => Record<string, any>;
}

interface UseExcelExportReturn<T> {
  isExporting: boolean;
  isModalOpen: boolean;
  exportFields: ExportFieldConfig<T>[];
  openExportModal: () => void;
  closeExportModal: () => void;
  handleExport: (config: ExportConfig<T>) => Promise<void>;
}

/**
 * Hook reutilizable para exportación a Excel
 * 
 * Obtiene automáticamente el nombre del usuario desde Redux para incluirlo
 * en los metadatos del archivo exportado.
 * 
 * @example
 * ```tsx
 * const {
 *   isExporting,
 *   isModalOpen,
 *   exportFields,
 *   openExportModal,
 *   closeExportModal,
 *   handleExport
 * } = useExcelExport({
 *   title: 'Catálogo de Medicamentos',
 *   dataExtractor: getMedicationCatalogExport,
 *   defaultFields: medicationFields,
 *   fileName: 'catalogo_medicamentos'
 * });
 * ```
 */
export function useExcelExport<T>({
  title,
  dataExtractor,
  defaultFields,
  fileName,
  getAdditionalMetadata
}: UseExcelExportProps<T>): UseExcelExportReturn<T> {
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user: currentUser } = useAuthStore();

  const openExportModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeExportModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleExport = useCallback(async (config: ExportConfig<T>) => {
    try {
      setIsExporting(true);
      
      // Obtener los campos seleccionados
      const selectedFields = config.fields
        .filter(field => field.selected)
        .map(field => String(field.key));
      
      // Obtener datos usando el extractor
      const exportData = await dataExtractor(config.dateRange, selectedFields);
      
      // Crear metadatos del reporte
      const metadata: ExportMetadata = {
        title: config.title,
        dateRange: {
          from: config.dateRange.from.toLocaleDateString(),
          to: config.dateRange.to.toLocaleDateString()
        },
        totalItems: exportData.length,
        exportDate: new Date().toLocaleDateString(),
        exportedBy: currentUser?.fullName || 'Usuario',
        ...(getAdditionalMetadata ? { filters: getAdditionalMetadata() } : {})
      };

      // Generar nombre del archivo
      const baseFileName = fileName || title.toLowerCase().replace(/\s+/g, '_');
      const finalFileName = `${baseFileName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Exportar usando la utilidad
      await ExcelExporter.exportToExcel(exportData, config, metadata, finalFileName);
      
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setIsExporting(false);
    }
  }, [dataExtractor, fileName, title, getAdditionalMetadata]);

  return {
    isExporting,
    isModalOpen,
    exportFields: defaultFields,
    openExportModal,
    closeExportModal,
    handleExport
  };
}
