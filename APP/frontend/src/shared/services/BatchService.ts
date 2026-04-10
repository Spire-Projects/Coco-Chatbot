
import type { MedicationBatch, BatchStatistics } from '../types/Medication';

/**
 * Funciones helper para la UI de gestión de lotes
 */

/**
 * Formatear moneda boliviana
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Formatear fecha para mostrar
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Obtener estado del lote basado en fecha de vencimiento
 */
export const getBatchStatus = (expirationDate: string, quantity: number): 'valid' | 'expiring' | 'expired' | 'sold' => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const daysToAdvice = 90;
  const thirtyDaysFromNow = new Date(today.getTime() + (daysToAdvice * 24 * 60 * 60 * 1000));

  if (expDate < today && quantity === 0) {
    return 'sold';
  } else if (expDate < today) {
    return 'expired';
  } else if (expDate <= thirtyDaysFromNow) {
    return 'expiring';
  } else {
    return 'valid';
  }
};

/**
 * Obtener color del badge según estado del lote
 */
export const getBatchStatusColor = (status: string): string => {
  switch (status) {
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'expiring':
      return 'bg-yellow-100 text-yellow-800';
    case 'valid':
      return 'bg-green-100 text-green-800';
    case 'sold':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Obtener texto del estado del lote
 */
export const getBatchStatusText = (status: string): string => {
  switch (status) {
    case 'expired':
      return 'Vencido';
    case 'expiring':
      return 'Por vencer';
    case 'valid':
      return 'Vigente';
    case 'sold':
      return 'Vendido';
    default:
      return 'Desconocido';
  }
};

/**
 * Calcular días hasta vencimiento
 */
export const getDaysUntilExpiration = (expirationDate: string): number => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calcular margen de ganancia
 */
export const calculateProfitMargin = (purchasePrice: number, sellingPrice: number): number => {
  if (purchasePrice <= 0) return 0;
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
};

/**
 * Calcular precio de venta basado en margen
 */
export const calculateSellingPriceFromMargin = (purchasePrice: number, marginPercent: number): number => {
  return purchasePrice * (1 + marginPercent / 100);
};

/**
 * Validar si un lote está próximo a vencer (30 días por defecto)
 */
export const isBatchExpiringSoon = (expirationDate: string, days: number = 30): boolean => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const thresholdDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
  return expDate <= thresholdDate && expDate > today;
};

/**
 * Validar si un lote está vencido
 */
export const isBatchExpired = (expirationDate: string): boolean => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  return expDate < today;
};

/**
 * Ordenar lotes por fecha de vencimiento (más próximos primero)
 */
export const sortBatchesByExpiration = (batches: MedicationBatch[]): MedicationBatch[] => {
  return [...batches].sort((a, b) => 
    new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  );
};

/**
 * Filtrar lotes por estado
 */
export const filterBatchesByStatus = (
  batches: MedicationBatch[], 
  status: 'valid' | 'expiring' | 'expired' | 'sold'
): MedicationBatch[] => {
  return batches.filter(batch => getBatchStatus(batch.expirationDate, batch.quantity) === status);
};

/**
 * Calcular estadísticas de un array de lotes
 */
export const calculateBatchesStatistics = (batches: MedicationBatch[]): BatchStatistics => {
  const totalBatches = batches.length;
  const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);
  const batchesExpiringSoon = batches.filter(batch => isBatchExpiringSoon(batch.expirationDate)).length;
  const batchesExpired = batches.filter(batch => isBatchExpired(batch.expirationDate)).length;
  
  const totalPurchaseValue = batches.reduce((sum, batch) => sum + (batch.purchasePrice * batch.quantity), 0);
  const totalSellingValue = batches.reduce((sum, batch) => sum + (batch.sellingPrice * batch.quantity), 0);
  
  const averagePurchasePrice = totalBatches > 0 ? totalPurchaseValue / totalStock : 0;
  const averageSellingPrice = totalBatches > 0 ? totalSellingValue / totalStock : 0;
  
  const uniqueSuppliers = new Set(
    batches.map(batch => batch.supplier).filter(supplier => supplier)
  ).size;

  return {
    totalBatches,
    totalStock,
    batchesExpiringSoon,
    batchesExpired,
    averagePurchasePrice,
    averageSellingPrice,
    uniqueSuppliers
  };
};