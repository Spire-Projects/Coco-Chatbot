import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Servicio para generar plantilla de Excel para importación de productos
 */
class ProductTemplateService {
  /**
   * Genera y descarga una plantilla de Excel para importar productos
   * 
   * La plantilla incluye:
   * - Columnas del modelo actual: Código, Nombre, Modelo, Categoría, Descripción, Precio y specs comunes
   * - Headers con estilo (fondo verde, texto blanco)
   * - 50 filas vacías prellenadas
   * - Formato de números para la columna Precio
   * - Primera fila congelada para facilitar navegación
   * 
   * @returns Promise<void>
   */
  static async downloadTemplate(): Promise<void> {
    try {
      // Crear nuevo libro de trabajo
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Productos', {
        views: [{ state: 'frozen', ySplit: 1 }], // Congelar primera fila
      });

      // Definir columnas
      worksheet.columns = [
        { 
          header: 'Código', 
          key: 'codigo', 
          width: 15,
        },
        { 
          header: 'Nombre', 
          key: 'nombre', 
          width: 35,
        },
        {
          header: 'Modelo',
          key: 'modelo',
          width: 24,
        },
        { 
          header: 'Categoría', 
          key: 'categoria', 
          width: 20,
        },
        { 
          header: 'Descripción', 
          key: 'descripcion', 
          width: 40,
        },
        { 
          header: 'Precio', 
          key: 'precio', 
          width: 15,
        },
        {
          header: 'RAM',
          key: 'ram',
          width: 14,
        },
        {
          header: 'ROM',
          key: 'rom',
          width: 14,
        },
        {
          header: 'Color',
          key: 'color',
          width: 16,
        },
        {
          header: 'Bateria',
          key: 'bateria',
          width: 14,
        },
        {
          header: 'Pantalla',
          key: 'pantalla',
          width: 14,
        },
        {
          header: 'Procesador',
          key: 'procesador',
          width: 20,
        },
        {
          header: 'Camara',
          key: 'camara',
          width: 14,
        },
        {
          header: 'SIM',
          key: 'sim',
          width: 14,
        },
      ];

      // Estilizar fila de encabezados
      const headerRow = worksheet.getRow(1);
      headerRow.font = { 
        bold: true, 
        color: { argb: 'FFFFFFFF' }, 
        size: 11,
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }, // Verde
      };
      headerRow.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
      };
      headerRow.height = 20;

      // Agregar 50 filas vacías con formato
      for (let i = 2; i <= 51; i++) {
        const row = worksheet.getRow(i);
        
        // Aplicar formato de número a la columna de precio (columna F)
        const precioCell = row.getCell(6); // Columna 6 = Precio
        precioCell.numFmt = '#,##0.00'; // Formato: 1,844.80
        
        // Centrar texto en columna de código
        const codigoCell = row.getCell(1);
        codigoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        row.commit();
      }

      // Aplicar bordes a toda la tabla (headers + 50 filas)
      for (let rowNum = 1; rowNum <= 51; rowNum++) {
        const row = worksheet.getRow(rowNum);
        for (let colNum = 1; colNum <= worksheet.columns.length; colNum++) {
          const cell = row.getCell(colNum);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        }
      }

      // Fila de ejemplo para guiar al usuario
      worksheet.getRow(2).values = {
        codigo: 'PROD001',
        nombre: 'Samsung Galaxy S23',
        modelo: 'Galaxy S23',
        categoria: 'Smartphones',
        descripcion: 'Telefono movil',
        precio: 4200,
        ram: '8GB',
        rom: '256GB',
        color: 'Negro',
        bateria: '3900mAh',
        pantalla: '6.1"',
        procesador: 'Snapdragon',
        camara: '50MP',
        sim: '2 SIM',
      };

      // Generar archivo Excel en buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Crear Blob y descargar
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      
      // Nombre del archivo con fecha actual
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `plantilla_productos_${dateStr}.xlsx`;
      
      saveAs(blob, fileName);
      
      console.log('✅ Plantilla de productos descargada exitosamente');
    } catch (error) {
      console.error('❌ Error al generar plantilla de productos:', error);
      throw new Error('No se pudo generar la plantilla de productos');
    }
  }
}

export default ProductTemplateService;
