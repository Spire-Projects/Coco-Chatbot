/**
 * Representa una fila de producto parseada desde el archivo Excel
 * para su importación masiva al inventario
 */
export interface ParsedProductRow {
  /** Número de fila en el archivo Excel (1-based) */
  rowNumber: number;
  
  /** Código único del producto - REQUERIDO */
  codigo: string;
  
  /** Nombre del producto - REQUERIDO */
  nombre: string;

  /** Nombre del modelo (opcional, se crea si no existe) */
  modelo?: string | null;
  
  /** Nombre de la categoría (opcional, se crea si no existe) */
  categoria?: string | null;
  
  /** Descripción detallada del producto (opcional) */
  descripcion?: string | null;
  
  /** Precio de venta del producto (opcional) */
  precio?: number | null;

  /** Especificación RAM (opcional) */
  ram?: string | null;

  /** Especificación ROM (opcional) */
  rom?: string | null;

  /** Especificación Color (opcional) */
  color?: string | null;

  /** Especificación Batería (opcional) */
  bateria?: string | null;

  /** Especificación Pantalla (opcional) */
  pantalla?: string | null;

  /** Especificación Procesador (opcional) */
  procesador?: string | null;

  /** Especificación Cámara (opcional) */
  camara?: string | null;

  /** Especificación SIM (opcional) */
  sim?: string | null;
  
  /** ID temporal para manipulación en UI (antes de guardar) */
  tempId: string;
  
  /** Errores de validación encontrados en esta fila */
  validationErrors?: string[];
}
