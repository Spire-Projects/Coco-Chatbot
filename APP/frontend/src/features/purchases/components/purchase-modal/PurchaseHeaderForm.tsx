import type { UseFormReturn } from "react-hook-form";
import type { Supplier } from "@/shared/types/modelTypes/Supplier";
import { supplierService } from "@/shared/services/SupplierService";
import CreatableSelect from "@/shared/components/CreatableSelect";
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import type { HeaderForm } from "./types";

interface PurchaseHeaderFormProps {
  form: UseFormReturn<HeaderForm>;
  computedTotalUsd: number;
  initialSuppliers: Supplier[];
  selectedSupplier: Supplier | null;
  onSupplierChange: (supplier: Supplier) => void;
  onSupplierCreated: (supplier: Supplier) => void;
}

export function PurchaseHeaderForm({
  form, computedTotalUsd, initialSuppliers, selectedSupplier, onSupplierChange, onSupplierCreated,
}: PurchaseHeaderFormProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 sm:col-span-1">
        <label className="text-sm font-medium block mb-1">Proveedor *</label>
        <CreatableSelect
          label="" hideLabel
          values={initialSuppliers}
          selectedValue={selectedSupplier}
          onChange={onSupplierChange}
          placeholder="Seleccionar proveedor..."
          searchFunction={(q) => supplierService.search(q)}
          displayField="name"
          valueField="id"
          onAddValue={async (name) => {
            const created = await supplierService.create({ name });
            onSupplierCreated(created);
            return created;
          }}
        />
        {form.formState.errors.supplierId && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.supplierId.message}</p>
        )}
      </div>

      <FormField control={form.control} name="purchasedAt" render={({ field }) => (
        <FormItem>
          <FormLabel>Fecha de compra *</FormLabel>
          <FormControl><Input type="date" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="totalUsd" render={({ field }) => (
        <FormItem>
          <FormLabel>Monto total compra (auto)</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={computedTotalUsd > 0 ? computedTotalUsd.toFixed(2) : ""}
              readOnly
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel>Notas</FormLabel>
          <FormControl>
            <Textarea rows={2} placeholder="Observaciones opcionales..." {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
}
