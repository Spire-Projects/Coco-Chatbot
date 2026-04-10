// @ts-nocheck
import Decimal from "decimal.js";
import type {
  CartSaleItem,
  CreateSaleData,
  SaleState,
  SaleView,
} from "@/shared/types/modelTypes/Sale";
import { productService } from "@/shared/services/ProductService";

export const formatCurrency = (
  value: number | string | null | undefined,
  currency?: string
) => {
  const safe = value == null ? 0 : value;
  const symbol = currency === "bs" || currency === "BOB" ? "Bs" : "$";
  return `${symbol} ${new Decimal(safe).toFixed(2)}`;
};

export const canConfirmSale = (
  saleState: import("@/shared/types/modelTypes/Sale").SaleState,
  isProcessing: boolean
) => {
  return saleState.items.length > 0 && !isProcessing;
};
export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPaymentMethodBadge(method: string) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    cash:           { variant: 'default',   label: 'Efectivo' },
    cash_bob:       { variant: 'default',   label: 'Efectivo Bs' },   // legacy
    cash_usd:       { variant: 'default',   label: 'Efectivo USD' },  // legacy
    qr:             { variant: 'secondary', label: 'QR / Transfer.' },
    card:           { variant: 'outline',   label: 'Tarjeta' },
    device_trade_in:{ variant: 'secondary', label: 'Trade-in' },
    crypto_usd:     { variant: 'outline',   label: 'Crypto USD' },
    efectivo:       { variant: 'default',   label: 'Efectivo' },      // legacy
  };
  return map[method] ?? { variant: 'secondary' as const, label: method };
}

export const getClientInfo = (sale: SaleView) => {
  if (!sale.client) {
    return {
      name: "Sin cliente",
      email: "-",
      phone: "-",
    };
  }

  const client = sale.clientView;
  return {
    name: client?.name || "Sin cliente",
    email: client?.email || "-",
    phone: client?.phone || "-",
  };
};

export const getNitInfo = (sale: SaleView) => {
  return {
    nit: sale.nitClient || "-",
    socialReason: sale.socialReasonClient || "-",
    invoiceNumber: sale.numberInvoice || "-",
  };
};

export const generateSaleData = (
  saleState: SaleState,
  userId: string,
  invoiceNumber: string,
  isDraft = false,
  exchangeRateArg?: number
): CreateSaleData => {
  const totalInBs =
    saleState.paymentCurrency === "arg" && exchangeRateArg
      ? saleState.total / exchangeRateArg
      : saleState.total;

  const totalWithoutDiscountInBs =
    saleState.paymentCurrency === "arg" && exchangeRateArg && saleState.subtotal
      ? saleState.subtotal / exchangeRateArg
      : saleState.subtotal;

  const totalDiscountInBs =
    saleState.paymentCurrency === "arg" &&
    exchangeRateArg &&
    saleState.totalDiscount
      ? saleState.totalDiscount / exchangeRateArg
      : saleState.totalDiscount;

  const saleData: CreateSaleData = {
    items: saleState.items.map((item) => ({
      product: item.product,
      imei: item.selectedImei || item.imei,
      quantity: item.quantity,
      unitPrice:
        saleState.paymentCurrency === "arg" && exchangeRateArg
          ? item.unitPrice / exchangeRateArg
          : item.unitPrice,
      discount: item.discount,
      total:
        saleState.paymentCurrency === "arg" && exchangeRateArg
          ? item.total / exchangeRateArg
          : item.total,
    })),
    total: totalInBs,
    totalWithoutDiscount: totalWithoutDiscountInBs,
    totalDiscount: totalDiscountInBs,
    client: saleState.clientId,
    paymentMethod: saleState.paymentMethod,
    paymentCurrency: saleState.paymentCurrency,
    factured: !!saleState.nitClient,
    nitClient: saleState.nitClient,
    socialReasonClient: saleState.socialReasonClient,
    saleNotes: saleState.saleNotes,
    exchangeRateArg: exchangeRateArg,
    numberInvoice: invoiceNumber,
    createdBy: userId,
    isDraft,
  };
  return saleData;
};

export const recreateSaleStateItems = async (
  saleView: SaleView,
  exchangeRate: number
): Promise<CartSaleItem[]> => {
  const items: CartSaleItem[] = await Promise.all(
    saleView.items.map(async (item) => {
      let availableStock = 0;
      let availableImeis: string[] = [];

      try {
        const product = await productService.findById(item.product);
        availableStock = product?.stock || 0;
        availableImeis = product?.imeis || [];
      } catch (error) {
        console.error("Error loading product stock for quotation:", error);
      }

      const requiresImei = availableImeis.length > 0 || Boolean(item.imei);

      return {
        cartItemId: crypto.randomUUID(),
        product: item.product,
        imei: item.imei,
        selectedImei: item.imei,
        requiresImei,
        availableImeis,
        productName: item.productName ?? "",
        productCode: item.productCode,
        purchaseDate: item.purchaseDate ?? "",
        receiptNumber: item.receiptNumber ?? "",
        quantity: item.quantity,
        unitPrice: saleView.paymentCurrency === "arg" ? item.unitPrice * (exchangeRate || 1) : item.unitPrice,
        discount: 0,
        total: saleView.paymentCurrency === "arg" ? item.total * (exchangeRate || 1) : item.total,
        availableStock,
        unitCost: 0,
        profitMarginPercentage: 0,
        originalPrice: saleView.paymentCurrency === "arg" ? item.unitPrice * (exchangeRate || 1) : item.unitPrice,
      };
    })
  );
  return items;
};
