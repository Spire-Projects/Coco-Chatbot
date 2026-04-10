import { memo } from "react";
import { Plus, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import type { AccessoryView } from "@/shared/types/modelTypes/Accessory";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import CreatableSelect from "@/shared/components/CreatableSelect";
import { accessoryService } from "@/shared/services/AccessoryService";
import { productService } from "@/shared/services/ProductService";
import type { ProductView } from "@/shared/types/modelTypes/Product";
import { ItemRow } from "./ItemRow";
import type { LineState, ItemState } from "./types";

interface LineCardProps {
  line: LineState;
  lineIndex: number;
  initialProducts: ProductView[];
  initialAccessories: AccessoryView[];
  onLineTypeChange: (type: LineState["type"]) => void;
  onVariantChange: (v: ProductView | null) => void;
  onAccessoryChange: (v: AccessoryView | null) => void;
  onConditionChange: (c: LineState["condition"]) => void;
  onQuantityChange: (qty: string) => void;
  onQuantityBlur: () => void;
  onLinePriceChange: (price: string) => void;
  onItemChange: (itemId: string, field: keyof ItemState, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveLine: () => void;
  onToggleExpand: () => void;
  canRemoveLine: boolean;
}

export const LineCard = memo(({
  line, lineIndex, initialProducts, initialAccessories,
  onLineTypeChange,
  onVariantChange, onConditionChange, onQuantityChange, onQuantityBlur, onLinePriceChange,
  onAccessoryChange,
  onItemChange, onAddItem,
  onRemoveItem, onRemoveLine, onToggleExpand, canRemoveLine,
}: LineCardProps) => {
  const isAccessory = line.type === "accessory";
  const isUsed = line.condition === "used";

  const lineLabel = isAccessory
    ? [line.accessory?.name, line.accessory?.variantDescription].filter(Boolean).join(" · ")
    : line.variant
    ? [line.variant.resolvedModelName ?? line.variant.modelId, line.variant.storage, line.variant.color]
        .filter(Boolean).join(" · ")
    : null;

  const unitCount = isAccessory
    ? Math.max(0, parseInt(line.quantity || "0", 10) || 0)
    : line.items.length;

  return (
    <div className="border rounded-lg bg-gray-50">
      <div className="flex items-center gap-2 p-3">
        <Package className="h-4 w-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Linea {lineIndex + 1}</span>
          {lineLabel && (
            <Badge variant="secondary" className="text-xs truncate max-w-xs">{lineLabel}</Badge>
          )}
          <Badge variant="outline" className="text-xs">{unitCount} unid.</Badge>
        </div>
        <div className="flex items-center gap-1">
          {canRemoveLine && (
            <Button
              type="button" variant="ghost" size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-600"
              onClick={onRemoveLine}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
            {line.expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {line.expanded && (
        <div className="px-3 pb-3 space-y-3">
          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de linea *</label>
              <Select value={line.type} onValueChange={(v) => onLineTypeChange(v as LineState["type"])}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="device">Dispositivo</SelectItem>
                  <SelectItem value="accessory">Accesorio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isAccessory ? (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Variante *</label>
                  <CreatableSelect
                    label="" hideLabel
                    values={initialProducts}
                    selectedValue={line.variant}
                    onChange={onVariantChange}
                    placeholder="Buscar modelo..."
                    searchFunction={(q) => productService.search(q)}
                    displayField="name" valueField="id"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Condicion *</label>
                  <Select value={line.condition} onValueChange={(v) => onConditionChange(v as LineState["condition"])}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nuevo</SelectItem>
                      <SelectItem value="used">Usado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Accesorio *</label>
                <CreatableSelect
                  label="" hideLabel
                  values={initialAccessories}
                  selectedValue={line.accessory}
                  onChange={onAccessoryChange}
                  placeholder="Buscar accesorio..."
                  searchFunction={(q) => accessoryService.search(q)}
                  displayField="name" valueField="id"
                />
              </div>
            )}
          </div>

          {isAccessory && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cantidad *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={line.quantity}
                  onChange={(e) => onQuantityChange(e.target.value)}
                  onBlur={onQuantityBlur}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Precio compra c/u *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={line.linePurchasePriceUsd}
                  onChange={(e) => onLinePriceChange(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* Quantity mode for new items */}
          {!isAccessory && !isUsed && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cantidad *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={line.quantity}
                  onChange={(e) => onQuantityChange(e.target.value)}
                  onBlur={onQuantityBlur}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Precio compra c/u *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={line.linePurchasePriceUsd}
                  onChange={(e) => onLinePriceChange(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {!isAccessory && isUsed ? (
            <>
              <p className="text-[11px] text-gray-400">
                Cada unidad se organiza en 2 filas para una captura mas comoda en mobile y tablet.
              </p>
              {line.items.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  isUsed
                  onChange={(field, value) => onItemChange(item.id, field, value)}
                  onRemove={() => onRemoveItem(item.id)}
                  canRemove={line.items.length > 1}
                />
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar unidad
              </Button>
            </>
          ) : !isAccessory ? (
            <>
              <p className="text-[11px] text-gray-400">
                Ingresa el IMEI de cada unidad (opcional). El precio aplica a todas.
              </p>
              {line.items.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  isUsed={false}
                  imeiOnly
                  onChange={(field, value) => onItemChange(item.id, field, value)}
                  onRemove={() => onRemoveItem(item.id)}
                  canRemove={false}
                />
              ))}
            </>
          ) : (
            <p className="text-[11px] text-gray-400">
              Los accesorios se registran por cantidad. Al guardar la compra se incrementa el stock del accesorio.
            </p>
          )}
        </div>
      )}
    </div>
  );
});

LineCard.displayName = "LineCard";
