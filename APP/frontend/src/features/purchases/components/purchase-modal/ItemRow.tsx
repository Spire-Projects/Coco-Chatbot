import { memo } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import type { ItemState } from "./types";

interface ItemRowProps {
  item: ItemState;
  index: number;
  isUsed: boolean;
  /** When true, only the IMEI field is shown (price is set at line level for new items) */
  imeiOnly?: boolean;
  onChange: (field: keyof ItemState, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const ItemRow = memo(({ item, index, isUsed, imeiOnly, onChange, onRemove, canRemove }: ItemRowProps) => (
  <div className="border border-gray-200 rounded-md bg-white p-2 space-y-2">
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-1 flex items-center justify-center text-xs text-gray-400 font-mono h-8">
        #{index + 1}
      </div>

      <div className={imeiOnly ? "col-span-11" : "col-span-7 sm:col-span-8"}>
        <label className="text-[10px] text-gray-400 mb-0.5 block">IMEI</label>
        <Input
          placeholder="IMEI"
          value={item.imei}
          onChange={(e) => onChange("imei", e.target.value)}
          className="text-sm h-8 font-mono"
        />
      </div>

      {!imeiOnly && (
        <div className="col-span-4 sm:col-span-3">
          <label className="text-[10px] text-gray-400 mb-0.5 block">Precio compra *</label>
          <Input
            placeholder="0.00"
            type="number"
            step="0.01"
            value={item.purchasePriceUsd}
            onChange={(e) => onChange("purchasePriceUsd", e.target.value)}
            className="text-sm h-8"
          />
        </div>
      )}

      {canRemove && (
        <div className="col-span-12 sm:col-span-1 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-red-400 hover:text-red-600"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>

    {isUsed && (
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end">
        <div className="col-span-1 sm:col-span-2">
          <label className="text-[10px] text-gray-400 mb-0.5 block">Precio venta *</label>
          <Input
            placeholder="0.00"
            type="number"
            step="0.01"
            value={item.salePriceUsd}
            onChange={(e) => onChange("salePriceUsd", e.target.value)}
            className="text-sm h-8"
          />
        </div>
        <div className="col-span-1 sm:col-span-1">
          <label className="text-[10px] text-gray-400 mb-0.5 block">% Bat.</label>
          <Input
            placeholder="%"
            type="number"
            min="0"
            max="100"
            value={item.batteryPercentage}
            onChange={(e) => onChange("batteryPercentage", e.target.value)}
            className="text-sm h-8"
          />
        </div>
        <div className="col-span-2 sm:col-span-2">
          <label className="text-[10px] text-gray-400 mb-0.5 block">OS</label>
          <Input
            placeholder="OS"
            value={item.osVersion}
            onChange={(e) => onChange("osVersion", e.target.value)}
            className="text-sm h-8"
          />
        </div>
        <div className="col-span-2 sm:col-span-2">
          <label className="text-[10px] text-gray-400 mb-0.5 block">Notas</label>
          <Input
            placeholder="Notas"
            value={item.technicalNotes}
            onChange={(e) => onChange("technicalNotes", e.target.value)}
            className="text-sm h-8"
          />
        </div>
      </div>
    )}
  </div>
));

ItemRow.displayName = "ItemRow";
