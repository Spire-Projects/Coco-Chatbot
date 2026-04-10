import { memo, useState } from 'react';
import { X, Edit2, Printer } from 'lucide-react';
import type { AccessoryView } from '@/shared/types/modelTypes/Accessory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { QrCodeDisplay } from '@/shared/components/QrCodeDisplay';
import { toast } from 'sonner';
import { QrPrintPdfService } from '../../../shared/services/QrPrintPdfService';

interface AccessoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessory: AccessoryView | null;
  onEdit?: (accessory: AccessoryView) => void;
}

const AccessoryDetailsModalComponent = ({
  isOpen,
  onClose,
  accessory,
  onEdit,
}: AccessoryDetailsModalProps) => {
  const [isPrintingQr, setIsPrintingQr] = useState(false);

  if (!accessory) return null;

  const handlePrintQr = async () => {
    if (!accessory.qrCode || isPrintingQr) return;

    setIsPrintingQr(true);
    try {
      await QrPrintPdfService.printQrSheet({
        qrValue: accessory.qrCode,
        label: accessory.qrCode,
        title: accessory.name,
        fileName: QrPrintPdfService.generateFileName(accessory.name || accessory.qrCode),
      });
    } catch (error) {
      console.error('Error printing accessory QR:', error);
      toast.error('No se pudo generar la hoja PDF del QR');
    } finally {
      setIsPrintingQr(false);
    }
  };

  const stockVariant =
    accessory.stock === 0
      ? 'destructive'
      : accessory.stock <= accessory.stockMinAlert
        ? 'outline'
        : 'default';
  const stockLabel =
    accessory.stock === 0
      ? 'Sin stock'
      : `${accessory.stock} unidades`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {accessory.name}
              </DialogTitle>
              {accessory.variantDescription && (
                <p className="text-sm text-gray-500 mt-1">{accessory.variantDescription}</p>
              )}
            </div>
            <DialogClose className="h-8 w-8 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información principal */}
          <Card className="p-4 bg-linear-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Precio</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  ${accessory.salePriceUsd.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock</p>
                <div className="mt-1">
                  <Badge variant={stockVariant} className="text-sm font-semibold">
                    {stockLabel}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Categoría</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {accessory.categoryName ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Marca</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {accessory.brandName ?? '—'}
                </p>
              </div>
            </div>
          </Card>

          {/* Precios */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Precios</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <span className="text-sm text-gray-600">Compra</span>
                <span className="text-sm font-semibold">${accessory.purchasePriceUsd.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <span className="text-sm text-gray-600">Venta</span>
                <span className="text-sm font-semibold text-green-600">${accessory.salePriceUsd.toFixed(2)}</span>
              </div>
              {accessory.wholesalePriceUsd != null && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm text-gray-600">Mayorista</span>
                  <span className="text-sm font-semibold">${accessory.wholesalePriceUsd.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <span className="text-sm text-gray-600">Alerta mín.</span>
                <span className="text-sm font-semibold">{accessory.stockMinAlert} uds.</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {accessory.qrCode ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Código QR
              </h3>
              <div className="space-y-3">
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <QrCodeDisplay value={accessory.qrCode} label={accessory.qrCode} size={160} />
                </div>
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrintQr}
                    disabled={isPrintingQr}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    {isPrintingQr ? 'Generando PDF...' : 'Imprimir QR'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">Este accesorio no tiene código QR asignado.</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            {onEdit && (
              <Button
                onClick={() => { onEdit(accessory); onClose(); }}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar Accesorio
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AccessoryDetailsModal = memo(AccessoryDetailsModalComponent);
