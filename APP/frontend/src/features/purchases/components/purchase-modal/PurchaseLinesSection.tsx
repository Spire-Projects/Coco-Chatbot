import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { AccessoryView } from "@/shared/types/modelTypes/Accessory";
import type { ProductView } from "@/shared/types/modelTypes/Product";
import { LineCard } from "./LineCard";
import type { LineState, ItemState } from "./types";

interface PurchaseLinesSectionProps {
  lines: LineState[];
  totalUnits: number;
  initialProducts: ProductView[];
  initialAccessories: AccessoryView[];
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  onToggleExpand: (lineId: string) => void;
  onLineTypeChange: (lineId: string, type: LineState["type"]) => void;
  onVariantChange: (lineId: string, v: ProductView | null) => void;
  onAccessoryChange: (lineId: string, v: AccessoryView | null) => void;
  onConditionChange: (lineId: string, c: LineState["condition"]) => void;
  onQuantityChange: (lineId: string, qty: string) => void;
  onQuantityBlur: (lineId: string) => void;
  onLinePriceChange: (lineId: string, price: string) => void;
  onItemChange: (lineId: string, itemId: string, field: keyof ItemState, value: string) => void;
  onAddItem: (lineId: string) => void;
  onRemoveItem: (lineId: string, itemId: string) => void;
}

export function PurchaseLinesSection({
  lines, totalUnits, initialProducts, initialAccessories,
  onAddLine, onRemoveLine, onToggleExpand,
  onLineTypeChange, onVariantChange, onAccessoryChange,
  onConditionChange, onQuantityChange, onQuantityBlur, onLinePriceChange,
  onItemChange, onAddItem, onRemoveItem,
}: PurchaseLinesSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Lineas de compra</h4>
          <p className="text-xs text-gray-500">{lines.length} linea(s) · {totalUnits} unidad(es)</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
          <Plus className="h-4 w-4 mr-1" /> Agregar linea
        </Button>
      </div>

      {lines.map((line, lineIndex) => (
        <LineCard
          key={line.id}
          line={line}
          lineIndex={lineIndex}
          initialProducts={initialProducts}
          initialAccessories={initialAccessories}
          onLineTypeChange={(type) => onLineTypeChange(line.id, type)}
          onVariantChange={(v) => onVariantChange(line.id, v)}
          onAccessoryChange={(v) => onAccessoryChange(line.id, v)}
          onConditionChange={(c) => onConditionChange(line.id, c)}
          onQuantityChange={(qty) => onQuantityChange(line.id, qty)}
          onQuantityBlur={() => onQuantityBlur(line.id)}
          onLinePriceChange={(price) => onLinePriceChange(line.id, price)}
          onItemChange={(itemId, field, value) => onItemChange(line.id, itemId, field, value)}
          onAddItem={() => onAddItem(line.id)}
          onRemoveItem={(itemId) => onRemoveItem(line.id, itemId)}
          onRemoveLine={() => onRemoveLine(line.id)}
          onToggleExpand={() => onToggleExpand(line.id)}
          canRemoveLine={lines.length > 1}
        />
      ))}
    </div>
  );
}
