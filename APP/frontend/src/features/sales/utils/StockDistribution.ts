// @ts-nocheck
//mport { purchaseService } from "@/shared/services/PurchaseService";
//import type { PurchaseView } from "@/shared/types/modelTypes/PurchaseBox";
import type { SaleItem } from "@/shared/types/modelTypes/Sale";

/**
 * Representa la distribución de una venta entre múltiples purchase boxes
 */
export interface StockDistribution {
  purchaseBoxId: string;
  quantity: number;
  unitCost: number;
}

/**
 * Resultado de la distribución de stock
 */
export interface DistributionResult {
  distributions: StockDistribution[];
  saleItems: SaleItem[]; // SaleItems listos para guardar en la BD
  success: boolean;
  error?: string;
}

/**
 * Distribuye una cantidad de producto entre los purchase boxes disponibles
 * siguiendo el criterio LIFO (Last In, First Out) - del más reciente al más antiguo
 * 
 * @param productId - ID del producto
 * @param totalQuantity - Cantidad total a vender
 * @param unitPrice - Precio unitario de venta
 * @param discount - Descuento aplicado (%)
 * @returns Promise<DistributionResult>
//  */
// export async function distributeStock(
//   productId: string,
//   totalQuantity: number,
//   unitPrice: number,
//   discount: number = 0
// ): Promise<DistributionResult> {
//   try {
//     // Obtener todos los purchase boxes del producto con stock disponible
//     const purchasesResponse = await purchaseService.getAllView(
//       1,
//       1000,
//       '',
//       undefined,
//       undefined,
//       { productId }
//     );

//     // Filtrar solo los que tienen stock
//     const availablePurchases = purchasesResponse.items.filter(
//       (p: PurchaseView) => p.quantityAvailable > 0
//     );

//     if (availablePurchases.length === 0) {
//       return {
//         distributions: [],
//         saleItems: [],
//         success: false,
//         error: 'No hay stock disponible para este producto',
//       };
//     }

//     // Ordenar por fecha de compra - LIFO (más reciente primero)
//     availablePurchases.sort((a: PurchaseView, b: PurchaseView) => {
//       const dateA = new Date(a.purchaseDate).getTime();
//       const dateB = new Date(b.purchaseDate).getTime();
//       return dateB - dateA; // Más reciente primero
//     });

//     // Calcular stock total disponible
//     const totalAvailableStock = availablePurchases.reduce(
//       (sum: number, p: PurchaseView) => sum + p.quantityAvailable,
//       0
//     );

//     if (totalAvailableStock < totalQuantity) {
//       return {
//         distributions: [],
//         saleItems: [],
//         success: false,
//         error: `Stock insuficiente. Disponible: ${totalAvailableStock}, Requerido: ${totalQuantity}`,
//       };
//     }

//     // Distribuir la cantidad entre los purchase boxes
//     const distributions: StockDistribution[] = [];
//     const saleItems: SaleItem[] = [];
//     let remainingQuantity = totalQuantity;

//     for (const purchase of availablePurchases) {
//       if (remainingQuantity <= 0) break;

//       const quantityToTake = Math.min(remainingQuantity, purchase.quantityAvailable);

//       distributions.push({
//         purchaseBoxId: purchase.id,
//         quantity: quantityToTake,
//         unitCost: purchase.unitCost,
//       });

//       // Crear SaleItem para este purchase box
//       saleItems.push({
//         purchaseBoxId: purchase.id,
//         product: productId,
//         quantity: quantityToTake,
//         unitPrice,
//         discount,
//         total: unitPrice * quantityToTake,
//       });

//       remainingQuantity -= quantityToTake;
//     }

//     return {
//       distributions,
//       saleItems,
//       success: true,
//     };
//   } catch (error) {
//     console.error('Error distributing stock:', error);
//     return {
//       distributions: [],
//       saleItems: [],
//       success: false,
//       error: 'Error al distribuir el stock',
//     };
//   }
// }

// /**
//  * Aplica la distribución de stock actualizando los purchase boxes
//  * 
//  * @param distributions - Array de distribuciones a aplicar
//  * @param updatedBy - ID del usuario que realiza la actualización
//  */
// export async function applyStockDistribution(
//   distributions: StockDistribution[],
//   updatedBy: string
// ): Promise<void> {
//   for (const distribution of distributions) {
//     try {
//       const purchaseBox = await purchaseService.findById(distribution.purchaseBoxId);
      
//       if (!purchaseBox) {
//         console.warn(`PurchaseBox ${distribution.purchaseBoxId} not found`);
//         continue;
//       }

//       const newQuantity = purchaseBox.quantityAvailable - distribution.quantity;
      
//       await purchaseService.update(purchaseBox.id, {
//         quantityAvailable: Math.max(0, newQuantity),
//         updatedBy,
//       });

//       console.log(
//         `Updated PurchaseBox ${purchaseBox.id}: ${purchaseBox.quantityAvailable} -> ${newQuantity}`
//       );
//     } catch (error) {
//       console.error(`Error updating PurchaseBox ${distribution.purchaseBoxId}:`, error);
//       throw error;
//     }
//   }
// }
