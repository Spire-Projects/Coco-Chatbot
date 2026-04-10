import { memo, useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import type { AccessoryView } from "@/shared/types/modelTypes/Accessory";
import type { PurchaseLine, PurchaseItemInput } from "@/shared/types/modelTypes/PurchaseBox";
import type { Supplier } from "@/shared/types/modelTypes/Supplier";
import type { ProductView } from "@/shared/types/modelTypes/Product";
import { accessoryService } from "@/shared/services/AccessoryService";
import { purchaseService } from "@/shared/services/PurchaseService";
import { supplierService } from "@/shared/services/SupplierService";
import { productService } from "@/shared/services/ProductService";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { Form } from "@/shared/components/ui/form";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

import {
  headerSchema, emptyLine, emptyItem,
  type HeaderForm, type CreatePurchaseModalProps, type LineState, type ItemState,
} from "./purchase-modal/types";
import { PurchaseHeaderForm } from "./purchase-modal/PurchaseHeaderForm";
import { PurchaseLinesSection } from "./purchase-modal/PurchaseLinesSection";

const CreatePurchaseModalComponent = ({
  isOpen, onClose, onSuccess, createdBy, branchId,
}: CreatePurchaseModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  const [initialSuppliers, setInitialSuppliers] = useState<Supplier[]>([]);
  const [initialProducts, setInitialProducts] = useState<ProductView[]>([]);
  const [initialAccessories, setInitialAccessories] = useState<AccessoryView[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const form = useForm<HeaderForm>({
    resolver: zodResolver(headerSchema),
    defaultValues: {
      supplierId: "",
      purchasedAt: new Date().toISOString().split("T")[0],
      totalUsd: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    supplierService.getAllView(1, 100).then((r) => setInitialSuppliers(r.items)).catch(console.error);
    productService.getAllView(1, 100).then((r) => setInitialProducts(r.items)).catch(console.error);
    accessoryService.getAllView(1, 100).then((r) => setInitialAccessories(r.items)).catch(console.error);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setLines([emptyLine()]);
      setSelectedSupplier(null);
      setSubmitError(null);
    }
  }, [isOpen, form]);

  const addLine = useCallback(() => setLines((p) => [...p, emptyLine()]), []);

  const removeLine = useCallback((lineId: string) => {
    setLines((p) => p.filter((l) => l.id !== lineId));
  }, []);

  const toggleExpand = useCallback((lineId: string) => {
    setLines((p) => p.map((l) => l.id === lineId ? { ...l, expanded: !l.expanded } : l));
  }, []);

  const updateLine = useCallback(<K extends keyof LineState>(lineId: string, key: K, value: LineState[K]) => {
    setLines((p) => p.map((l) => l.id === lineId ? { ...l, [key]: value } : l));
  }, []);

  const handleLineTypeChange = useCallback((lineId: string, type: LineState["type"]) => {
    setLines((prev) => prev.map((line) => {
      if (line.id !== lineId || line.type === type) return line;
      const fresh = emptyLine();
      return {
        ...fresh,
        id: line.id,
        expanded: line.expanded,
        type,
        items: type === "device" ? fresh.items : [],
      };
    }));
  }, []);

  const addItem = useCallback((lineId: string) => {
    setLines((p) => p.map((l) => l.id === lineId ? { ...l, items: [...l.items, emptyItem()] } : l));
  }, []);

  const removeItem = useCallback((lineId: string, itemId: string) => {
    setLines((p) => p.map((l) =>
      l.id === lineId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
    ));
  }, []);

  const updateItem = useCallback((lineId: string, itemId: string, field: keyof ItemState, value: string) => {
    setLines((p) => p.map((l) =>
      l.id === lineId
        ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, [field]: value } : i) }
        : l
    ));
  }, []);

  const handleQuantityChange = useCallback((lineId: string, qty: string) => {
    const trimmed = qty.trim();
    setLines((p) => p.map((l) => {
      if (l.id !== lineId) return l;
      if (l.type === "accessory") {
        if (trimmed === "") return { ...l, quantity: "" };
        const parsed = parseInt(trimmed, 10);
        if (!Number.isFinite(parsed)) return { ...l, quantity: qty };
        return { ...l, quantity: String(Math.max(1, parsed)) };
      }
      if (trimmed === "") return { ...l, quantity: "" };

      const parsed = parseInt(trimmed, 10);
      if (!Number.isFinite(parsed)) return { ...l, quantity: qty };

      const n = Math.max(1, parsed);
      const current = l.items;
      const newItems = n > current.length
        ? [...current, ...Array.from({ length: n - current.length }, emptyItem)]
        : current.slice(0, n);
      return { ...l, quantity: String(n), items: newItems };
    }));
  }, []);

  const handleQuantityBlur = useCallback((lineId: string) => {
    setLines((p) => p.map((l) => {
      if (l.id !== lineId) return l;
      if (l.type === "accessory") {
        return l.quantity.trim() !== "" ? l : { ...l, quantity: "1" };
      }
      if (l.quantity.trim() !== "") return l;
      const current = l.items;
      const newItems = current.length > 1 ? current.slice(0, 1) : current;
      return { ...l, quantity: "1", items: newItems };
    }));
  }, []);

  const handleLinePriceChange = useCallback((lineId: string, price: string) => {
    setLines((p) => p.map((l) => l.id === lineId ? { ...l, linePurchasePriceUsd: price } : l));
  }, []);

  const handleConditionChange = useCallback((lineId: string, condition: LineState["condition"]) => {
    setLines((p) => p.map((l) => {
      if (l.id !== lineId) return l;
      if (l.type === "accessory") return l;
      // When switching to new, sync quantity to current item count
      if (condition === "new") return { ...l, condition, quantity: String(l.items.length) };
      return { ...l, condition };
    }));
  }, []);

  const computedTotalUsd = lines.reduce((sum, line) => {
    if (line.type === "accessory") {
      const quantity = parseInt(line.quantity, 10);
      const price = parseFloat(line.linePurchasePriceUsd);
      return sum + (
        Number.isFinite(quantity) && quantity > 0 && Number.isFinite(price) && price > 0
          ? quantity * price
          : 0
      );
    }

    if (line.condition === "new") {
      const price = parseFloat(line.linePurchasePriceUsd);
      return sum + (Number.isFinite(price) && price > 0 ? price * line.items.length : 0);
    }
    const lineTotal = line.items.reduce((lineSum, item) => {
      const price = parseFloat(item.purchasePriceUsd);
      return Number.isFinite(price) && price > 0 ? lineSum + price : lineSum;
    }, 0);
    return sum + lineTotal;
  }, 0);

  useEffect(() => {
    form.setValue("totalUsd", computedTotalUsd > 0 ? computedTotalUsd : undefined, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [computedTotalUsd, form]);

  const onSubmit = async (header: HeaderForm) => {
    for (const [li, line] of lines.entries()) {
      if (line.type === "accessory") {
        const quantity = parseInt(line.quantity, 10);
        const price = parseFloat(line.linePurchasePriceUsd);
        if (!line.accessory) { setSubmitError(`Linea ${li + 1}: selecciona un accesorio.`); return; }
        if (!Number.isFinite(quantity) || quantity <= 0) {
          setSubmitError(`Linea ${li + 1}: cantidad requerida.`); return;
        }
        if (!line.linePurchasePriceUsd || isNaN(price) || price <= 0) {
          setSubmitError(`Linea ${li + 1}: precio de compra requerido.`); return;
        }
        continue;
      }

      if (!line.variant) { setSubmitError(`Linea ${li + 1}: selecciona una variante.`); return; }
      if (line.condition === "new") {
        const price = parseFloat(line.linePurchasePriceUsd);
        if (!line.linePurchasePriceUsd || isNaN(price) || price <= 0) {
          setSubmitError(`Linea ${li + 1}: precio de compra requerido.`); return;
        }
      } else {
        for (const [ii, item] of line.items.entries()) {
          const purchasePrice = parseFloat(item.purchasePriceUsd);
          const salePrice = parseFloat(item.salePriceUsd);
          if (!item.purchasePriceUsd || isNaN(purchasePrice) || purchasePrice <= 0) {
            setSubmitError(`Linea ${li + 1}, unidad ${ii + 1}: precio de compra requerido.`); return;
          }
          if (!item.salePriceUsd || isNaN(salePrice) || salePrice <= 0) {
            setSubmitError(`Linea ${li + 1}, unidad ${ii + 1}: precio de venta requerido.`); return;
          }
        }
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const purchaseLines: PurchaseLine[] = lines.map((line) => (
        line.type === "accessory"
          ? {
              kind: "accessory",
              accessoryId: line.accessory!.id,
              quantity: parseInt(line.quantity, 10),
              unitPriceUsd: parseFloat(line.linePurchasePriceUsd),
            }
          : {
              kind: "device",
              variantId: line.variant!.id,
              condition: line.condition,
              items: line.items.map((item): PurchaseItemInput => {
                if (line.condition === "new") {
                  return {
                    imei:             item.imei.trim() || undefined,
                    purchasePriceUsd: parseFloat(line.linePurchasePriceUsd),
                  };
                }
                return {
                  imei:              item.imei.trim() || undefined,
                  purchasePriceUsd:  parseFloat(item.purchasePriceUsd),
                  salePriceUsd:      parseFloat(item.salePriceUsd),
                  batteryPercentage: item.batteryPercentage ? parseInt(item.batteryPercentage) : undefined,
                  osVersion:         item.osVersion.trim() || undefined,
                  technicalNotes:    item.technicalNotes.trim() || undefined,
                };
              }),
            }
      ));

      await purchaseService.create({
        supplierId:  header.supplierId,
        branchId,
        totalUsd:    computedTotalUsd,
        purchasedAt: header.purchasedAt,
        notes:       header.notes?.trim() || undefined,
        createdBy,
        lines:       purchaseLines,
      });

      await onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? "Error al registrar la compra";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalUnits = lines.reduce((sum, line) => {
    if (line.type === "accessory") {
      return sum + Math.max(0, parseInt(line.quantity || "0", 10) || 0);
    }
    return sum + line.items.length;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Compra</DialogTitle>
          <DialogDescription>
            Registra el ingreso de dispositivos y accesorios. Los accesorios incrementan stock por cantidad; los dispositivos crean unidades fisicas.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <PurchaseHeaderForm
              form={form}
              computedTotalUsd={computedTotalUsd}
              initialSuppliers={initialSuppliers}
              selectedSupplier={selectedSupplier}
              onSupplierChange={(supplier) => {
                setSelectedSupplier(supplier);
                form.setValue("supplierId", supplier.id, { shouldValidate: true });
              }}
              onSupplierCreated={(supplier) => setInitialSuppliers((p) => [...p, supplier])}
            />

            <Separator />

            <PurchaseLinesSection
              lines={lines}
              totalUnits={totalUnits}
              initialProducts={initialProducts}
              initialAccessories={initialAccessories}
              onAddLine={addLine}
              onRemoveLine={removeLine}
              onToggleExpand={toggleExpand}
              onLineTypeChange={handleLineTypeChange}
              onVariantChange={(lineId, v) => updateLine(lineId, "variant", v)}
              onAccessoryChange={(lineId, v) => updateLine(lineId, "accessory", v)}
              onConditionChange={handleConditionChange}
              onQuantityChange={handleQuantityChange}
              onQuantityBlur={handleQuantityBlur}
              onLinePriceChange={handleLinePriceChange}
              onItemChange={updateItem}
              onAddItem={addItem}
              onRemoveItem={removeItem}
            />

            {submitError && (
              <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
                  : "Registrar compra"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

CreatePurchaseModalComponent.displayName = "CreatePurchaseModal";
export const CreatePurchaseModal = memo(CreatePurchaseModalComponent);
