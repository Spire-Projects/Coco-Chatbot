import * as XLSX from 'xlsx';
import type { ParsedPurchaseRow, ExcelParseResult } from '../types/ParsedPurchaseRow';

/**
 * Palabras clave para detectar headers en el Excel
 * Ordenadas por prioridad (más específicas primero)
 * Plantilla simplificada sin margen de ganancia
 */
const HEADER_KEYWORDS = {
  FECHA_COMPRA: ['FECHA COMPRA', 'FECHA DE COMPRA', 'FECHA'],
  PROVEEDOR: ['PROVEEDOR', 'SUPPLIER', 'FABRICANTE'],
  NUMERO_COMPROBANTE: ['NÚMERO DE COMPROBANTE', 'NUMERO DE COMPROBANTE', 'NUMERO COMPROBANTE', 'NRO COMPROBANTE', 'COMPROBANTE', 'FACTURA'],
  PRODUCTO: ['PRODUCTO', 'NOMBRE PRODUCTO', 'DESCRIPCION', 'DESCRIPCIÓN', 'DESC', 'NOMBRE'],
  CODIGO: ['CÓDIGO', 'CODIGO', 'COD', 'CODE'],
  CATEGORIA: ['CATEGORÍA', 'CATEGORIA', 'CATEGORY'],
  CANTIDAD_COMPRADA: ['CANTIDAD COMPRADA', 'CANT COMPRADA', 'QTY PURCHASED', 'CANTIDAD'],
  PRECIO_UNITARIO: ['PRECIO UNITARIO', 'P.U.(BS)', 'P.U. (BS)', 'P.U', 'PU', 'PRECIO', 'UNITARIO'],
  PRECIO_TOTAL: ['PRECIO TOTAL', 'TOTAL', 'IMPORTE'],
  PRECIO_VENTA: ['PRECIO DE VENTA', 'PRECIO VENTA', 'P.V.(BS)', 'P.V. (BS)', 'P.V', 'PV', 'VENTA'],
  IMEIS: ['IMEIS', 'IMEI', 'SERIALES', 'SERIAL'],
  NOTAS: ['NOTAS', 'OBSERVACIONES', 'COMENTARIOS', 'NOTES'],
};

/**
 * Palabras que indican el fin de una tabla o fila inválida
 */
const STOP_KEYWORDS = [
  'TOTAL GENERAL',
  'TOTAL A PAGAR',
  'SALDO A FAVOR',
  'OBSERVACION',
  'OBSERVACIONES',
  'AGOTADO',
  'RESUMEN',
  'SUBTOTAL',
];


/**
 * Normaliza el texto de una celda
 */
function normalizeCellText(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value).trim();
}

/**
 * Parsea un número que puede venir con formato boliviano
 * Formato boliviano: punto (.) para miles, coma (,) para decimales
 * Ejemplo: 1.844,80 = 1844.80
 */
function parseNumber(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  
  let str = String(raw).trim();
  if (str === '') return null;
  
  // Eliminar espacios
  str = str.replace(/\s+/g, '');
  
  // Formato boliviano: punto para miles, coma para decimales
  // Si tiene ambos, punto son miles y coma decimal
  if (str.indexOf('.') !== -1 && str.indexOf(',') !== -1) {
    // Formato: 1.844,80 → eliminar puntos, convertir coma a punto
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.indexOf(',') !== -1 && str.indexOf('.') === -1) {
    // Solo coma: es decimal (ej: 536,00)
    str = str.replace(',', '.');
  }
  // Si solo tiene punto, asumir que es decimal americano (ej: 1844.80)
  
  // Eliminar caracteres no numéricos excepto punto y menos
  str = str.replace(/[^\d\.-]/g, '');
  
  const num = Number(str);
  
  // Retornar null solo si no es un número finito
  if (!Number.isFinite(num)) return null;
  
  // Permitir cero (0) como valor válido
  return num;
}

/**
 * Parsea una celda con IMEIs separados por salto de linea, coma o punto y coma
 */
function parseImeis(raw: any): string[] {
  const normalized = normalizeCellText(raw);
  if (!normalized) return [];

  const imeis = normalized
    .split(/\r?\n|,|;/)
    .map((imei) => imei.trim())
    .filter((imei) => imei.length > 0);

  return Array.from(new Set(imeis));
}

/**
 * Busca la fila de encabezado en el array de filas
 */
function findHeaderRow(rows: any[][]): { index: number; mapping: Record<string, number> } | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const rowUpper = row.map((cell) => normalizeCellText(cell).toUpperCase());
    
    // Buscar índices de columnas (solo CODIGO es obligatorio)
    const codigoIdx = findBestMatch(rowUpper, HEADER_KEYWORDS.CODIGO);
    
    // Debe tener al menos CODIGO como columna obligatoria
    if (codigoIdx !== -1) {
      return {
        index: i,
        mapping: {
          fechaCompra: findBestMatch(rowUpper, HEADER_KEYWORDS.FECHA_COMPRA),
          proveedor: findBestMatch(rowUpper, HEADER_KEYWORDS.PROVEEDOR),
          numeroComprobante: findBestMatch(rowUpper, HEADER_KEYWORDS.NUMERO_COMPROBANTE),
          producto: findBestMatch(rowUpper, HEADER_KEYWORDS.PRODUCTO),
          codigo: codigoIdx,
          categoria: findBestMatch(rowUpper, HEADER_KEYWORDS.CATEGORIA),
          cantidadComprada: findBestMatch(rowUpper, HEADER_KEYWORDS.CANTIDAD_COMPRADA),
          precioUnitario: findBestMatch(rowUpper, HEADER_KEYWORDS.PRECIO_UNITARIO),
          precioTotal: findBestMatch(rowUpper, HEADER_KEYWORDS.PRECIO_TOTAL),
          precioVenta: findBestMatch(rowUpper, HEADER_KEYWORDS.PRECIO_VENTA),
          imeis: findBestMatch(rowUpper, HEADER_KEYWORDS.IMEIS),
          notas: findBestMatch(rowUpper, HEADER_KEYWORDS.NOTAS),
        },
      };
    }
  }
  
  return null;
}

/**
 * Encuentra el mejor match para una columna
 * Prioriza matches exactos y más específicos
 */
function findBestMatch(rowCells: string[], keywords: string[]): number {
  // Primero buscar match exacto
  for (const keyword of keywords) {
    const exactIdx = rowCells.findIndex((cell) => cell === keyword);
    if (exactIdx !== -1) return exactIdx;
  }
  
  // Luego buscar match por inclusión (en orden de prioridad de keywords)
  for (const keyword of keywords) {
    const includesIdx = rowCells.findIndex((cell) => cell.includes(keyword));
    if (includesIdx !== -1) return includesIdx;
  }
  
  return -1;
}

/**
 * Verifica si una fila debe ser ignorada (es un separador o total)
 */
function shouldSkipRow(row: any[]): boolean {
  const concatenated = row
    .map(normalizeCellText)
    .join(' ')
    .toUpperCase();
  
  if (!concatenated.trim()) return true;
  
  return STOP_KEYWORDS.some((keyword) => concatenated.includes(keyword));
}

/**
 * Genera un ID único temporal para la fila
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parsea un archivo Excel y extrae las filas válidas de compras
 * Solo procesa la primera hoja del archivo
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }
        
        // Leer el workbook con raw: true para preservar formato original
        // Esto evita que SheetJS parsee números con formato americano
        const workbook = XLSX.read(data, { type: 'array', raw: true });
        
        if (!workbook.SheetNames.length) {
          resolve({
            validRows: [],
            errors: ['El archivo Excel no contiene hojas'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        // Solo procesar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a array de arrays con raw: true para preservar formato
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,  // Mantener valores como texto para parsear manualmente
          defval: '',
        });
        
        if (!rows || rows.length === 0) {
          resolve({
            validRows: [],
            errors: ['La hoja está vacía'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        const validRows: ParsedPurchaseRow[] = [];
        const errors: string[] = [];
        let totalRowsProcessed = 0;
        
        // Buscar encabezado
        const headerInfo = findHeaderRow(rows);
        
        if (!headerInfo) {
          resolve({
            validRows: [],
            errors: ['No se encontró una fila de encabezado válida. Asegúrate de que exista una columna con el nombre CÓDIGO o CODIGO'],
            totalRowsProcessed: rows.length,
          });
          return;
        }
        
        const { index: headerIndex, mapping } = headerInfo;
        
        // Procesar filas después del encabezado
        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          totalRowsProcessed++;
          
          // Saltar filas vacías o separadores
          if (shouldSkipRow(row)) continue;
          
          // Extraer valores de las columnas (plantilla simplificada)
          const codigo = normalizeCellText(row[mapping.codigo]);
          
          // Si no hay código, saltar la fila
          if (!codigo) continue;
          
          const fechaCompra = mapping.fechaCompra !== -1 ? normalizeCellText(row[mapping.fechaCompra]) : null;
          const proveedor = mapping.proveedor !== -1 ? normalizeCellText(row[mapping.proveedor]) : null;
          const numeroComprobante = mapping.numeroComprobante !== -1 ? normalizeCellText(row[mapping.numeroComprobante]) : null;
          const producto = mapping.producto !== -1 ? normalizeCellText(row[mapping.producto]) : null;
          const categoria = mapping.categoria !== -1 ? normalizeCellText(row[mapping.categoria]) : null;
          const cantidadCompradaRaw = mapping.cantidadComprada !== -1 ? parseNumber(row[mapping.cantidadComprada]) : null;
          const precioUnitario = mapping.precioUnitario !== -1 ? parseNumber(row[mapping.precioUnitario]) : null;
          const precioTotal = mapping.precioTotal !== -1 ? parseNumber(row[mapping.precioTotal]) : null;
          const precioVenta = mapping.precioVenta !== -1 ? parseNumber(row[mapping.precioVenta]) : null;
          const imeis = mapping.imeis !== -1 ? parseImeis(row[mapping.imeis]) : [];
          const notas = mapping.notas !== -1 ? normalizeCellText(row[mapping.notas]) : null;

          // Si hay IMEIs, la cantidad se deriva automaticamente de ellos.
          const cantidadComprada = imeis.length > 0 ? imeis.length : cantidadCompradaRaw;
          
          // Crear la fila parseada (plantilla simplificada)
          const parsedRow: ParsedPurchaseRow = {
            rowNumber: i + 1, // Excel es 1-based
            fechaCompra: fechaCompra || null,
            proveedor,
            numeroComprobante,
            producto,
            codigo,
            categoria,
            cantidadComprada,
            cantidadDisponible: cantidadComprada, // Compatibilidad legacy
            margenGanancia: null, // Se manejará en el servicio o se puede calcular después
            precioUnitario,
            precioTotal,
            precioVenta,
            imeis,
            notas,
            tempId: generateTempId(),
          };
          
          validRows.push(parsedRow);
        }
        
        resolve({
          validRows,
          errors,
          totalRowsProcessed,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}
