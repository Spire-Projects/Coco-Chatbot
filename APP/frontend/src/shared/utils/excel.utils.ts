import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { 
  ExportConfig, 
  ExportMetadata,
  ExportFieldConfig
} from '../types/ExportTypes';

/**
 * Utilidad avanzada para exportar datos a Excel con estilos completos usando ExcelJS
 */
export class ExcelExporter {
  /**
   * Exportar datos a Excel con estilos profesionales
   */
  static async exportToExcel<T>(
    data: T[],
    config: ExportConfig<T>,
    metadata: ExportMetadata,
    fileName: string = 'export.xlsx'
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Metadatos del archivo
      workbook.creator = metadata.exportedBy || 'FarmaApp';
      workbook.lastModifiedBy = metadata.exportedBy || 'FarmaApp';
      workbook.created = new Date();
      workbook.modified = new Date();

      // 1. Crear hoja de metadatos si se solicita
      if (config.includeMetadata) {
        this.createMetadataSheet(workbook, metadata);
      }

      // 2. Crear hoja de datos principales
      this.createDataSheet(workbook, data, config);

      // 3. Generar archivo y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Error al exportar archivo Excel');
    }
  }

  /**
   * Crear hoja de metadatos con estilos profesionales
   */
  private static createMetadataSheet(
    workbook: ExcelJS.Workbook, 
    metadata: ExportMetadata
  ): void {
    const worksheet = workbook.addWorksheet('Información');

    // Configurar columnas
    worksheet.columns = [
      { key: 'label', width: 25 },
      { key: 'value', width: 40 }
    ];

    // Título principal
    const titleRow = worksheet.addRow(['INFORMACIÓN DEL REPORTE', '']);
    worksheet.mergeCells('A1:B1');
    titleRow.getCell(1).style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thick', color: { argb: '000000' } },
        bottom: { style: 'thick', color: { argb: '000000' } },
        left: { style: 'thick', color: { argb: '000000' } },
        right: { style: 'thick', color: { argb: '000000' } }
      }
    };
    titleRow.height = 35;

    // Línea en blanco
    worksheet.addRow(['', '']);

    // Información del reporte
    this.addInfoRow(worksheet, 'Título:', metadata.title);
    this.addInfoRow(worksheet, 'Fecha de exportación:', metadata.exportDate);
    this.addInfoRow(worksheet, 'Rango de fechas:', `${metadata.dateRange.from} - ${metadata.dateRange.to}`);
    this.addInfoRow(worksheet, 'Total de registros:', metadata.totalItems.toString());
    
    if (metadata.exportedBy) {
      this.addInfoRow(worksheet, 'Exportado por:', metadata.exportedBy);
    }


  }

  /**
   * Agregar fila de información con estilos
   */
  private static addInfoRow(
    worksheet: ExcelJS.Worksheet, 
    label: string, 
    value: string
  ): void {
    const row = worksheet.addRow([label, value]);
    
    // Estilo para etiqueta
    row.getCell(1).style = {
      font: { bold: true, size: 11 },
      alignment: { horizontal: 'right', vertical: 'middle' }
    };

    // Estilo para valor
    row.getCell(2).style = {
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: {
        bottom: { style: 'thin', color: { argb: 'DDDDDD' } }
      }
    };

    row.height = 20;
  }

  /**
   * Crear hoja de datos con tabla estilizada
   */
  private static createDataSheet<T>(
    workbook: ExcelJS.Workbook,
    data: T[], 
    config: ExportConfig<T>
  ): void {
    const worksheet = workbook.addWorksheet('Datos');
    
    // Filtrar solo campos seleccionados
    const selectedFields = config.fields.filter(field => field.selected);
    
    // Configurar columnas con ancho inicial
    worksheet.columns = selectedFields.map(field => ({
      key: String(field.key),
      header: field.label,
      width: field.width || 15
    }));

    // Estilo para headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      };
    });
    headerRow.height = 25;

    // Agregar datos
    data.forEach((item, index) => {
      const rowData = selectedFields.map(field => {
        const value = this.getNestedValue(item, String(field.key));
        return field.format ? field.format(value) : value;
      });
      
      const row = worksheet.addRow(rowData);
      const isEvenRow = (index + 2) % 2 === 0; // +2 porque empezamos en fila 2

      // Aplicar estilos a cada celda
      row.eachCell((cell) => {
        cell.style = {
          alignment: { vertical: 'middle' },
          border: {
            top: { style: 'thin', color: { argb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
            left: { style: 'thin', color: { argb: 'CCCCCC' } },
            right: { style: 'thin', color: { argb: 'CCCCCC' } }
          },
          fill: isEvenRow ? 
            { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } } : 
            undefined
        };
      });

      row.height = 18;
    });

    // Aplicar formato condicional si está configurado
    this.applyConditionalFormatting(worksheet, data, selectedFields);

    // Auto-ajustar ancho de columnas después de agregar todos los datos
    this.autoFitColumns(worksheet, selectedFields);

    // Aplicar autofilter
    if (data.length > 0) {
      worksheet.autoFilter = {
        from: 'A1',
        to: { row: data.length + 1, column: selectedFields.length }
      };
    }

    // Congelar primera fila (headers)
    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];
  }

  /**
   * Obtener valor anidado de un objeto usando dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  /**
   * Aplicar formato condicional a celdas específicas con ExcelJS
   */
  private static applyConditionalFormatting<T>(
    worksheet: ExcelJS.Worksheet,
    data: T[],
    selectedFields: ExportFieldConfig<T>[]
  ): void {
    // Aplicar reglas de formato condicional personalizadas
    selectedFields.forEach((field, colIndex) => {
      const columnLetter = String.fromCharCode(65 + colIndex); // A, B, C, etc.
      
      // Ejemplo: resaltar valores numéricos bajos en rojo
      if (String(field.key).includes('stock') || String(field.key).includes('cantidad')) {
        worksheet.addConditionalFormatting({
          ref: `${columnLetter}2:${columnLetter}${data.length + 1}`,
          rules: [
            {
              type: 'cellIs',
              operator: 'lessThan',
              priority: 1,
              formulae: [10],
              style: {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  bgColor: { argb: 'FFFFE6E6' }
                },
                font: {
                  color: { argb: 'FFCC0000' }
                }
              }
            }
          ]
        });
      }
      
      // Formato condicional para estado de stock (en español)
      if (String(field.key).includes('stockStatus') || String(field.key).includes('estado')) {
        // Sin Stock - Rojo
        worksheet.addConditionalFormatting({
          ref: `${columnLetter}2:${columnLetter}${data.length + 1}`,
          rules: [
            {
              type: 'containsText',
              operator: 'containsText',
              priority: 3,
              text: 'Sin Stock',
              style: {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  bgColor: { argb: 'FFFFE6E6' }
                },
                font: {
                  color: { argb: 'FFCC0000' },
                  bold: true
                }
              }
            }
          ]
        });

        // Stock Bajo - Amarillo
        worksheet.addConditionalFormatting({
          ref: `${columnLetter}2:${columnLetter}${data.length + 1}`,
          rules: [
            {
              type: 'containsText',
              operator: 'containsText',
              priority: 4,
              text: 'Stock Bajo',
              style: {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  bgColor: { argb: 'FFFFF2CC' }
                },
                font: {
                  color: { argb: 'FFBF9000' },
                  bold: true
                }
              }
            }
          ]
        });

        // En Stock - Verde
        worksheet.addConditionalFormatting({
          ref: `${columnLetter}2:${columnLetter}${data.length + 1}`,
          rules: [
            {
              type: 'containsText',
              operator: 'containsText',
              priority: 5,
              text: 'En Stock',
              style: {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  bgColor: { argb: 'FFE6F7E6' }
                },
                font: {
                  color: { argb: 'FF00AA00' },
                  bold: true
                }
              }
            }
          ]
        });
      }
      
      // Ejemplo: resaltar precios altos en verde
      if (String(field.key).includes('precio') || String(field.key).includes('price')) {
        worksheet.addConditionalFormatting({
          ref: `${columnLetter}2:${columnLetter}${data.length + 1}`,
          rules: [
            {
              type: 'cellIs',
              operator: 'greaterThan',
              priority: 2,
              formulae: [100],
              style: {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  bgColor: { argb: 'FFE6F7E6' }
                },
                font: {
                  color: { argb: 'FF00AA00' }
                }
              }
            }
          ]
        });
      }
    });
  }

  /**
   * Formatear fecha para mostrar
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatear moneda
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  /**
   * Formatear número
   */
  static formatNumber(value: number, decimals: number = 0): string {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Crear estilos personalizados para diferentes tipos de datos
   */
  static createCustomStyles() {
    return {
      currency: {
        numFmt: '"$"#,##0.00',
        alignment: { horizontal: "right" }
      },
      percentage: {
        numFmt: '0.00%',
        alignment: { horizontal: "center" }
      },
      date: {
        numFmt: 'dd/mm/yyyy',
        alignment: { horizontal: "center" }
      },
      number: {
        numFmt: '#,##0',
        alignment: { horizontal: "right" }
      },
      warning: {
        fill: { fgColor: { rgb: "FFF2CC" } },
        font: { color: { rgb: "BF9000" } }
      },
      danger: {
        fill: { fgColor: { rgb: "FFE6E6" } },
        font: { color: { rgb: "CC0000" } }
      },
      success: {
        fill: { fgColor: { rgb: "E6F7E6" } },
        font: { color: { rgb: "00AA00" } }
      }
    };
  }

  /**
   * Método auxiliar para crear estilos de celdas complejos
   */
  static createCellStyle(options: {
    backgroundColor?: string;
    fontColor?: string;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    alignment?: 'left' | 'center' | 'right';
    borderStyle?: 'thin' | 'medium' | 'thick';
    numFormat?: string;
  }): Partial<ExcelJS.Style> {
    const style: Partial<ExcelJS.Style> = {};

    if (options.backgroundColor) {
      style.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: options.backgroundColor }
      };
    }

    if (options.fontColor || options.bold || options.italic || options.fontSize) {
      style.font = {
        color: options.fontColor ? { argb: options.fontColor } : undefined,
        bold: options.bold,
        italic: options.italic,
        size: options.fontSize
      };
    }

    if (options.alignment) {
      style.alignment = {
        horizontal: options.alignment,
        vertical: 'middle'
      };
    }

    if (options.borderStyle) {
      style.border = {
        top: { style: options.borderStyle },
        bottom: { style: options.borderStyle },
        left: { style: options.borderStyle },
        right: { style: options.borderStyle }
      };
    }

    if (options.numFormat) {
      style.numFmt = options.numFormat;
    }

    return style;
  }

  /**
   * Auto-ajustar el ancho de las columnas basado en el contenido
   */
  private static autoFitColumns<T>(
    worksheet: ExcelJS.Worksheet,
    selectedFields: ExportFieldConfig<T>[]
  ): void {
    selectedFields.forEach((field, colIndex) => {
      const column = worksheet.getColumn(colIndex + 1);
      let maxLength = 0;

      // Verificar el largo del header (con peso extra porque suele ser importante)
      const headerLength = field.label.length;
      maxLength = Math.max(maxLength, headerLength + 1); // +1 para dar espacio extra al header

      // Verificar el largo del contenido en cada fila
      column.eachCell((cell, rowNumber) => {
        if (cell.value && rowNumber > 1) { // Saltar el header (rowNumber 1)
          let cellLength = 0;
          
          // Manejar diferentes tipos de valores
          if (typeof cell.value === 'number') {
            // Para números, calcular ancho basado en formato
            cellLength = this.calculateNumberWidth(cell.value);
          } else if (cell.value instanceof Date) {
            // Para fechas, usar formato estándar
            cellLength = 20; // dd/mm/yyyy hh:mm formato
          } else {
            // Para texto, usar la longitud del string
            cellLength = String(cell.value).length;
          }
          
          maxLength = Math.max(maxLength, cellLength);
        }
      });

      // Calcular el ancho final con límites sensatos
      let calculatedWidth = maxLength + 2; // +2 para padding

      // Aplicar límites según el tipo de contenido probable
      const fieldKey = String(field.key).toLowerCase();
      
      if (fieldKey.includes('id') || fieldKey.includes('codigo')) {
        // IDs y códigos: más estrecho
        calculatedWidth = Math.min(Math.max(calculatedWidth, 8), 20);
      } else if (fieldKey.includes('nombre') || fieldKey.includes('descripcion') || fieldKey.includes('observacion')) {
        // Nombres y descripciones: más ancho
        calculatedWidth = Math.min(Math.max(calculatedWidth, 15), 60);
      } else if (fieldKey.includes('precio') || fieldKey.includes('total') || fieldKey.includes('importe')) {
        // Campos monetarios: ancho medio
        calculatedWidth = Math.min(Math.max(calculatedWidth, 12), 18);
      } else if (fieldKey.includes('fecha') || fieldKey.includes('date')) {
        // Fechas: ancho fijo
        calculatedWidth = Math.min(Math.max(calculatedWidth, 16), 22);
      } else {
        // Otros campos: límites generales
        calculatedWidth = Math.min(Math.max(calculatedWidth, 10), 40);
      }
      
      // Si el campo tiene un ancho específico configurado, respetarlo como mínimo
      const finalWidth = field.width ? Math.max(field.width, calculatedWidth) : calculatedWidth;
      
      column.width = finalWidth;
    });
  }

  /**
   * Calcular ancho necesario para números (considerando formato)
   */
  private static calculateNumberWidth(value: number): number {
    const stringValue = String(value);
    
    // Para números con decimales, agregar espacio extra
    if (stringValue.includes('.')) {
      return stringValue.length + 2;
    }
    
    // Para números enteros grandes, usar formato con separadores
    if (Math.abs(value) >= 1000) {
      return stringValue.length + Math.floor(stringValue.length / 3); // Espacio para separadores de miles
    }
    
    return stringValue.length;
  }

  /**
   * Traducciones estándar para valores comunes en la aplicación
   */
  static getTranslations() {
    return {
      // Estados de stock
      stockStatus: {
        'out_of_stock': 'Sin Stock',
        'low_stock': 'Stock Bajo', 
        'in_stock': 'En Stock',
        'overstocked': 'Exceso Stock'
      },
      
      // Estados generales
      status: {
        'active': 'Activo',
        'inactive': 'Inactivo',
        'pending': 'Pendiente',
        'completed': 'Completado',
        'cancelled': 'Cancelado',
        'in_progress': 'En Proceso'
      },
      
      // Tipos de medicamentos
      medicationType: {
        'prescription': 'Con Receta',
        'over_the_counter': 'Venta Libre',
        'controlled': 'Controlado',
        'generic': 'Genérico',
        'brand': 'Marca'
      },
      
      // Métodos de pago
      paymentMethod: {
        'cash': 'Efectivo',
        'qr': 'QR',
        
      },
      
      // Roles de usuario
      userRole: {
        'superadmin': 'Super Administrador',
        'admin': 'Administrador',
        'vendedor': 'Vendedor'
      }
    };
  }

  /**
   * Función helper para traducir valores usando las traducciones estándar
   */
  static translateValue(category: string, value: string): string {
    const translations = this.getTranslations();
    const categoryTranslations = translations[category as keyof typeof translations];
    
    if (categoryTranslations && categoryTranslations[value as keyof typeof categoryTranslations]) {
      return categoryTranslations[value as keyof typeof categoryTranslations];
    }
    
    return value; // Retorna el valor original si no hay traducción
  }
}
