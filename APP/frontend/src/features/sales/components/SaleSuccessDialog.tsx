import { memo, useEffect, useState } from 'react';
import { CheckCircle, Receipt, Printer, User, Calendar } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { formatDateTime } from '@/shared/utils/date.utils';
import type { SaleView } from '@/shared/types/modelTypes/Sale';
import type { Client } from '@/shared/types/Client';
import { clientService } from '@/shared/services';
import { formatCurrency, getPaymentMethodBadge } from '../utils/SaleUtils';


interface SaleSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  sale: SaleView | null;
  onPrintReceipt?: () => void;
}


const SaleSuccessDialog = memo(({
  open,
  onClose,
  sale,
  onPrintReceipt
}: SaleSuccessDialogProps) => {
  const [client, setClient] = useState<Client | null>(null);
  useEffect(() => {
    if (sale && sale.clientId) {
      clientService.findById(sale.clientId).then(setClient).catch(() => setClient(null));
    } else {
      setClient(null);
    }
  }, [sale?.clientId]);

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Venta Completada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-900 mb-1">
              ¡Venta realizada exitosamente!
            </h3>
            <p className="text-sm text-green-700">
              El stock ha sido actualizado automáticamente
            </p>
          </div>

          {/* Detalles de la venta */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Receipt className="h-4 w-4 text-gray-500" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Número de venta</div>
                <div className="font-mono text-sm">{sale.numberInvoice}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Fecha y hora</div>
                <div className="text-sm">{formatDateTime(sale.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-4 w-4 text-gray-500" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">Cliente</div>
                <div className="text-sm">{client?.name || 'Cliente general'}</div>
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Total pagado:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-600">
                    {sale.paymentCurrency === 'usd'
                      ? `$ ${Number(sale.totalUsd ?? 0).toFixed(2)}`
                      : `Bs ${Number(sale.totalBob ?? 0).toFixed(2)}`}
                  </span>
                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                    {sale.paymentCurrency === 'usd' ? 'USD' : 'BOB'}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-green-700 mt-1">
                {sale.items.length} item(s) • Método: {getPaymentMethodBadge(sale.paymentMethod).label}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>Los datos de la venta han sido guardados correctamente.</p>
            <p>El inventario se ha actualizado automáticamente.</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onPrintReceipt && (
            <Button
              variant="outline"
              onClick={onPrintReceipt}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Recibo
            </Button>
          )}
          <Button onClick={onClose} className="flex-1 sm:flex-none">
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

SaleSuccessDialog.displayName = 'SaleSuccessDialog';

export default SaleSuccessDialog;
