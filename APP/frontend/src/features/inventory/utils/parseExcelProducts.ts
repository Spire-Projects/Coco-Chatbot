import * as XLSX from 'xlsx';
import type { ParsedProductRow } from '../types/ParsedProductRow';

/**
 * Resultado del parseo del archivo Excel
 */
export interface ExcelParseResult {
  validRows: ParsedProductRow[];
  errors: string[];
  totalRowsProcessed: number;
}

/**
 * Keywords para detectar columnas en el Excel (case-insensitive)
 * Prioridad: Primera coincidencia encontrada
 */
const HEADER_KEYWORDS = {
  CODIGO: ['CÓDIGO', 'CODIGO', 'COD', 'CODE', 'CÓDIGO PRODUCTO'],
  NOMBRE: ['NOMBRE', 'NOMBRE PRODUCTO', 'PRODUCTO', 'DESCRIPCIÓN', 'NAME', 'PRODUCT'],
  MODELO: ['MODELO', 'MODEL', 'REFERENCIA', 'REF'],
  CATEGORIA: ['CATEGORÍA', 'CATEGORIA', 'CATEGORY', 'CAT'],
  DESCRIPCION: ['DESCRIPCIÓN DETALLADA', 'DESCRIPCION', 'DESCRIPTION', 'DETALLE', 'DETAILS'],
  PRECIO: ['PRECIO', 'PRECIO VENTA', 'PRICE', 'PRECIO (BS)', 'PRECIO BS', 'VALOR'],
  RAM: ['RAM', 'MEMORIA RAM'],
  ROM: ['ROM', 'ALMACENAMIENTO', 'MEMORIA ROM'],
  COLOR: ['COLOR'],
  BATERIA: ['BATERIA', 'BATERÍA', 'BATTERY'],
  PANTALLA: ['PANTALLA', 'SCREEN'],
  PROCESADOR: ['PROCESADOR', 'CPU', 'CHIPSET'],
  CAMARA: ['CAMARA', 'CÁMARA', 'CAMERA'],
  SIM: ['SIM', 'TIPO SIM'],
};

/**
 * Keywords para identificar filas que deben ser omitidas
 */
const SKIP_KEYWORDS = [
  'TOTAL GENERAL',
  'TOTAL A PAGAR',
  'SUBTOTAL',
  'SUMA TOTAL',
  'TOTAL:',
];

/**
 * Normaliza un texto para comparación (minúsculas, sin espacios extras)
 */
function normalizeText(text: string): string {
  return text.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Detecta si una fila contiene keywords de omisión
 */
function shouldSkipRow(row: Record<string, unknown>): boolean {
  const rowText = Object.values(row)
    .map((val) => String(val || '').toUpperCase())
    .join(' ');
  
  return SKIP_KEYWORDS.some((keyword) => rowText.includes(keyword));
}

/**
 * Detecta el índice de una columna basándose en keywords
 */
function findColumnIndex(
  headers: string[],
  keywords: string[]
): number | null {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeText(headers[i] || '');
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return i;
    }
  }
  return null;
}

/**
 * Convierte un valor a string seguro
 */
function safeString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value).trim();
}

/**
 * Parsea un número desde string, soportando formatos boliviano y americano
 * Ejemplos: "1.844,80" -> 1844.80, "1844.80" -> 1844.80, "536,00" -> 536.00
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  let str = String(value).trim();
  
  // Si ya es un número, retornarlo
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // Eliminar símbolos de moneda y espacios
  str = str.replace(/[^\d.,\-]/g, '');
  
  if (str === '' || str === '-') {
    return null;
  }
  
  // Detectar formato: si tiene punto antes de coma, es formato boliviano (1.844,80)
  if (str.includes('.') && str.includes(',') && str.lastIndexOf('.') < str.lastIndexOf(',')) {
    // Formato boliviano: eliminar puntos (separadores de miles) y reemplazar coma por punto
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',') && !str.includes('.')) {
    // Solo comas: podría ser decimal (536,00)
    str = str.replace(',', '.');
  }
  // Si solo tiene puntos o formato americano (1844.80), dejar como está
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Genera un ID temporal único
 */
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida una fila parseada
 */
function validateRow(row: ParsedProductRow): string[] {
  const errors: string[] = [];
  
  // Código es requerido
  if (!row.codigo || row.codigo.trim() === '') {
    errors.push('El código del producto es obligatorio');
  } else if (row.codigo.length < 1) {
    errors.push('El código debe tener al menos 1 carácter');
  }
  
  // Nombre es requerido
  if (!row.nombre || row.nombre.trim() === '') {
    errors.push('El nombre del producto es obligatorio');
  } else if (row.nombre.length < 3) {
    errors.push('El nombre debe tener al menos 3 caracteres');
  }
  
  // Precio debe ser >= 0 si se proporciona
  if (row.precio !== null && row.precio !== undefined && row.precio < 0) {
    errors.push('El precio no puede ser negativo');
  }
  
  return errors;
}

/**
 * Parsea un archivo Excel y extrae filas de productos
 * 
 * @param file - Archivo Excel (.xls o .xlsx)
 * @returns Resultado del parseo con filas válidas y errores
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({
            validRows: [],
            errors: ['No se pudo leer el archivo'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        // Leer el archivo Excel
        const workbook = XLSX.read(data, { 
          type: 'binary',
          cellDates: true,
          cellNF: true,
        });
        
        // Obtener la primera hoja
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({
            validRows: [],
            errors: ['El archivo no contiene hojas'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON preservando datos raw
        const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
          blankrows: false,
        }) as Record<string, unknown>[];
        
        if (jsonData.length === 0) {
          resolve({
            validRows: [],
            errors: ['El archivo está vacío'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        // Detectar fila de headers (primera fila con contenido)
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i] as unknown as unknown[];
          const rowHeaders = row.map((cell) => String(cell || '').trim());
          
          // Verificar si contiene al menos la columna de código
          const hasCodigoColumn = rowHeaders.some((header) => {
            const normalized = normalizeText(header);
            return HEADER_KEYWORDS.CODIGO.some((keyword) => normalized.includes(keyword));
          });
          
          if (hasCodigoColumn) {
            headerRowIndex = i;
            headers = rowHeaders;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          resolve({
            validRows: [],
            errors: ['No se encontró una fila de encabezados válida. Asegúrate de que exista una columna "CÓDIGO"'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        // Detectar índices de columnas
        const codigoIndex = findColumnIndex(headers, HEADER_KEYWORDS.CODIGO);
        const nombreIndex = findColumnIndex(headers, HEADER_KEYWORDS.NOMBRE);
        const categoriaIndex = findColumnIndex(headers, HEADER_KEYWORDS.CATEGORIA);
        const modeloIndex = findColumnIndex(headers, HEADER_KEYWORDS.MODELO);
        const descripcionIndex = findColumnIndex(headers, HEADER_KEYWORDS.DESCRIPCION);
        const precioIndex = findColumnIndex(headers, HEADER_KEYWORDS.PRECIO);
        const ramIndex = findColumnIndex(headers, HEADER_KEYWORDS.RAM);
        const romIndex = findColumnIndex(headers, HEADER_KEYWORDS.ROM);
        const colorIndex = findColumnIndex(headers, HEADER_KEYWORDS.COLOR);
        const bateriaIndex = findColumnIndex(headers, HEADER_KEYWORDS.BATERIA);
        const pantallaIndex = findColumnIndex(headers, HEADER_KEYWORDS.PANTALLA);
        const procesadorIndex = findColumnIndex(headers, HEADER_KEYWORDS.PROCESADOR);
        const camaraIndex = findColumnIndex(headers, HEADER_KEYWORDS.CAMARA);
        const simIndex = findColumnIndex(headers, HEADER_KEYWORDS.SIM);
        
        if (codigoIndex === null) {
          resolve({
            validRows: [],
            errors: ['No se encontró la columna "CÓDIGO" en el archivo'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        if (nombreIndex === null) {
          resolve({
            validRows: [],
            errors: ['No se encontró la columna "NOMBRE" en el archivo'],
            totalRowsProcessed: 0,
          });
          return;
        }
        
        // Parsear filas de datos
        const parsedRows: ParsedProductRow[] = [];
        const errors: string[] = [];
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown as unknown[];
          const excelRowNumber = i + 1; // 1-based
          
          // Verificar si la fila está vacía
          const isEmpty = row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
          if (isEmpty) {
            continue;
          }
          
          // Convertir a objeto para verificar keywords de omisión
          const rowObj: Record<string, unknown> = {};
          row.forEach((cell, idx) => {
            rowObj[headers[idx] || `col_${idx}`] = cell;
          });
          
          if (shouldSkipRow(rowObj)) {
            continue;
          }
          
          // Extraer valores
          const codigo = safeString(row[codigoIndex]);
          const nombre = safeString(row[nombreIndex]);
          const modelo = modeloIndex !== null ? safeString(row[modeloIndex]) : null;
          const categoria = categoriaIndex !== null ? safeString(row[categoriaIndex]) : null;
          const descripcion = descripcionIndex !== null ? safeString(row[descripcionIndex]) : null;
          const precio = precioIndex !== null ? parseNumber(row[precioIndex]) : null;
          const ram = ramIndex !== null ? safeString(row[ramIndex]) : null;
          const rom = romIndex !== null ? safeString(row[romIndex]) : null;
          const color = colorIndex !== null ? safeString(row[colorIndex]) : null;
          const bateria = bateriaIndex !== null ? safeString(row[bateriaIndex]) : null;
          const pantalla = pantallaIndex !== null ? safeString(row[pantallaIndex]) : null;
          const procesador = procesadorIndex !== null ? safeString(row[procesadorIndex]) : null;
          const camara = camaraIndex !== null ? safeString(row[camaraIndex]) : null;
          const sim = simIndex !== null ? safeString(row[simIndex]) : null;
          
          // Si código y nombre están vacíos, omitir fila
          if (!codigo && !nombre) {
            continue;
          }
          
          // Crear fila parseada
          const parsedRow: ParsedProductRow = {
            rowNumber: excelRowNumber,
            codigo: codigo || '',
            nombre: nombre || '',
            modelo,
            categoria,
            descripcion,
            precio,
            ram,
            rom,
            color,
            bateria,
            pantalla,
            procesador,
            camara,
            sim,
            tempId: generateTempId(),
          };
          
          // Validar fila
          const validationErrors = validateRow(parsedRow);
          if (validationErrors.length > 0) {
            parsedRow.validationErrors = validationErrors;
            errors.push(
              `Fila ${excelRowNumber}: ${validationErrors.join(', ')}`
            );
          }
          
          parsedRows.push(parsedRow);
        }
        
        resolve({
          validRows: parsedRows,
          errors,
          totalRowsProcessed: parsedRows.length,
        });
        
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        resolve({
          validRows: [],
          errors: [
            error instanceof Error 
              ? `Error al parsear el archivo: ${error.message}`
              : 'Error desconocido al parsear el archivo'
          ],
          totalRowsProcessed: 0,
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        validRows: [],
        errors: ['Error al leer el archivo'],
        totalRowsProcessed: 0,
      });
    };
    
    reader.readAsBinaryString(file);
  });
}
