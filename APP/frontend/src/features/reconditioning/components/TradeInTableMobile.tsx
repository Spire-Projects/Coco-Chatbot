import { memo } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Pencil, CheckCircle, Loader2, Battery, Smartphone } from 'lucide-react';
import type { TradeInDevice } from '@/shared/types/modelTypes/TradeInDevice';

function statusBadge(status: TradeInDevice['status']) {
  switch (status) {
    case 'trade_in':
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100 text-xs">
          En Recondicioamiento
        </Badge>
      );
    case 'available':
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100 text-xs">
          Listo para Venta
        </Badge>
      );
    case 'sold':
      return (
        <Badge className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-100 text-xs">
          Vendido
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

function conditionLabel(c: TradeInDevice['condition']) {
  const map: Record<TradeInDevice['condition'], string> = {
    new: 'Nuevo',
    pre_owned: 'Seminuevo',
    used: 'Usado',
  };
  return map[c] ?? c;
}

function fmt(n?: number | null) {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

interface Props {
  items: TradeInDevice[];
  loading: boolean;
  canApprove: boolean;
  onEdit: (item: TradeInDevice) => void;
  onApprove: (item: TradeInDevice) => void;
}

const TradeInTableMobile = memo(({ items, loading, canApprove, onEdit, onApprove }: Props) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="text-sm">No hay dispositivos en esta lista</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Smartphone className="h-4 w-4 text-gray-400 shrink-0" />
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {item.variantDisplay}
                  </p>
                </div>
                {item.imei && (
                  <code className="text-xs font-mono text-gray-500 mt-0.5 block">
                    {item.imei}
                  </code>
                )}
              </div>
              <div className="shrink-0">{statusBadge(item.status)}</div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-gray-500">Condición: </span>
                <span className="font-medium text-gray-800">{conditionLabel(item.condition)}</span>
              </div>
              {item.batteryPercentage != null && (
                <div className="flex items-center gap-1">
                  <Battery className="h-3 w-3 text-gray-400" />
                  <span
                    className={`font-medium ${
                      item.batteryPercentage >= 80
                        ? 'text-green-600'
                        : item.batteryPercentage >= 60
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {item.batteryPercentage}%
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Costo adq.: </span>
                <span className="font-medium text-gray-800">{fmt(item.purchasePriceUsd)}</span>
              </div>
              {item.extraCostUsd != null && (
                <div>
                  <span className="text-gray-500">Costo extra: </span>
                  <span className="font-medium text-orange-600">{fmt(item.extraCostUsd)}</span>
                </div>
              )}
              {item.salePriceUsd != null && (
                <div>
                  <span className="text-gray-500">Precio venta: </span>
                  <span className="font-semibold text-green-700">{fmt(item.salePriceUsd)}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Venta: </span>
                <span className="font-medium text-gray-800">{item.saleNumber ?? '—'}</span>
              </div>
            </div>

            {/* Notes preview */}
            {(item.technicalNotes || item.adminNotes) && (
              <p className="text-xs text-gray-500 italic line-clamp-2">
                {item.adminNotes ?? item.technicalNotes}
              </p>
            )}

            {/* Client */}
            {item.clientName && (
              <p className="text-xs text-gray-500">Cliente: {item.clientName}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => onEdit(item)}
              >
                <Pencil className="h-3 w-3 mr-1.5" />
                Editar datos
              </Button>
              {canApprove && item.status === 'trade_in' && (
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onApprove(item)}
                >
                  <CheckCircle className="h-3 w-3 mr-1.5" />
                  Aprobar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

TradeInTableMobile.displayName = 'TradeInTableMobile';
export default TradeInTableMobile;
