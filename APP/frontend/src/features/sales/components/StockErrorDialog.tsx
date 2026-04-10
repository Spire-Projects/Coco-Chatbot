import { memo } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';

interface StockErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  failedItems: Array<{
    batchId: string;
    medicationId: string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
}

const StockErrorDialog = memo(({
  isOpen,
  onClose,
  failedItems
}: StockErrorDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Stock Insuficiente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Los siguientes productos no tienen stock suficiente para completar la venta:
          </p>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {failedItems.map((item, index) => (
              <div key={`${item.batchId}-${index}`} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 text-red-500 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-sm text-gray-900">
                      {item.medicationId}
                    </div>
                    <div className="text-xs text-gray-600">
                      Lote: {item.batchId}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-red-600">
                        Solicitado: <span className="font-medium">{item.requestedQuantity}</span>
                      </span>
                      <span className="text-orange-600">
                        Disponible: <span className="font-medium">{item.availableQuantity}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Sugerencia:</strong> Ajusta las cantidades de los productos o 
              verifica si hay otros lotes disponibles para estos medicamentos.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

StockErrorDialog.displayName = 'StockErrorDialog';

export default StockErrorDialog;
