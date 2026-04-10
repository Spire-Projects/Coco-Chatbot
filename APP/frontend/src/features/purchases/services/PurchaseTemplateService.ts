import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Servicio para generar plantillas de Excel para importación de compras
 */
export class PurchaseTemplateService {
  /**
   * Genera y descarga una plantilla de Excel para importación de compras
   * La plantilla incluye:
   * - Headers con fondo verde y texto blanco en negrita
   * - Formato apropiado para números y moneda
   * - Fórmula automática en "Precio Total" (=F*G) para calcular cantidad × precio unitario
   * - 50 filas vacías con fórmulas pre-configuradas
   */
  static async generateTemplate(): Promise<void> {
    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Compras');

    // Definir headers
    const headers = [
      'Fecha Compra',
      'Proveedor',
      'Número de Comprobante',
      'Producto',
      'Código',
      'Categoría',
      'Cantidad Comprada',
      'Precio Unitario',
      'Precio Total',
      'Precio de Venta',
      'IMEIs',
      'Notas'
    ];

    // Agregar fila de headers con estilo
    const headerRow = sheet.addRow(headers);
    
    // Estilos de encabezado (verde profesional con texto blanco)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FF4CAF50' } // Verde Material Design
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Definir anchos de columna
    sheet.columns = [
      { key: 'fechaCompra', width: 15 },             // A - Fecha Compra
      { key: 'proveedor', width: 20 },               // B - Proveedor
      { key: 'numeroComprobante', width: 25 },       // C - Número de Comprobante
      { key: 'producto', width: 30 },                // D - Producto
      { key: 'codigo', width: 15 },                  // E - Código
      { key: 'categoria', width: 20 },               // F - Categoría
      { key: 'cantidadComprada', width: 18 },        // G - Cantidad Comprada
      { key: 'precioUnitario', width: 18 },          // H - Precio Unitario
      { key: 'precioTotal', width: 18 },             // I - Precio Total
      { key: 'precioVenta', width: 18 },             // J - Precio de Venta
      { key: 'imeis', width: 40 },                   // K - IMEIs
      { key: 'notas', width: 30 }                    // L - Notas
    ];

    // Agregar 50 filas vacías con fórmulas en la columna I (Precio Total)
    for (let i = 2; i <= 51; i++) {
      const row = sheet.addRow([]);
      
      // Columna I (Precio Total): fórmula =G*H (Cantidad × Precio Unitario)
      const cellI = row.getCell(9);
      cellI.value = { formula: `G${i}*H${i}`, result: 0 };
      row.getCell(1).numFmt = 'yyyy-mm-dd'; // Fecha Compra
      
      // Formato de número para columnas numéricas
      row.getCell(7).numFmt = '#,##0.00';  // Cantidad Comprada
      row.getCell(8).numFmt = '#,##0.00';  // Precio Unitario
      row.getCell(9).numFmt = '#,##0.00';  // Precio Total
      row.getCell(10).numFmt = '#,##0.00'; // Precio de Venta
      
      // Bordes sutiles para todas las celdas
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Hint de formato para IMEIs (uno por linea)
      row.getCell(11).note = 'Ingresa IMEIs separados por coma, ; o salto de linea';
    }

    // Fijar primera fila (header)
    sheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    // Generar el archivo
    const fileName = `plantilla_importacion_compras_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Descargar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  }

  /**
   * Genera y descarga una plantilla vacía (sin ejemplos)
   * @deprecated Use generateTemplate() instead - ahora ambas generan plantilla vacía
   */
  static async generateEmptyTemplate(): Promise<void> {
    // Simplemente llamar a generateTemplate ya que ahora no tiene ejemplos
    await this.generateTemplate();
  }
}
