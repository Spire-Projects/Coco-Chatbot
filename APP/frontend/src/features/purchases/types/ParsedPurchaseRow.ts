/**
 * Representa una fila parseada del Excel de compras
 */
export interface ParsedPurchaseRow {
  /** Índice de fila en el Excel (1-based) */
  rowNumber: number;
  
  /** Fecha de compra (opcional, si no existe se usa la fecha actual) */
  fechaCompra?: string | null;
  
  /** Nombre del proveedor (opcional, se crea si no existe) */
  proveedor?: string | null;
  
  /** Número de comprobante/factura */
  numeroComprobante?: string | null;
  
  /** Nombre del producto (opcional si existe código) */
  producto?: string | null;
  
  /** Código del producto (OBLIGATORIO) */
  codigo: string;
  
  /** Nombre de la categoría (opcional, se crea si no existe) */
  categoria?: string | null;
  
  /** Cantidad comprada (OBLIGATORIO) */
  cantidadComprada: number | null;
  
  /** Cantidad disponible (legacy, ya no se usa en el flujo actual) */
  cantidadDisponible?: number | null;
  
  /** Margen de ganancia en porcentaje (opcional, default 0) */
  margenGanancia?: number | null;
  
  /** Precio unitario (OBLIGATORIO) */
  precioUnitario: number | null;
  
  /** Precio total (opcional, se calcula si no existe) */
  precioTotal?: number | null;
  
  /** Precio de venta del producto (opcional, se actualiza en el producto si existe) */
  precioVenta?: number | null;

  /** Lista de IMEIs (opcional, separados por salto de linea, coma o punto y coma) */
  imeis?: string[] | null;
  
  /** Notas adicionales (opcional) */
  notas?: string | null;
  
  /** ID único temporal para UI (eliminar filas en preview) */
  tempId: string;
  
  /** Errores de validación encontrados */
  validationErrors?: string[];
}

/**
 * Resultado del parsing del Excel
 */
export interface ExcelParseResult {
  /** Filas válidas encontradas */
  validRows: ParsedPurchaseRow[];
  
  /** Errores encontrados durante el parsing */
  errors: string[];
  
  /** Total de filas procesadas */
  totalRowsProcessed: number;
}
