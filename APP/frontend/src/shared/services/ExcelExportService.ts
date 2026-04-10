import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { IEntity } from '../types/UtilTypes';

/**
 * Configuración para la exportación a Excel
 */
export interface ExcelExportConfig {
  /** Título del reporte */
  title: string;
  /** Nombre del archivo (sin extensión) */
  fileName: string;
  /** Nombre del usuario que exporta */
  exportedBy: string;
  /** Nombre de la hoja (opcional, por defecto "Datos") */
  sheetName?: string;
  /** Mapeo personalizado de nombres de columnas (opcional) */
  columnMapping?: Record<string, string>;
  /** Columnas a excluir además de las de IEntity (opcional) */
  excludeColumns?: string[];
}

/**
 * Servicio para exportar datos a Excel
 */
class ExcelExportService {
  /**
   * Campos de IEntity que se excluyen automáticamente
   */
  private readonly ENTITY_FIELDS: (keyof IEntity)[] = [
    'id',
    'createdBy',
    'updatedBy',
    'isDeleted',
    'sincronized',
    'updatedAt',
 
  ];

  /**
   * Exporta una lista de objetos a Excel
   * @param data Lista de objetos que extienden IEntity
   * @param config Configuración de la exportación
   */
  async exportToExcel<T extends IEntity>(data: T[], config: ExcelExportConfig): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(config.sheetName || 'Datos');

    // Cabecera profesional
    sheet.mergeCells('A1', 'E1');
    sheet.getCell('A1').value = config.title;
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

    sheet.mergeCells('A2', 'E2');
    sheet.getCell('A2').value = `Fecha: ${this.formatDate(new Date())}`;
    sheet.getCell('A2').font = { size: 12, bold: true };
    sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

    sheet.mergeCells('A3', 'E3');
    sheet.getCell('A3').value = `Exportado por: ${config.exportedBy}`;
    sheet.getCell('A3').font = { size: 12 };
    sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

    // Línea vacía
    sheet.addRow([]);

    // Columnas: respetar orden del columnMapping si existe
    let columns: string[];
    if (config.columnMapping) {
      // Usar el orden de las claves en columnMapping
      columns = Object.keys(config.columnMapping).filter(
        (col) => !this.ENTITY_FIELDS.includes(col as keyof IEntity) &&
                 !(config.excludeColumns?.includes(col) ?? false)
      );
    } else {
      // Usar el orden natural de las columnas
      columns = this.getFilteredColumns(data[0], config.excludeColumns);
    }
    
    const headers = columns.map((col) => config.columnMapping?.[col] || this.formatColumnName(col));
    const headerRow = sheet.addRow(headers);

    // Estilos de títulos
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '006b71' } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        left: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        right: { style: 'thin', color: { argb: 'FFAAAAAA' } },
      };
    });

    // Datos
    data.forEach((item) => {
      const row = columns.map((col) => this.formatCellValue((item as any)[col]));
      const dataRow = sheet.addRow(row);
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    });

    // Ajustar ancho de columnas automáticamente
    sheet.columns.forEach((col, i) => {
      let maxLength = 10;
      sheet.eachRow((row) => {
        const cell = row.getCell(i + 1);
        let cellValue = cell.value;
        if (cellValue == null) return;
        if (typeof cellValue === 'object' && (cellValue as any).richText) {
          // exceljs richText
          cellValue = (cellValue as any).richText.map((t: any) => t.text).join('');
        }
        const length = String(cellValue).length;
        if (length > maxLength) maxLength = length;
      });
      col.width = Math.min(maxLength + 2, 50);
    });

    // Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${config.fileName}.xlsx`);
  }

  /**
   * Prepara los datos para la hoja de Excel incluyendo cabecera
   */
  // ...existing code...

  /**
   * Obtiene las columnas filtradas (sin campos de IEntity)
   */
  private getFilteredColumns<T extends IEntity>(
    sampleItem: T,
    additionalExclusions: string[] = []
  ): string[] {
    const allKeys = Object.keys(sampleItem);
    const exclusionSet = new Set([
      ...this.ENTITY_FIELDS,
      ...additionalExclusions,
    ]);

    return allKeys.filter((key) => !exclusionSet.has(key));
  }

  /**
   * Formatea el nombre de una columna (de camelCase a Title Case)
   */
  private formatColumnName(columnName: string): string {
    return columnName
      .replace(/([A-Z])/g, ' $1') // Agrega espacio antes de mayúsculas
      .replace(/^./, (str) => str.toUpperCase()) // Primera letra mayúscula
      .trim();
  }

  /**
   * Formatea el valor de una celda
   */
  private formatCellValue(value: any): any {
    if (value === null || value === undefined) {
      return '';
    }

    // Números: limitar a 2 decimales
    if (typeof value === 'number') {
      return Number(value.toFixed(2));
    }

    // Booleanos: convertir a texto
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    // Fechas: string ISO o Date
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return this.formatDate(date);
      }
    }
    if (value instanceof Date) {
      return this.formatDate(value);
    }

    // Objetos: convertir a JSON string
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  }

  /**
   * Formatea una fecha a string
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ...resto del código sin cambios...
}

// Instancia única del servicio
export const excelExportService = new ExcelExportService();
