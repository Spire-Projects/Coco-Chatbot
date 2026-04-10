import * as z from "zod";
import type { AccessoryView } from "@/shared/types/modelTypes/Accessory";
import type { ProductView } from "@/shared/types/modelTypes/Product";

export const headerSchema = z.object({
  supplierId: z.string().min(1, "El proveedor es obligatorio"),
  purchasedAt: z.string().min(1, "La fecha es obligatoria"),
  totalUsd: z
    .number({ invalid_type_error: "Ingresa un monto valido" })
    .positive("Debe ser mayor a 0")
    .optional()
    .nullable(),
  notes: z.string().optional(),
});

export type HeaderForm = z.infer<typeof headerSchema>;

export interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  createdBy: string;
  branchId: string;
}

export type LineType = "device" | "accessory";
export type ItemCondition = "new" | "used";

export interface LineState {
  id: string;
  type: LineType;
  variant: ProductView | null;
  accessory: AccessoryView | null;
  condition: ItemCondition;
  items: ItemState[];
  expanded: boolean;
  /** Only used when condition === "new": number of units to register */
  quantity: string;
  /** Only used when condition === "new": shared purchase price for all units */
  linePurchasePriceUsd: string;
}

export interface ItemState {
  id: string;
  imei: string;
  purchasePriceUsd: string;
  salePriceUsd: string;
  batteryPercentage: string;
  osVersion: string;
  technicalNotes: string;
}

let _lc = 0;
export const newLineId = () => `line-${++_lc}`;
let _ic = 0;
export const newItemId = () => `item-${++_ic}`;

export function emptyItem(): ItemState {
  return {
    id: newItemId(),
    imei: "",
    purchasePriceUsd: "",
    salePriceUsd: "",
    batteryPercentage: "",
    osVersion: "",
    technicalNotes: "",
  };
}

export function emptyLine(): LineState {
  return {
    id: newLineId(),
    type: "device",
    variant: null,
    accessory: null,
    condition: "new",
    items: [emptyItem()],
    expanded: true,
    quantity: "1",
    linePurchasePriceUsd: "",
  };
}
