// @ts-nocheck
import { memo, useCallback } from 'react';
import { X, Edit2, Copy, Check, Printer } from 'lucide-react';
import { useState } from 'react';
import type { ProductView } from '@/shared/types/modelTypes/Product';
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

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductView | null;
  onEdit?: (product: ProductView) => void;
}

const ProductDetailsModalComponent = ({
  isOpen,
  onClose,
  product,
  onEdit,
}: ProductDetailsModalProps) => {
  const [copiedImei, setCopiedImei] = useState<string | null>(null);
  const [isPrintingQr, setIsPrintingQr] = useState(false);

  const handleCopyImei = useCallback((imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiedImei(imei);
    setTimeout(() => setCopiedImei(null), 2000);
  }, []);

  const handlePrintQr = useCallback(async () => {
    if (!product?.qrCode || isPrintingQr) return;

    setIsPrintingQr(true);
    try {
      await QrPrintPdfService.printQrSheet({
        qrValue: product.qrCode,
        label: product.qrCode,
        title: product.name,
        fileName: QrPrintPdfService.generateFileName(product.name || product.qrCode),
      });
    } catch (error) {
      console.error('Error printing product QR:', error);
      toast.error('No se pudo generar la hoja PDF del QR');
    } finally {
      setIsPrintingQr(false);
    }
  }, [isPrintingQr, product]);

  if (!product) return null;

  const stockBadgeVariant = !product.stock || product.stock === 0 ? 'destructive' : 'default';
  const stockLabel = !product.stock || product.stock === 0 ? 'Sin stock' : `${product.stock} unidades`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {product.name}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Código: {product.code}</p>
            </div>
            <DialogClose className="h-8 w-8 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal */}
          <Card className="p-4 bg-linear-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Precio
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {product.price !== undefined && product.price !== null
                    ? `Bs. ${product.price.toFixed(2)}`
                    : 'No definido'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Stock
                </p>
                <div className="mt-1">
                  <Badge variant={stockBadgeVariant} className="text-sm font-semibold">
                    {stockLabel}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Categoría
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {product.categoryName || 'Sin categoría'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Modelo
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {product.modelName || 'Sin modelo'}
                </p>
              </div>
            </div>
          </Card>

          {/* Descripción */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                Descripción
              </h3>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                {product.description}
              </p>
            </div>
          )}

          {/* Especificaciones Técnicas */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Especificaciones Técnicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IMEIs Disponibles */}
          {product.imeis && product.imeis.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                IMEIs Disponibles ({product.imeis.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {product.imeis.map((imei, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <code className="text-sm font-mono text-gray-900 break-all">
                      {imei}
                    </code>
                    <button
                      onClick={() => handleCopyImei(imei)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                      title="Copiar IMEI"
                    >
                      {copiedImei === imei ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin IMEIs */}
          {(!product.imeis || product.imeis.length === 0) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Este producto no tiene IMEIs registrados.
              </p>
            </div>
          )}

          {/* Código QR */}
          {product.qrCode ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Código QR
              </h3>
              <div className="space-y-3">
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <QrCodeDisplay value={product.qrCode} label={product.qrCode} size={160} />
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
              <p className="text-sm text-yellow-800">
                Esta variante no tiene código QR asignado.
              </p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onEdit && (
              <Button
                onClick={() => {
                  onEdit(product);
                  onClose();
                }}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar Producto
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

ProductDetailsModalComponent.displayName = 'ProductDetailsModal';

export const ProductDetailsModal = memo(ProductDetailsModalComponent);
