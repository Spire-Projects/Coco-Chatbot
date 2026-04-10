// @ts-nocheck
import type { SaleItem } from "@/shared/types/modelTypes/Sale";

/**
 * Agrupa multiples SaleItems por producto/IMEI, consolidando cantidades y totales
 * 
 * Mantiene separados los items con IMEI y agrupa solo los que comparten
 * el mismo producto y el mismo IMEI (o sin IMEI).
 * 
 * @param saleItems - Array de SaleItems que pueden tener múltiples entradas del mismo producto
 * @returns Array de SaleItems con un item por producto
 * 
 * @example
 * Input: [
 *   { product: "prod1", quantity: 2, unitPrice: 10, total: 20 },
 *   { product: "prod1", quantity: 1, unitPrice: 10, total: 10 }
 * ]
 * Output: [
 *   { product: "prod1", quantity: 3, unitPrice: 10, total: 30 }
 * ]
 */
export function aggregateSaleItemsByProduct(saleItems: SaleItem[]): SaleItem[] {
  const aggregatedMap = new Map<string, SaleItem>();

  for (const item of saleItems) {
    const key = `${item.product}::${item.imei || ''}`;
    const existing = aggregatedMap.get(key);

    if (existing) {
      // Ya existe un item para este producto, agregamos la cantidad y el total
      existing.quantity += item.quantity;
      existing.total += item.total;
      // Recalcular unitPrice como promedio ponderado
      existing.unitPrice = existing.total / existing.quantity;
    } else {
      aggregatedMap.set(key, { ...item });
    }
  }

  return Array.from(aggregatedMap.values());
}

/**
 * Calcula el precio unitario promedio ponderado de múltiples items
 * Útil cuando se necesita un precio representativo de items con diferentes precios
 * 
 * @param items - Array de items con quantity y unitPrice
 * @returns Precio unitario promedio ponderado
 */
export function calculateWeightedAveragePrice(
  items: Array<{ quantity: number; unitPrice: number }>
): number {
  if (items.length === 0) return 0;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
}
