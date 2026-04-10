import { memo, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Download} from 'lucide-react';

interface QuotationPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  onDownload: () => void;
  isGenerating?: boolean;
}

const QuotationPreviewModalComponent = ({
  open,
  onClose,
  pdfUrl,
  onDownload,
  isGenerating = false,
}: QuotationPreviewModalProps) => {
  const [iframeKey, setIframeKey] = useState(0);

  // Recargar iframe cuando cambia el PDF
  useEffect(() => {
    if (pdfUrl) {
      setIframeKey((prev) => prev + 1);
    }
  }, [pdfUrl]);

  // Limpiar URL cuando se cierra el modal
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] min-w-[60vw]! h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl">Vista Previa de Cotización</DialogTitle>
         
        </DialogHeader>

        {/* Contenedor del PDF */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-4">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generando cotización...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              key={iframeKey}
              src={pdfUrl}
              className="w-full h-full border-0 rounded-lg shadow-lg bg-white"
              title="Vista previa de cotización"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No se pudo cargar la vista previa</p>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <DialogFooter className="p-4 border-t bg-white">
          <div className="flex gap-3 w-full justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={onDownload}
              disabled={isGenerating || !pdfUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const QuotationPreviewModal = memo(QuotationPreviewModalComponent);
