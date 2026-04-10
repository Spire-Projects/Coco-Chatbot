import { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Card, CardContent } from '@/shared/components/ui/card';
import { MoreVertical, Pencil, CheckCircle, Loader2 } from 'lucide-react';
import type { TradeInDevice } from '@/shared/types/modelTypes/TradeInDevice';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: TradeInDevice['status']) {
  switch (status) {
    case 'trade_in':
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
          En Recondicioamiento
        </Badge>
      );
    case 'available':
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100">
          Listo para Venta
        </Badge>
      );
    case 'sold':
      return (
        <Badge className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-100">
          Vendido
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function verificationBadge(v: TradeInDevice['verificationStatus']) {
  return v === 'verified' ? (
    <Badge className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-100">
      Verificado
    </Badge>
  ) : (
    <Badge variant="outline" className="text-gray-500">
      Pendiente
    </Badge>
  );
}

function conditionLabel(c: TradeInDevice['condition']) {
  const map: Record<TradeInDevice['condition'], string> = {
    new: 'Nuevo',
    pre_owned: 'Seminuevo',
    used: 'Usado',
  };
  return map[c] ?? c;
}

function fmt(n?: number | null, prefix = '$') {
  if (n == null) return '—';
  return `${prefix}${n.toFixed(2)}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  items: TradeInDevice[];
  loading: boolean;
  canApprove: boolean;
  onEdit: (item: TradeInDevice) => void;
  onApprove: (item: TradeInDevice) => void;
}

const TradeInTableDesktop = memo(
  ({ items, loading, canApprove, onEdit, onApprove }: Props) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-sm">No hay dispositivos en esta lista</p>
        </div>
      );
    }

    return (
      <Card className="overflow-hidden border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Dispositivo</TableHead>
                  <TableHead className="font-semibold text-gray-700">IMEI</TableHead>
                  <TableHead className="font-semibold text-gray-700">Estado</TableHead>
                  <TableHead className="font-semibold text-gray-700">Condición</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">Batería</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Costo Adq.</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Costo Extra</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Precio Venta</TableHead>
                  <TableHead className="font-semibold text-gray-700">Venta Origen</TableHead>
                  <TableHead className="font-semibold text-gray-700">Ingresado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50/70">
                    {/* Dispositivo */}
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium text-gray-900 text-sm leading-tight">
                          {item.variantDisplay}
                        </p>
                        {item.clientName && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {item.clientName}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* IMEI */}
                    <TableCell>
                      <code className="text-xs font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">
                        {item.imei ?? '—'}
                      </code>
                    </TableCell>

                    {/* Estado */}
                    <TableCell>{statusBadge(item.status)}</TableCell>

                    {/* Condición */}
                    <TableCell>
                      <span className="text-sm text-gray-700">
                        {conditionLabel(item.condition)}
                      </span>
                    </TableCell>

                    {/* Batería */}
                    <TableCell className="text-center">
                      {item.batteryPercentage != null ? (
                        <span
                          className={`text-sm font-medium ${
                            item.batteryPercentage >= 80
                              ? 'text-green-600'
                              : item.batteryPercentage >= 60
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {item.batteryPercentage}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Costo Adq. */}
                    <TableCell className="text-right font-medium text-sm text-gray-800">
                      {fmt(item.purchasePriceUsd)}
                    </TableCell>

                    {/* Costo Extra */}
                    <TableCell className="text-right font-medium text-sm">
                      {item.extraCostUsd != null ? (
                        <span className="text-orange-600">
                          {fmt(item.extraCostUsd)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>

                    {/* Precio Venta */}
                    <TableCell className="text-right font-medium text-sm">
                      {item.salePriceUsd != null ? (
                        <span className="text-green-700 font-semibold">
                          {fmt(item.salePriceUsd)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin precio</span>
                      )}
                    </TableCell>

                    {/* Venta Origen */}
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium text-gray-800">
                          {item.saleNumber ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500">{item.sellerName}</p>
                      </div>
                    </TableCell>

                    {/* Fecha ingreso */}
                    <TableCell>
                      <span className="text-xs text-gray-500">{fmtDate(item.createdAt)}</span>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Pencil className="h-4 w-4 mr-2 text-blue-500" />
                            Editar datos
                          </DropdownMenuItem>
                          {canApprove && item.status === 'trade_in' && (
                            <DropdownMenuItem onClick={() => onApprove(item)}>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Aprobar para venta
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  },
);

TradeInTableDesktop.displayName = 'TradeInTableDesktop';
export default TradeInTableDesktop;
