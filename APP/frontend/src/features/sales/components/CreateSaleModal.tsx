import { memo, useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Separator } from "@/shared/components/ui/separator";
import { toast } from "sonner";
import {
  Smartphone,
  Package,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
} from "lucide-react";
import ClientSection from "./SaleSection/ClientSection";
import NitSection from "./SaleSection/NitSection";
import SaleNotes from "./SaleSection/SaleNotesSection";
import SaleSuccessDialog from "./SaleSuccessDialog";
import CustomDialog from "@/shared/components/CustomDialog";
import { pgFetch } from "@/shared/api/client";
import { salesService } from "@/shared/services/SalesService";
import { useBranchStore } from "@/shared/store/branchStore";
import { useExchangeRateStore } from "@/shared/store/exchangeRateStore";
import useGlobalStates from "@/shared/hooks/useGlobalStates";
import type { Client } from "@/shared/types/Client";
import type { NIT } from "@/shared/types/Nit";
import type {
  PaymentMethod,
  PaymentCurrency,
  ProductCondition,
  CreateSaleData,
  CreateSaleItemData,
  CreateTradeInData,
  SaleView,
} from "@/shared/types/modelTypes/Sale";
import type {
  CartDeviceItem,
  CartAccessoryItem,
  SaleFormState,
  TradeInState,
  RawInventoryItemForSale,
  RawAccessoryForSale,
} from "../types/sale.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSaleCreated?: () => void;
  /** Reserved for future quotation-to-sale flow (TODO) */
  initialSaleId?: string;
}

interface RawVariantForTradeIn {
  id: string;
  storage?: string | null;
  color?: string | null;
  models?: {
    name?: string | null;
    brands?: { name?: string | null } | null;
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "cash",  label: "Efectivo",     icon: Banknote  },
  { id: "qr",    label: "QR / Transfer.", icon: QrCode   },
  { id: "card",  label: "Tarjeta",       icon: CreditCard },
];

const PAYMENT_CURRENCIES: { id: PaymentCurrency; label: string }[] = [
  { id: "bob", label: "BOB" },
  { id: "usd", label: "USD" },
];

// Trade-in devices always enter as pre_owned (US-12 — enforced by DB RPC too)

const DEVICE_SELECT =
  "id,imei,sale_price_usd,condition,variant_id,product_variants(storage,color,sale_price_usd,models(name,brands(name)))";
const VARIANT_SELECT = "id,storage,color,models!inner(name,brands(name))";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVariantDisplay(
  pv: RawInventoryItemForSale["product_variants"]
): string {
  if (!pv) return "Dispositivo";
  const parts = [
    pv.models?.brands?.name,
    pv.models?.name,
    pv.storage,
    pv.color,
  ].filter(Boolean);
  return parts.join(" ");
}

function formatVariantDisplayFromRaw(v: RawVariantForTradeIn): string {
  const parts = [
    v.models?.brands?.name,
    v.models?.name,
    v.storage,
    v.color,
  ].filter(Boolean);
  return parts.join(" ");
}

function buildCreateSaleData(
  form: SaleFormState,
  userId: string,
  branchId: string,
  exchangeRate: number,
  totalWithoutDiscount: number,
  totalDiscount: number,
  totalUsd: number
): CreateSaleData {
  const items: CreateSaleItemData[] = form.cartItems.map((item) => {
    if (item.type === "device") {
      return {
        itemId: item.inventoryItemId,
        quantity: 1,
        unitPriceUsd: item.unitPriceUsd,
        unitPriceBob: item.unitPriceUsd * exchangeRate,
        discountPct: item.discountPct,
        discountUsd: item.discountUsd,
        totalUsd: item.totalUsd,
        isDevice: true,
      };
    } else {
      return {
        accessoryId: item.accessoryId,
        quantity: item.quantity,
        unitPriceUsd: item.unitPriceUsd,
        unitPriceBob: item.unitPriceUsd * exchangeRate,
        discountPct: item.discountPct,
        discountUsd: item.discountUsd * item.quantity,
        totalUsd: item.totalUsd,
        isDevice: false,
      };
    }
  });

  let tradeIn: CreateTradeInData | undefined;
  if (form.tradeIn) {
    tradeIn = {
      variantId: form.tradeIn.variantId,
      imei: form.tradeIn.imei || undefined,
      condition: form.tradeIn.condition,
      batteryPercentage: form.tradeIn.batteryPercentage,
      osVersion: form.tradeIn.osVersion,
      technicalNotes: form.tradeIn.technicalNotes,
      agreedValueUsd: form.tradeIn.agreedValueUsd,
      notes: form.tradeIn.notes,
    };
  }

  return {
    branchId,
    userId,
    createdBy: userId,
    paymentMethod: form.paymentMethod,
    paymentCurrency: form.paymentCurrency,
    exchangeRate,
    totalWithoutDiscountUsd: totalWithoutDiscount,
    totalDiscountUsd: totalDiscount,
    totalUsd,
    totalBob: totalUsd * exchangeRate,
    nitClient: form.nitClient,
    socialReasonClient: form.socialReasonClient,
    saleNotes: form.saleNotes,
    clientId: form.clientId,
    items,
    tradeIn,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateSaleModal = memo(
  ({ open, onClose, onSaleCreated }: CreateSaleModalProps) => {
    const { user } = useGlobalStates();
    const { currentBranch } = useBranchStore();
    const exchangeRate = useExchangeRateStore((s) => s.currentRate);
    const queryClient = useQueryClient();

    // Form state
    const [formState, setFormState] = useState<SaleFormState>({
      cartItems: [],
      paymentMethod: "cash",
      paymentCurrency: "bob",
    });

    // UI state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedSale, setCompletedSale] = useState<SaleView | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    // Device/accessory search
    const [activeTab, setActiveTab] = useState<"devices" | "accessories">(
      "devices"
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [deviceResults, setDeviceResults] = useState<
      RawInventoryItemForSale[]
    >([]);
    const [accessoryResults, setAccessoryResults] = useState<
      RawAccessoryForSale[]
    >([]);
    const [isSearching, setIsSearching] = useState(false);

    // Trade-in
    const [showTradeIn, setShowTradeIn] = useState(false);
    const [tradeInDraft, setTradeInDraft] = useState<Partial<TradeInState>>({
      condition: "pre_owned",
    });
    const [variantSearchQuery, setVariantSearchQuery] = useState("");
    const [variantResults, setVariantResults] = useState<RawVariantForTradeIn[]>(
      []
    );
    const [isSearchingVariants, setIsSearchingVariants] = useState(false);

    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    const variantDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    // ─── Computed totals ──────────────────────────────────────────────────────
    const totalWithoutDiscount = formState.cartItems.reduce(
      (sum, item) =>
        sum +
        (item.type === "device"
          ? item.unitPriceUsd
          : item.unitPriceUsd * (item as CartAccessoryItem).quantity),
      0
    );
    const itemsDiscountUsd = formState.cartItems.reduce(
      (sum, item) =>
        sum +
        (item.type === "device"
          ? item.discountUsd
          : item.discountUsd * (item as CartAccessoryItem).quantity),
      0
    );
    const tradeInDiscount = formState.tradeIn?.agreedValueUsd ?? 0;
    const totalDiscountUsd = itemsDiscountUsd + tradeInDiscount;
    const totalUsd = Math.max(0, totalWithoutDiscount - totalDiscountUsd);
    const totalBob = totalUsd * exchangeRate;

    // ─── Mutation ─────────────────────────────────────────────────────────────
    const createMutation = useMutation({
      mutationFn: (data: CreateSaleData) => salesService.create(data),
      onSuccess: (saleView) => {
        setCompletedSale(saleView);
        setShowSuccessModal(true);
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        if (onSaleCreated) onSaleCreated();
        toast.success("Venta realizada exitosamente");
        handleReset();
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Error al procesar la venta"
        );
      },
    });

    // ─── Search: devices ──────────────────────────────────────────────────────
    const searchDevices = useCallback(
      async (q: string) => {
        if (!currentBranch?.id) return;
        setIsSearching(true);
        try {
          // Avoid nested OR filters in PostgREST because they can intermittently fail with 400.
          // Fetch branch inventory and filter locally by IMEI/model text.
          const url = `/inventory_items?status=eq.available&branch_id=eq.${currentBranch.id}&select=${DEVICE_SELECT}&limit=200`;
          const results = (await pgFetch<RawInventoryItemForSale[]>(url)) ?? [];

          const term = q.trim().toLowerCase();
          if (term.length >= 2) {
            const filtered = results.filter((item) => {
              const imei = item.imei?.toLowerCase() ?? "";
              const variantText = formatVariantDisplay(item.product_variants).toLowerCase();
              return imei.includes(term) || variantText.includes(term);
            });
            setDeviceResults(filtered);
          } else {
            setDeviceResults(results);
          }
        } catch {
          setDeviceResults([]);
        } finally {
          setIsSearching(false);
        }
      },
      [currentBranch?.id]
    );

    // ─── Search: accessories ──────────────────────────────────────────────────
    const searchAccessories = useCallback(
      async (q: string) => {
        if (!currentBranch?.id) return;
        setIsSearching(true);
        try {
          // accessories.branch_id and .stock were removed in migration 012.
          // stock lives in accessory_stock table; use !inner to only return
          // accessories that have stock for this branch.
          let url = `/accessories?is_deleted=eq.false&select=id,name,sale_price_usd,accessory_stock!inner(stock)&accessory_stock.branch_id=eq.${currentBranch.id}&accessory_stock.stock=gt.0&limit=50`;
          if (q.trim().length >= 2) {
            url += `&name=ilike.${encodeURIComponent(`*${q.trim()}*`)}`;
          }
          const results = await pgFetch<RawAccessoryForSale[]>(url);
          setAccessoryResults(results ?? []);
        } catch {
          setAccessoryResults([]);
        } finally {
          setIsSearching(false);
        }
      },
      [currentBranch?.id]
    );

    // ─── Search: variants (for trade-in) ──────────────────────────────────────
    const searchVariants = useCallback(async (q: string) => {
      if (q.trim().length < 2) {
        setVariantResults([]);
        return;
      }
      setIsSearchingVariants(true);
      try {
        const encoded = encodeURIComponent(`*${q.trim()}*`);
        const url = `/product_variants?models.name=ilike.${encoded}&select=${VARIANT_SELECT}&limit=20`;
        const results = await pgFetch<RawVariantForTradeIn[]>(url);
        setVariantResults(results ?? []);
      } catch {
        setVariantResults([]);
      } finally {
        setIsSearchingVariants(false);
      }
    }, []);

    // Debounced search effects
    useEffect(() => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        if (activeTab === "devices") {
          searchDevices(searchQuery);
        } else {
          searchAccessories(searchQuery);
        }
      }, 300);
      return () => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      };
    }, [searchQuery, activeTab, searchDevices, searchAccessories]);

    useEffect(() => {
      if (variantDebounceRef.current) clearTimeout(variantDebounceRef.current);
      variantDebounceRef.current = setTimeout(() => {
        searchVariants(variantSearchQuery);
      }, 300);
      return () => {
        if (variantDebounceRef.current) clearTimeout(variantDebounceRef.current);
      };
    }, [variantSearchQuery, searchVariants]);

    // Load initial results when modal opens
    useEffect(() => {
      if (open && currentBranch?.id) {
        searchDevices("");
        searchAccessories("");
      }
    }, [open, currentBranch?.id, searchDevices, searchAccessories]);

    // ─── Cart handlers ────────────────────────────────────────────────────────
    const handleAddDevice = useCallback(
      (item: RawInventoryItemForSale) => {
        const alreadyInCart = formState.cartItems.some(
          (c) => c.type === "device" && c.inventoryItemId === item.id
        );
        if (alreadyInCart) {
          toast.warning("Este dispositivo ya está en el carrito");
          return;
        }
        // Prefer item-level price; fall back to variant price (e.g. new devices without individual price)
        const priceUsd = item.sale_price_usd ?? item.product_variants?.sale_price_usd ?? 0;
        const cartItem: CartDeviceItem = {
          type: "device",
          cartItemId: crypto.randomUUID(),
          inventoryItemId: item.id,
          variantDisplay: formatVariantDisplay(item.product_variants),
          variantId: item.variant_id,
          imei: item.imei ?? undefined,
          condition: item.condition,
          unitPriceUsd: priceUsd,
          discountPct: 0,
          discountUsd: 0,
          totalUsd: priceUsd,
        };
        setFormState((prev) => ({
          ...prev,
          cartItems: [...prev.cartItems, cartItem],
        }));
        toast.success(`Agregado: ${cartItem.variantDisplay}`);
      },
      [formState.cartItems]
    );

    const handleAddAccessory = useCallback(
      (item: RawAccessoryForSale) => {
        const stockAvailable = item.accessory_stock[0]?.stock ?? 0;
        const priceUsd = item.sale_price_usd ?? 0;
        const existing = formState.cartItems.find(
          (c) => c.type === "accessory" && c.accessoryId === item.id
        ) as CartAccessoryItem | undefined;

        if (existing) {
          if (existing.quantity >= stockAvailable) {
            toast.warning("Stock insuficiente");
            return;
          }
          setFormState((prev) => ({
            ...prev,
            cartItems: prev.cartItems.map((c) => {
              if (c.type !== "accessory" || c.accessoryId !== item.id)
                return c;
              const acc = c as CartAccessoryItem;
              const newQty = acc.quantity + 1;
              const discUsd = (acc.unitPriceUsd * acc.discountPct) / 100;
              return {
                ...acc,
                quantity: newQty,
                totalUsd: (acc.unitPriceUsd - discUsd) * newQty,
              };
            }),
          }));
        } else {
          const cartItem: CartAccessoryItem = {
            type: "accessory",
            cartItemId: crypto.randomUUID(),
            accessoryId: item.id,
            accessoryName: item.name,
            availableStock: stockAvailable,
            quantity: 1,
            unitPriceUsd: priceUsd,
            discountPct: 0,
            discountUsd: 0,
            totalUsd: priceUsd,
          };
          setFormState((prev) => ({
            ...prev,
            cartItems: [...prev.cartItems, cartItem],
          }));
          toast.success(`Agregado: ${item.name}`);
        }
      },
      [formState.cartItems]
    );

    const handleRemoveCartItem = useCallback((cartItemId: string) => {
      setFormState((prev) => ({
        ...prev,
        cartItems: prev.cartItems.filter((c) => c.cartItemId !== cartItemId),
      }));
    }, []);

    const handleUpdateDiscount = useCallback(
      (cartItemId: string, discountPct: number) => {
        setFormState((prev) => ({
          ...prev,
          cartItems: prev.cartItems.map((item) => {
            if (item.cartItemId !== cartItemId) return item;
            const pct = Math.min(100, Math.max(0, discountPct));
            const discountUsd = (item.unitPriceUsd * pct) / 100;
            if (item.type === "device") {
              return {
                ...item,
                discountPct: pct,
                discountUsd,
                totalUsd: item.unitPriceUsd - discountUsd,
              };
            } else {
              const acc = item as CartAccessoryItem;
              return {
                ...acc,
                discountPct: pct,
                discountUsd,
                totalUsd: (acc.unitPriceUsd - discountUsd) * acc.quantity,
              };
            }
          }),
        }));
      },
      []
    );

    const handleUpdateQty = useCallback(
      (cartItemId: string, delta: number) => {
        setFormState((prev) => ({
          ...prev,
          cartItems: prev.cartItems.map((item) => {
            if (item.type !== "accessory" || item.cartItemId !== cartItemId)
              return item;
            const acc = item as CartAccessoryItem;
            const qty = Math.max(
              1,
              Math.min(acc.availableStock, acc.quantity + delta)
            );
            const discountUsd = (acc.unitPriceUsd * acc.discountPct) / 100;
            return {
              ...acc,
              quantity: qty,
              totalUsd: (acc.unitPriceUsd - discountUsd) * qty,
            };
          }),
        }));
      },
      []
    );

    // ─── Trade-in handlers ────────────────────────────────────────────────────
    const handleApplyTradeIn = useCallback(() => {
      if (
        !tradeInDraft.variantId ||
        !tradeInDraft.condition ||
        !tradeInDraft.agreedValueUsd
      ) {
        toast.error(
          "Completa los campos obligatorios del trade-in (variante, condición y valor)"
        );
        return;
      }
      const tradeIn: TradeInState = {
        variantId: tradeInDraft.variantId!,
        variantDisplay: tradeInDraft.variantDisplay ?? "Dispositivo",
        imei: tradeInDraft.imei ?? "",
        condition: tradeInDraft.condition!,
        batteryPercentage: tradeInDraft.batteryPercentage,
        osVersion: tradeInDraft.osVersion,
        technicalNotes: tradeInDraft.technicalNotes,
        agreedValueUsd: tradeInDraft.agreedValueUsd!,
        notes: tradeInDraft.notes,
      };
      setFormState((prev) => ({ ...prev, tradeIn }));
      setShowTradeIn(false);
      toast.success("Trade-in aplicado como descuento");
    }, [tradeInDraft]);

    const handleRemoveTradeIn = useCallback(() => {
      setFormState((prev) => ({ ...prev, tradeIn: undefined }));
      setTradeInDraft({ condition: "pre_owned" });
    }, []);

    // ─── Client / NIT / Notes handlers ───────────────────────────────────────
    const handleClientSelect = useCallback((client: Client | null) => {
      setFormState((prev) => ({
        ...prev,
        clientId: client?.id,
        clientName: client?.name,
      }));
    }, []);

    const handleNitSelect = useCallback((nit: NIT | null) => {
      setFormState((prev) => ({
        ...prev,
        nitClient: nit?.numberNit,
        socialReasonClient: nit?.socialReason,
      }));
    }, []);

    // ─── Submit ───────────────────────────────────────────────────────────────
    const handleConfirmSale = useCallback(() => {
      if (formState.cartItems.length === 0) {
        toast.error("Agrega al menos un producto para realizar la venta");
        return;
      }
      if (!user?.id || !currentBranch?.id) {
        toast.error("No se pudo identificar al usuario o la sucursal");
        return;
      }
      const data = buildCreateSaleData(
        formState,
        user.id,
        currentBranch.id,
        exchangeRate,
        totalWithoutDiscount,
        totalDiscountUsd,
        totalUsd
      );
      createMutation.mutate(data);
    }, [
      formState,
      user,
      currentBranch,
      exchangeRate,
      totalWithoutDiscount,
      totalDiscountUsd,
      totalUsd,
      createMutation,
    ]);

    const handleReset = useCallback(() => {
      setFormState({ cartItems: [], paymentMethod: "cash", paymentCurrency: "bob" });
      setSearchQuery("");
      setDeviceResults([]);
      setAccessoryResults([]);
      setShowTradeIn(false);
      setTradeInDraft({ condition: "pre_owned" });
      setVariantSearchQuery("");
      setVariantResults([]);
    }, []);

    const handleCancel = useCallback(() => {
      if (formState.cartItems.length > 0) {
        setShowCancelDialog(true);
      } else {
        onClose();
        handleReset();
      }
    }, [formState.cartItems, onClose, handleReset]);

    const handleConfirmCancel = useCallback(() => {
      handleReset();
      setShowCancelDialog(false);
      onClose();
    }, [onClose, handleReset]);

    const handleCloseSuccessModal = useCallback(() => {
      setShowSuccessModal(false);
      setCompletedSale(null);
      onClose();
    }, [onClose]);

    const isProcessing = createMutation.isPending;

    // ─── Render helpers ───────────────────────────────────────────────────────
    const renderSearchResults = () => {
      if (isSearching) {
        return (
          <p className="text-sm text-gray-500 px-3 py-2">Buscando...</p>
        );
      }
      if (activeTab === "devices") {
        if (deviceResults.length === 0) {
          return (
            <p className="text-sm text-gray-400 px-3 py-2">Sin resultados</p>
          );
        }
        return deviceResults.map((item) => {
          const display = formatVariantDisplay(item.product_variants);
          const inCart = formState.cartItems.some(
            (c) => c.type === "device" && c.inventoryItemId === item.id
          );
          return (
            <button
              key={item.id}
              onClick={() => handleAddDevice(item)}
              disabled={inCart || isProcessing}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <p className="text-sm font-medium">{display}</p>
                {item.imei && (
                  <p className="text-xs text-gray-500">IMEI: {item.imei}</p>
                )}
                <p className="text-xs text-gray-500 capitalize">
                  {item.condition.replace(/_/g, " ")}
                </p>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-semibold text-green-700">
                  ${(item.sale_price_usd ?? item.product_variants?.sale_price_usd ?? 0).toFixed(2)}
                </p>
                {inCart ? (
                  <Badge variant="secondary" className="text-xs">
                    En carrito
                  </Badge>
                ) : (
                  <Plus className="h-4 w-4 text-gray-400 group-hover:text-green-600 ml-auto" />
                )}
              </div>
            </button>
          );
        });
      } else {
        if (accessoryResults.length === 0) {
          return (
            <p className="text-sm text-gray-400 px-3 py-2">Sin resultados</p>
          );
        }
        return accessoryResults.map((item) => {
          const cartItem = formState.cartItems.find(
            (c) => c.type === "accessory" && c.accessoryId === item.id
          ) as CartAccessoryItem | undefined;
          return (
            <button
              key={item.id}
              onClick={() => handleAddAccessory(item)}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-500">Stock: {item.accessory_stock[0]?.stock ?? 0}</p>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-semibold text-green-700">
                  ${(item.sale_price_usd ?? 0).toFixed(2)}
                </p>
                {cartItem ? (
                  <Badge variant="secondary" className="text-xs">
                    x{cartItem.quantity}
                  </Badge>
                ) : (
                  <Plus className="h-4 w-4 text-gray-400 group-hover:text-green-600 ml-auto" />
                )}
              </div>
            </button>
          );
        });
      }
    };

    // ─── JSX ──────────────────────────────────────────────────────────────────
    return (
      <>
        <Dialog open={open} onOpenChange={handleCancel}>
          <DialogContent className="max-w-[95vw] h-[95vh] p-0 min-w-[85vw]!">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-2xl">Nueva Venta</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden px-6 pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

                {/* ── Left + Center: Search + Cart ── */}
                <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2">

                  {/* Product search card */}
                  <Card>
                    <CardContent className="p-0">
                      {/* Tabs */}
                      <div className="flex border-b">
                        <button
                          onClick={() => {
                            setActiveTab("devices");
                            setSearchQuery("");
                          }}
                          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "devices"
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <Smartphone className="h-4 w-4" />
                          Dispositivos
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("accessories");
                            setSearchQuery("");
                          }}
                          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "accessories"
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <Package className="h-4 w-4" />
                          Accesorios
                        </button>
                      </div>

                      {/* Search input + floating popover results */}
                      <div className="p-3 relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder={
                              activeTab === "devices"
                                ? "Buscar por modelo o IMEI..."
                                : "Buscar accesorio..."
                            }
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-8 h-9"
                            disabled={isProcessing}
                          />
                          {searchQuery && (
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setSearchQuery("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              tabIndex={-1}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {searchQuery.trim().length > 0 && (
                          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {renderSearchResults()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cart table */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>
                          Carrito ({formState.cartItems.length} item(s))
                        </span>
                        {formState.cartItems.length > 0 && (
                          <span className="text-sm font-normal text-gray-500">
                            Total:{" "}
                            <span className="font-semibold text-green-700">
                              ${totalUsd.toFixed(2)} USD
                            </span>
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {formState.cartItems.length === 0 ? (
                        <p className="text-sm text-gray-400 px-4 py-6 text-center">
                          Agrega dispositivos o accesorios al carrito
                        </p>
                      ) : (
                        <div className="divide-y">
                          {formState.cartItems.map((item) => (
                            <div
                              key={item.cartItemId}
                              className="px-4 py-3 flex items-start gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {item.type === "device" ? (
                                    <Smartphone className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                  ) : (
                                    <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                  )}
                                  <p className="text-sm font-medium truncate">
                                    {item.type === "device"
                                      ? item.variantDisplay
                                      : (item as CartAccessoryItem)
                                          .accessoryName}
                                  </p>
                                </div>
                                {item.type === "device" && item.imei && (
                                  <p className="text-xs text-gray-500 ml-6">
                                    IMEI: {item.imei}
                                  </p>
                                )}
                                {item.type === "accessory" && (
                                  <div className="flex items-center gap-1 ml-6 mt-1">
                                    <button
                                      onClick={() =>
                                        handleUpdateQty(item.cartItemId, -1)
                                      }
                                      className="h-5 w-5 rounded border flex items-center justify-center hover:bg-gray-100"
                                      disabled={isProcessing}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="text-xs w-5 text-center">
                                      {(item as CartAccessoryItem).quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleUpdateQty(item.cartItemId, 1)
                                      }
                                      className="h-5 w-5 rounded border flex items-center justify-center hover:bg-gray-100"
                                      disabled={isProcessing}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Discount input */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  Desc. %
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  value={item.discountPct}
                                  onChange={(e) =>
                                    handleUpdateDiscount(
                                      item.cartItemId,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-7 text-xs w-14 text-center"
                                  disabled={isProcessing}
                                />
                              </div>

                              {/* Price */}
                              <div className="text-right w-20">
                                <p className="text-sm font-semibold text-green-700">
                                  ${item.totalUsd.toFixed(2)}
                                </p>
                                {item.discountPct > 0 && (
                                  <p className="text-xs text-gray-400 line-through">
                                    ${item.unitPriceUsd.toFixed(2)}
                                  </p>
                                )}
                              </div>

                              {/* Remove */}
                              <button
                                onClick={() =>
                                  handleRemoveCartItem(item.cartItemId)
                                }
                                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                disabled={isProcessing}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Trade-in section */}
                  <Card>
                    <Collapsible open={showTradeIn} onOpenChange={setShowTradeIn}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full h-auto p-4 justify-between hover:bg-gray-50"
                          disabled={isProcessing}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Trade-in (dispositivo a recibir)
                            </span>
                            {formState.tradeIn && (
                              <Badge variant="secondary" className="ml-2">
                                -{formState.tradeIn.agreedValueUsd.toFixed(2)} USD
                              </Badge>
                            )}
                          </div>
                          {showTradeIn ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pb-4 space-y-3">
                          {formState.tradeIn ? (
                            // Applied trade-in summary
                            <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 space-y-1">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-amber-900">
                                  {formState.tradeIn.variantDisplay}
                                </p>
                                <button
                                  onClick={handleRemoveTradeIn}
                                  className="text-amber-600 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              {formState.tradeIn.imei && (
                                <p className="text-xs text-amber-700">
                                  IMEI: {formState.tradeIn.imei}
                                </p>
                              )}
                              <p className="text-xs text-amber-700 capitalize">
                                Condición:{" "}
                                {formState.tradeIn.condition.replace(/_/g, " ")}
                                {formState.tradeIn.batteryPercentage
                                  ? ` · Batería: ${formState.tradeIn.batteryPercentage}%`
                                  : ""}
                              </p>
                              <p className="text-sm font-semibold text-amber-800">
                                Descuento acordado: $
                                {formState.tradeIn.agreedValueUsd.toFixed(2)} USD
                              </p>
                            </div>
                          ) : (
                            // Trade-in form
                            <div className="space-y-3">
                              {/* Variant search */}
                              <div>
                                <Label className="text-xs mb-1 block">
                                  Modelo del dispositivo *
                                </Label>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                  <Input
                                    placeholder="Buscar modelo (ej: iPhone 15)..."
                                    value={variantSearchQuery}
                                    onChange={(e) => {
                                      setVariantSearchQuery(e.target.value);
                                      if (!e.target.value) {
                                        setTradeInDraft((d) => ({
                                          ...d,
                                          variantId: undefined,
                                          variantDisplay: undefined,
                                        }));
                                      }
                                    }}
                                    className="pl-8 h-8 text-sm"
                                  />
                                </div>
                                {tradeInDraft.variantId && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    ✓ {tradeInDraft.variantDisplay}
                                  </p>
                                )}
                                {variantResults.length > 0 &&
                                  !tradeInDraft.variantId && (
                                    <div className="border rounded mt-1 max-h-32 overflow-y-auto bg-white shadow-sm">
                                      {variantResults.map((v) => (
                                        <button
                                          key={v.id}
                                          onClick={() => {
                                            const display =
                                              formatVariantDisplayFromRaw(v);
                                            setTradeInDraft((d) => ({
                                              ...d,
                                              variantId: v.id,
                                              variantDisplay: display,
                                            }));
                                            setVariantResults([]);
                                            setVariantSearchQuery(display);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                                        >
                                          {formatVariantDisplayFromRaw(v)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                {isSearchingVariants && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Buscando...
                                  </p>
                                )}
                              </div>

                              {/* IMEI + Condition */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs mb-1 block">
                                    IMEI (opcional)
                                  </Label>
                                  <Input
                                    value={tradeInDraft.imei ?? ""}
                                    onChange={(e) =>
                                      setTradeInDraft((d) => ({
                                        ...d,
                                        imei: e.target.value,
                                      }))
                                    }
                                    className="h-8 text-sm"
                                    placeholder="123456789012345"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs mb-1 block">
                                    Condición
                                  </Label>
                                  <div className="h-8 flex items-center px-2 bg-amber-50 border border-amber-200 rounded-md">
                                    <span className="text-xs font-medium text-amber-700">
                                      Seminuevo (automático)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Battery + OS */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs mb-1 block">
                                    Batería %
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={tradeInDraft.batteryPercentage ?? ""}
                                    onChange={(e) =>
                                      setTradeInDraft((d) => ({
                                        ...d,
                                        batteryPercentage:
                                          parseInt(e.target.value) || undefined,
                                      }))
                                    }
                                    className="h-8 text-sm"
                                    placeholder="85"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs mb-1 block">
                                    Versión OS
                                  </Label>
                                  <Input
                                    value={tradeInDraft.osVersion ?? ""}
                                    onChange={(e) =>
                                      setTradeInDraft((d) => ({
                                        ...d,
                                        osVersion: e.target.value,
                                      }))
                                    }
                                    className="h-8 text-sm"
                                    placeholder="iOS 17.5"
                                  />
                                </div>
                              </div>

                              {/* Agreed value + technical notes */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs mb-1 block">
                                    Valor acordado USD *
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={tradeInDraft.agreedValueUsd ?? ""}
                                    onChange={(e) =>
                                      setTradeInDraft((d) => ({
                                        ...d,
                                        agreedValueUsd:
                                          parseFloat(e.target.value) || 0,
                                      }))
                                    }
                                    className="h-8 text-sm"
                                    placeholder="150.00"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs mb-1 block">
                                    Notas técnicas
                                  </Label>
                                  <Input
                                    value={tradeInDraft.technicalNotes ?? ""}
                                    onChange={(e) =>
                                      setTradeInDraft((d) => ({
                                        ...d,
                                        technicalNotes: e.target.value,
                                      }))
                                    }
                                    className="h-8 text-sm"
                                    placeholder="Pantalla rayada, batería ok..."
                                  />
                                </div>
                              </div>

                              <Button
                                size="sm"
                                onClick={handleApplyTradeIn}
                                className="w-full"
                                disabled={
                                  !tradeInDraft.variantId ||
                                  !tradeInDraft.agreedValueUsd
                                }
                              >
                                Aplicar Trade-in
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                </div>

                {/* ── Right: Client, NIT, Notes, Payment, Summary ── */}
                <div className="space-y-4 overflow-y-auto pr-1">

                  <ClientSection
                    selectedClientId={formState.clientId}
                    selectedClientName={formState.clientName}
                    onClientSelect={handleClientSelect}
                    disabled={isProcessing}
                  />

                  <NitSection
                    selectedNitClient={formState.nitClient}
                    selectedSocialReasonClient={formState.socialReasonClient}
                    onNitSelect={handleNitSelect}
                    disabled={isProcessing}
                  />

                  <SaleNotes
                    notes={formState.saleNotes}
                    onNotesChange={(notes) =>
                      setFormState((prev) => ({ ...prev, saleNotes: notes }))
                    }
                    disabled={isProcessing}
                  />

                  {/* Payment */}
                  <Card className="!gap-1 !py-2">
                    <CardContent className="px-4 pb-3 pt-2 space-y-3">
                      {/* Method */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Método de pago
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                            <button
                              key={id}
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  paymentMethod: id,
                                }))
                              }
                              disabled={isProcessing}
                              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-xs transition-colors ${
                                formState.paymentMethod === id
                                  ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                                  : "border-gray-200 hover:border-gray-300 text-gray-600"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Currency */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Moneda
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {PAYMENT_CURRENCIES.map(({ id, label }) => (
                            <button
                              key={id}
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  paymentCurrency: id,
                                }))
                              }
                              disabled={isProcessing}
                              className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                                formState.paymentCurrency === id
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                  : "border-gray-200 hover:border-gray-300 text-gray-600"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Resumen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>${totalWithoutDiscount.toFixed(2)} USD</span>
                      </div>
                      {itemsDiscountUsd > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Descuento items:</span>
                          <span>-${itemsDiscountUsd.toFixed(2)} USD</span>
                        </div>
                      )}
                      {formState.tradeIn && (
                        <div className="flex justify-between text-sm text-amber-600">
                          <span className="truncate max-w-[120px]">
                            Trade-in:
                          </span>
                          <span>-${tradeInDiscount.toFixed(2)} USD</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total USD:</span>
                        <span className="text-green-700">
                          ${totalUsd.toFixed(2)}
                        </span>
                      </div>
                      {formState.paymentCurrency === "bob" ? (
                        <div className="flex justify-between text-sm font-medium text-emerald-700">
                          <span>Total Bs (TC: {exchangeRate}):</span>
                          <span>{totalBob.toFixed(2)} Bs</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Equivalente Bs (TC: {exchangeRate}):</span>
                          <span>{totalBob.toFixed(2)} Bs</span>
                        </div>
                      )}

                      <div className="pt-2 space-y-2">
                        <Button
                          className="w-full"
                          onClick={handleConfirmSale}
                          disabled={
                            isProcessing || formState.cartItems.length === 0
                          }
                        >
                          {isProcessing ? "Procesando..." : "Confirmar Venta"}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleCancel}
                          disabled={isProcessing}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <CustomDialog
          isOpen={showCancelDialog}
          onConfirm={handleConfirmCancel}
          onCancel={() => setShowCancelDialog(false)}
          title="Cancelar venta?"
          description="Estas seguro de cancelar la venta? Se perderan todos los items agregados."
          textConfirm="Si, cancelar"
          textCancel="No, continuar"
        />

        <SaleSuccessDialog
          open={showSuccessModal}
          onClose={handleCloseSuccessModal}
          sale={completedSale}
        />
      </>
    );
  }
);

CreateSaleModal.displayName = "CreateSaleModal";

export default CreateSaleModal;
