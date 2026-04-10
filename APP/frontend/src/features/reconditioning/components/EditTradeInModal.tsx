import { memo, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { toast } from 'sonner';
import { tradeInService } from '@/shared/services/TradeInService';
import type { TradeInDevice, UpdateTradeInDeviceData } from '@/shared/types/modelTypes/TradeInDevice';

interface Props {
  open: boolean;
  onClose: () => void;
  item: TradeInDevice | null;
  userId: string;
}

const EditTradeInModal = memo(({ open, onClose, item, userId }: Props) => {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<UpdateTradeInDeviceData>({});

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setForm({
        batteryPercentage: item.batteryPercentage,
        batteryCycles:     item.batteryCycles,
        osVersion:         item.osVersion,
        technicalNotes:    item.technicalNotes,
        adminNotes:        item.adminNotes,
        extraCostUsd:      item.extraCostUsd,
        condition:         item.condition,
      });
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (data: UpdateTradeInDeviceData) =>
      tradeInService.updateDevice(item!.id, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconditioning'] });
      toast.success('Datos actualizados correctamente');
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    },
  });

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const set = <K extends keyof UpdateTradeInDeviceData>(
    key: K,
    value: UpdateTradeInDeviceData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Editar datos de recondicioamiento
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">{item.variantDisplay}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Condición */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Condición</Label>
            <Select
              value={form.condition ?? item.condition}
              onValueChange={(v) => set('condition', v as UpdateTradeInDeviceData['condition'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_owned">Seminuevo</SelectItem>
                <SelectItem value="used">Usado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Técnicos */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Datos técnicos
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Batería %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="85"
                  value={form.batteryPercentage ?? ''}
                  onChange={(e) =>
                    set('batteryPercentage', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Ciclos de batería</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="150"
                  value={form.batteryCycles ?? ''}
                  onChange={(e) =>
                    set('batteryCycles', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm">Versión OS</Label>
                <Input
                  placeholder="iOS 17.4"
                  value={form.osVersion ?? ''}
                  onChange={(e) => set('osVersion', e.target.value || undefined)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notas */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Notas
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Notas técnicas</Label>
                <Textarea
                  rows={2}
                  placeholder="Se cambió batería, LCD en buen estado..."
                  value={form.technicalNotes ?? ''}
                  onChange={(e) => set('technicalNotes', e.target.value || undefined)}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Notas de administración</Label>
                <Textarea
                  rows={2}
                  placeholder="Para registro interno..."
                  value={form.adminNotes ?? ''}
                  onChange={(e) => set('adminNotes', e.target.value || undefined)}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Costo */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Costos de reacondicioamiento
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div>
                <span className="text-xs text-gray-500">Costo adquisición</span>
                <p className="font-semibold">
                  {item.purchasePriceUsd != null ? `$${item.purchasePriceUsd.toFixed(2)}` : '—'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Costo extra (reparaciones)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={form.extraCostUsd ?? ''}
                    onChange={(e) =>
                      set('extraCostUsd', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="pl-6"
                  />
                </div>
              </div>
            </div>
            {(item.purchasePriceUsd != null || form.extraCostUsd != null) && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 flex justify-between">
                <span>Costo total estimado:</span>
                <span className="font-semibold">
                  ${(
                    (item.purchasePriceUsd ?? 0) + (form.extraCostUsd ?? item.extraCostUsd ?? 0)
                  ).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

EditTradeInModal.displayName = 'EditTradeInModal';
export default EditTradeInModal;
