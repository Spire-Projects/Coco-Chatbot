// Ejemplo de configuración avanzada de exportación con estilos para medicamentos

import type { ExportFieldConfig } from '@/shared/types/ExportTypes';
import type { MedicationCatalogView } from '@/shared/types/MedicationViewTypes';
import { ExcelExporter } from '@/shared/utils/excel.utils';

/**
 * Configuración avanzada de campos para exportación de medicamentos
 * Incluye formateo especial y estilos condicionales
 */
export const advancedMedicationExportFields: ExportFieldConfig<MedicationCatalogView>[] = [
  { 
    key: 'comercialName', 
    label: 'Nombre Comercial', 
    selected: true,
    width: 20
  },
  { 
    key: 'tradeName', 
    label: 'Nombre de Marca', 
    selected: true,
    width: 20
  },
  { 
    key: 'genericName', 
    label: 'Nombre Genérico', 
    selected: true,
    width: 18
  },
  { 
    key: 'manufacturerName', 
    label: 'Fabricante', 
    selected: true,
    width: 15
  },
  { 
    key: 'categoryName', 
    label: 'Categoría', 
    selected: true,
    width: 15
  },
  { 
    key: 'totalActiveStock', 
    label: 'Stock Total', 
    selected: true,
    width: 12,
    format: (value) => value || 0 // Formatear números
  },
  { 
    key: 'activeBatchCount', 
    label: 'Lotes Activos', 
    selected: true,
    width: 12,
    format: (value) => value || 0
  },
  { 
    key: 'stockStatus', 
    label: 'Estado de Stock', 
    selected: true,
    width: 15,
    format: (value) => ExcelExporter.translateValue('stockStatus', value)
  },
  { 
    key: 'createdAt', 
    label: 'Fecha de Creación', 
    selected: false,
    width: 15,
    format: (value) => new Date(value).toLocaleDateString('es-ES')
  },
  { 
    key: 'status', 
    label: 'Estado General', 
    selected: false,
    width: 12,
    format: (value) => ExcelExporter.translateValue('status', value)
  },
  { 
    key: 'paymentMethod', 
    label: 'Método de Pago', 
    selected: false,
    width: 15,
    format: (value) => ExcelExporter.translateValue('paymentMethod', value)
  },
  { 
    key: 'userRole', 
    label: 'Rol de Usuario', 
    selected: false,
    width: 15,
    format: (value) => ExcelExporter.translateValue('userRole', value)
  },
];

/**
 * Función para exportar medicamentos con estilos avanzados
 */
export async function exportMedicationsWithAdvancedStyles(
  data: MedicationCatalogView[],
  config: any,
  metadata: any,
  fileName: string
) {
  // Crear el workbook estándar
  await ExcelExporter.exportToExcel(data, config, metadata, fileName);
  
  // Nota: Para aplicar formato condicional más avanzado,
  // se puede extender el método exportToExcel o crear una versión personalizada
}

/**
 * Ejemplo de cómo aplicar formato condicional para medicamentos
 */
export function applyMedicationConditionalFormatting(
  _worksheet: any, // Parámetro no utilizado en el ejemplo
  _data: MedicationCatalogView[] // Parámetro no utilizado en el ejemplo
) {
  const customStyles = ExcelExporter.createCustomStyles();
  
  // Este es un ejemplo de cómo configurar formato condicional
  console.log('Ejemplo de configuración:', {
    fieldMapping: [
      { key: 'totalActiveStock' as keyof MedicationCatalogView, colIndex: 5 },
      { key: 'stockStatus' as keyof MedicationCatalogView, colIndex: 7 }
    ],
    conditions: [
    {
      field: 'totalActiveStock' as keyof MedicationCatalogView,
      condition: (value: number) => value === 0,
      style: customStyles.danger // Rojo para sin stock
    },
    {
      field: 'totalActiveStock' as keyof MedicationCatalogView,
      condition: (value: number) => value > 0 && value <= 10,
      style: customStyles.warning // Amarillo para stock bajo
    },
    {
      field: 'totalActiveStock' as keyof MedicationCatalogView,
      condition: (value: number) => value > 10,
      style: customStyles.success // Verde para stock normal
    },
    {
      field: 'stockStatus' as keyof MedicationCatalogView,
      condition: (value: string) => value === 'out_of_stock',
      style: customStyles.danger
    },
    {
      field: 'stockStatus' as keyof MedicationCatalogView,
      condition: (value: string) => value === 'low_stock',
      style: customStyles.warning
    }]
  });

  // Aplicar formato condicional
  // Nota: este método debe estar disponible públicamente en la clase ExcelExporter
  // ExcelExporter.applyConditionalFormatting(worksheet, data, selectedFields);
}

/**
 * Configuración completa para exportación avanzada de medicamentos
 */
export const medicationAdvancedExportConfig = {
  title: 'Catálogo de Medicamentos - Reporte Avanzado',
  fields: advancedMedicationExportFields,
  includeMetadata: true,
  // Función personalizada para post-procesamiento
  postProcess: (worksheet: any, data: MedicationCatalogView[]) => {
    applyMedicationConditionalFormatting(worksheet, data);
  }
};

/**
 * Ejemplo de estilos personalizados para diferentes tipos de medicamentos
 */
export const medicationCustomStyles = {
  // Estilo para medicamentos vencidos o próximos a vencer
  expiring: {
    fill: { fgColor: { rgb: "FFCCCC" } },
    font: { color: { rgb: "990000" }, italic: true }
  },
  
  // Estilo para medicamentos de alta rotación
  highTurnover: {
    fill: { fgColor: { rgb: "CCFFCC" } },
    font: { color: { rgb: "006600" }, bold: true }
  },
  
  // Estilo para medicamentos controlados
  controlled: {
    fill: { fgColor: { rgb: "FFFFCC" } },
    font: { color: { rgb: "CC6600" } },
    border: {
      top: { style: "thick", color: { rgb: "FF9900" } },
      bottom: { style: "thick", color: { rgb: "FF9900" } },
      left: { style: "thick", color: { rgb: "FF9900" } },
      right: { style: "thick", color: { rgb: "FF9900" } }
    }
  }
};
