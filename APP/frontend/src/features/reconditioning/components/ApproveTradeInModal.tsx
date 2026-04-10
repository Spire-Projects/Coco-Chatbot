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
import { Badge } from '@/shared/components/ui/badge';
import { CheckCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { tradeInService } from '@/shared/services/TradeInService';
import type { TradeInDevice, ApproveTradeInDeviceData } from '@/shared/types/modelTypes/TradeInDevice';

interface Props {
  open: boolean;
  onClose: () => void;
  item: TradeInDevice | null;
  userId: string;
}

const ApproveTradeInModal = memo(({ open, onClose, item, userId }: Props) => {
  const queryClient = useQueryClient();

  const [salePriceUsd, setSalePriceUsd] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (item) {
      setSalePriceUsd(item.salePriceUsd?.toFixed(2) ?? '');
      setAdminNotes(item.adminNotes ?? '');
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (data: ApproveTradeInDeviceData) =>
      tradeInService.approveDevice(item!.id, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconditioning'] });
      toast.success(`${item?.variantDisplay} aprobado para venta`);
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al aprobar');
    },
  });

  if (!item) return null;

  const priceNum = parseFloat(salePriceUsd);
  const isValid  = !isNaN(priceNum) && priceNum > 0;

  const margin =
    isValid && item.totalCostUsd > 0
      ? (((priceNum - item.totalCostUsd) / item.totalCostUsd) * 100).toFixed(1)
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Ingresa un precio de venta válido mayor a 0');
      return;
    }
    mutation.mutate({ salePriceUsd: priceNum, adminNotes: adminNotes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Aprobar para venta
              </DialogTitle>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{item.variantDisplay}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Resumen de costos */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
              Resumen de costos
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Costo adquisición</span>
                <span className="font-medium">
                  {item.purchasePriceUsd != null ? `$${item.purchasePriceUsd.toFixed(2)}` : '—'}
                </span>
              </div>
              {item.extraCostUsd != null && (
                <div className="flex justify-between text-gray-600">
                  <span>Costo extra (reparaciones)</span>
                  <span className="font-medium text-orange-600">
                    ${item.extraCostUsd.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t">
                <span>Costo total</span>
                <span>${item.totalCostUsd.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Precio de venta */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Precio de venta <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0.00"
                value={salePriceUsd}
                onChange={(e) => setSalePriceUsd(e.target.value)}
                className="pl-7 text-lg font-semibold"
                autoFocus
              />
            </div>

            {/* Margen estimado */}
            {isValid && margin !== null && (
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-gray-500">Margen estimado:</span>
                <Badge
                  className={`text-xs ${
                    parseFloat(margin) >= 15
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : parseFloat(margin) >= 0
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  } border`}
                >
                  {margin}%
                </Badge>
              </div>
            )}
          </div>

          {/* Notas opcionales */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notas de aprobación (opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Ej: Batería reemplazada, pantalla impecable..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-800">
              <strong>Al aprobar</strong>, el dispositivo cambiará a estado{' '}
              <strong>Listo para Venta</strong> y aparecerá disponible en el inventario para
              ser vendido normalmente.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || mutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {mutation.isPending ? 'Aprobando...' : 'Aprobar para venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

ApproveTradeInModal.displayName = 'ApproveTradeInModal';
export default ApproveTradeInModal;
