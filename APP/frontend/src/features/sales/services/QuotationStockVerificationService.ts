// @ts-nocheck
import { productService } from '@/shared/services/ProductService';
import type { SaleView, SaleItemView } from '@/shared/types/modelTypes/Sale';

/**
 * Representa un producto con problemas de stock
 */
export interface StockIssue {
  item: SaleItemView;
  issue: 'out_of_stock' | 'insufficient_stock' | 'price_changed';
  currentStock: number;
  requestedQuantity: number;
  alternativePurchaseBox?: {
    availableStock: number;
    unitPrice: number;
  };
}

/**
 * Resultado de la verificación de stock
 */
export interface StockVerificationResult {
  hasIssues: boolean;
  issues: StockIssue[];
  validItems: SaleItemView[];
}

/**
 * Servicio para verificar stock de cotizaciones
 */
class QuotationStockVerificationService {
  /**
   * Verifica el stock de todos los items de una cotización
   */
  async verifyQuotationStock(quotation: SaleView): Promise<StockVerificationResult> {
    const issues: StockIssue[] = [];
    const validItems: SaleItemView[] = [];

    for (const item of quotation.items) {
      const issue = await this.verifyItemStock(item);
      
      if (issue) {
        issues.push(issue);
      } else {
        validItems.push(item);
      }
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      validItems,
    };
  }

  /**
   * Verifica el stock de un item individual
   */
  private async verifyItemStock(item: SaleItemView): Promise<StockIssue | null> {
    try {
      const product = await productService.findById(item.product);

      if (!product) {
        return {
          item,
          issue: 'out_of_stock',
          currentStock: 0,
          requestedQuantity: item.quantity,
        };
      }

      const currentStock = product.stock || 0;

      // Verificar IMEI si aplica
      if (item.imei) {
        const imeiExists = (product.imeis || []).includes(item.imei);
        if (!imeiExists) {
          return {
            item,
            issue: 'out_of_stock',
            currentStock,
            requestedQuantity: item.quantity,
          };
        }
      }

      // Verificar stock disponible
      if (currentStock === 0) {
        const alternative = await this.findAlternativePurchaseBox(
          item.product,
          item.quantity
        );

        return {
          item,
          issue: 'out_of_stock',
          currentStock,
          requestedQuantity: item.quantity,
          alternativePurchaseBox: alternative,
        };
      }

      // Verificar stock insuficiente
      if (currentStock < item.quantity) {
        const alternative = await this.findAlternativePurchaseBox(
          item.product,
          item.quantity
        );

        return {
          item,
          issue: 'insufficient_stock',
          currentStock,
          requestedQuantity: item.quantity,
          alternativePurchaseBox: alternative,
        };
      }

      // Verificar cambio de precio
      const currentPrice = product.price || 0;

      if (Math.abs(currentPrice - item.unitPrice) > 0.01) {
        return {
          item,
          issue: 'price_changed',
          currentStock,
          requestedQuantity: item.quantity,
        };
      }

      return null;
    } catch (error) {
      console.error('Error verificando stock del item:', error);
      return {
        item,
        issue: 'out_of_stock',
        currentStock: 0,
        requestedQuantity: item.quantity,
      };
    }
  }

  /**
   * Busca un purchaseBox alternativo con stock disponible
   */
  private async findAlternativePurchaseBox(
    productId: string,
    requiredQuantity: number
  ): Promise<StockIssue['alternativePurchaseBox']> {
    try {
      const product = await productService.findById(productId);
      if (!product || (product.stock || 0) < requiredQuantity) {
        return undefined;
      }
      const sellingPrice = product?.price || 0;

      return {
        availableStock: product.stock || 0,
        unitPrice: sellingPrice,
      };
    } catch (error) {
      console.error('Error buscando purchaseBox alternativo:', error);
      return undefined;
    }
  }

}

export const quotationStockVerificationService =
  new QuotationStockVerificationService();
