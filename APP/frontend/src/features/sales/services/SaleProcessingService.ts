// @ts-nocheck
import { InvoiceNumberService } from "@/shared/services/InvoiceNumberService";
import { productService } from "@/shared/services/ProductService";
import { salesService } from "@/shared/services/SalesService";
import type {
  CreateSaleData,
  SaleState,
  SaleView,
} from "@/shared/types/modelTypes/Sale";

interface ProcessSaleParams {
  saleState: SaleState;
  userId: string;
  exchangeRate?: number;
  initialSaleId?: string;
}

export type ProcessSaleResult =
  | {
      success: true;
      saleView: SaleView;
    }
  | {
      success: false;
      errorMessage: string;
    };

class SaleProcessingService {
  async processSale({
    saleState,
    userId,
    exchangeRate,
    initialSaleId,
  }: ProcessSaleParams): Promise<ProcessSaleResult> {
    if (saleState.items.length === 0) {
      return {
        success: false,
        errorMessage: "Agrega al menos un producto para realizar la venta",
      };
    }

    try {
      const invoiceNumber = await InvoiceNumberService.getNextInvoiceNumber();

      const normalizedItems = saleState.items.map((item) => ({
        ...item,
        quantity: item.requiresImei ? 1 : item.quantity,
        imei: item.requiresImei ? item.selectedImei : item.imei,
      }));

      for (const item of normalizedItems) {
        if (item.requiresImei && !item.imei) {
          return {
            success: false,
            errorMessage: `Debes seleccionar un IMEI para ${item.productName}`,
          };
        }
      }

      const productIds = Array.from(new Set(normalizedItems.map((item) => item.product)));
      const products = await Promise.all(productIds.map((productId) => productService.findById(productId)));
      const productMap = new Map(productIds.map((id, idx) => [id, products[idx]]));

      type ProductUpdatePlan = {
        productId: string;
        nextStock: number;
        nextImeis?: string[];
      };

      const productUpdatePlans: ProductUpdatePlan[] = [];

      for (const productId of productIds) {
        const product = productMap.get(productId);
        if (!product) {
          return {
            success: false,
            errorMessage: `No se encontro el producto ${productId}`,
          };
        }

        const productItems = normalizedItems.filter((item) => item.product === productId);
        const requestedQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
        const selectedImeis = productItems
          .map((item) => item.imei)
          .filter((imei): imei is string => Boolean(imei));

        if ((product.stock || 0) < requestedQuantity) {
          return {
            success: false,
            errorMessage: `Stock insuficiente para ${product.name}. Disponible: ${product.stock || 0}, requerido: ${requestedQuantity}`,
          };
        }

        const productImeis = product.imeis || [];
        const productManagesImei = productImeis.length > 0;

        if (productManagesImei) {
          if (selectedImeis.length !== requestedQuantity) {
            return {
              success: false,
              errorMessage: `Cada unidad de ${product.name} debe tener un IMEI seleccionado`,
            };
          }

          const duplicateImeis = selectedImeis.filter(
            (imei, idx) => selectedImeis.indexOf(imei) !== idx
          );
          if (duplicateImeis.length > 0) {
            return {
              success: false,
              errorMessage: `No puedes repetir IMEIs en ${product.name}`,
            };
          }

          const allImeisExist = selectedImeis.every((imei) => productImeis.includes(imei));
          if (!allImeisExist) {
            return {
              success: false,
              errorMessage: `Hay IMEIs no disponibles para ${product.name}`,
            };
          }
        }

        const nextStock = Math.max(0, (product.stock || 0) - requestedQuantity);
        const nextImeis = productManagesImei
          ? productImeis.filter((imei) => !selectedImeis.includes(imei))
          : product.imeis;

        if (productManagesImei && (nextImeis || []).length !== nextStock) {
          return {
            success: false,
            errorMessage: `Inconsistencia de IMEI/stock en ${product.name}. Verifica inventario.`,
          };
        }

        productUpdatePlans.push({
          productId,
          nextStock,
          nextImeis,
        });
      }

      const saleData: CreateSaleData = {
        items: normalizedItems.map((item) => ({
          product: item.product,
          imei: item.imei,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        })),
        total:
          saleState.paymentCurrency === "arg" && exchangeRate
            ? saleState.total / exchangeRate
            : saleState.total,
        totalWithoutDiscount:
          saleState.paymentCurrency === "arg" && exchangeRate
            ? saleState.subtotal / exchangeRate
            : saleState.subtotal,
        totalDiscount:
          saleState.paymentCurrency === "arg" && exchangeRate
            ? saleState.totalDiscount / exchangeRate
            : saleState.totalDiscount,
        client: saleState.clientId,
        paymentMethod: saleState.paymentMethod,
        paymentCurrency: saleState.paymentCurrency,
        factured: !!saleState.nitClient,
        nitClient: saleState.nitClient,
        socialReasonClient: saleState.socialReasonClient,
        saleNotes: saleState.saleNotes,
        exchangeRateArg: exchangeRate,
        numberInvoice: invoiceNumber,
        createdBy: userId,
        isDraft: false,
      };

      if (initialSaleId) {
        await salesService.delete(initialSaleId);
      }

      const createdSale = await salesService.create(saleData);

      try {
        for (const plan of productUpdatePlans) {
          await productService.update(plan.productId, {
            stock: plan.nextStock,
            imeis: plan.nextImeis,
            updatedBy: userId,
          });
        }
      } catch (error) {
        await salesService.delete(createdSale.id);
        throw error;
      }

      const saleView = await salesService.findById(createdSale.id);

      if (!saleView) {
        throw new Error("No se pudo cargar la venta creada");
      }

      return {
        success: true,
        saleView,
      };
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      return {
        success: false,
        errorMessage: "Error al procesar la venta. Por favor, intenta nuevamente.",
      };
    }
  }
}

export const saleProcessingService = new SaleProcessingService();
