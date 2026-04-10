export enum NumberInvoiceStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  RECYCLED = 'recycled'//nunca se usa
}

export interface NumberInvoiceRange {
  id: string;
  range: [number, number]; // [inicio, fin] ej: [1, 10]
  size: number; // Tamaño del rango (10)
  expiredAt: number; // Timestamp de expiración
  terminalId: string; // ID único de la terminal (pcJala, pcCaja2, etc)
  used: number; // Cuántos números se han usado (0-10)
  numbersUsed: number[]; // Array de números específicos ya usados [1,2,3]
  active: boolean; // Si el rango sigue vigente
  status: NumberInvoiceStatus; // Estado del rango
  createdAt: string; // ISO timestamp de creación
  lastUsedAt?: string; // ISO timestamp del último uso
  recycled: boolean; // Si este rango fue reciclado de uno expirado
  priority: number; // Prioridad para asignación (menor = mayor prioridad)
  sincronized?: boolean; // Si está sincronizado con Firestore
}