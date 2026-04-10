import { useState, useCallback } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

import type { ParsedProductRow } from '../types/ParsedProductRow';
import { parseExcelFile } from '../utils/parseExcelProducts';
import { productImporterService } from '../services/ProductImporterService';
import ProductTemplateService from '../services/ProductTemplateService';
import { FileDropzone } from './ImportExcel/FileDropzone';
import { SelectedFileDisplay } from './ImportExcel/SelectedFileDisplay';
import { ProductsPreviewTable } from './ImportExcel/ProductsPreviewTable';
import { ImportProgress } from './ImportExcel/ImportProgress';
import { ErrorsAlert } from './ImportExcel/ErrorsAlert';

interface UploadExcelProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  createdBy: string;
}

export const UploadExcelProductModal = ({
  isOpen,
  onClose,
  onSuccess,
  createdBy,
}: UploadExcelProductModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  // Handler para cuando se acepta un archivo
  const handleFileAccepted = useCallback(async (file: File) => {
    setSelectedFile(file);
    setErrors([]);
    setParsedRows([]);
    setParsingLoading(true);

    try {
      const result = await parseExcelFile(file);

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      if (result.validRows.length === 0) {
        toast.error('No se encontraron filas válidas en el archivo');
      } else {
        setParsedRows(result.validRows);
        toast.success(
          `Se encontraron ${result.validRows.length} productos en el archivo`
        );
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Error al procesar el archivo');
      setErrors([
        error instanceof Error ? error.message : 'Error desconocido',
      ]);
    } finally {
      setParsingLoading(false);
    }
  }, []);

  // Handler para eliminar una fila de la preview
  const handleRemoveRow = (tempId: string) => {
    setParsedRows((prev) => prev.filter((row) => row.tempId !== tempId));
  };

  // Handler para resetear el modal
  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setErrors([]);
    setImportProgress(0);
  };

  // Handler para cerrar el modal
  const handleClose = () => {
    if (importLoading) {
      toast.error('No se puede cerrar mientras se está importando');
      return;
    }
    handleReset();
    onClose();
  };

  // Handler para importar los productos
  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('No hay productos para importar');
      return;
    }

    // Filtrar filas con errores de validación
    const validRows = parsedRows.filter(
      (row) => !row.validationErrors || row.validationErrors.length === 0
    );

    if (validRows.length === 0) {
      toast.error('Todos los productos tienen errores de validación');
      return;
    }

    setImportLoading(true);
    setImportProgress(0);

    try {
      const result = await productImporterService.importRows(
        validRows,
        createdBy,
        (current, total) => {
          const progress = Math.round((current / total) * 100);
          setImportProgress(progress);
        }
      );

      // Mostrar resultados
      if (result.successfulImports > 0) {
        toast.success(
          `${result.successfulImports} producto(s) importado(s) exitosamente`
        );
      }

      if (result.failedImports > 0) {
        toast.error(
          `${result.failedImports} producto(s) fallaron al importar`
        );

        // Mostrar errores específicos
        const failedResults = result.results.filter((r) => !r.success);
        const errorMessages = failedResults.map(
          (r) => `Fila ${r.row.rowNumber}: ${r.error}`
        );
        setErrors(errorMessages);
      } else {
        // Si todos se importaron exitosamente, cerrar modal y notificar éxito
        handleReset();
        onSuccess();
      }
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error('Error al importar productos');
      setErrors([
        error instanceof Error ? error.message : 'Error desconocido',
      ]);
    } finally {
      setImportLoading(false);
      setImportProgress(0);
    }
  };

  // Handler para descargar plantilla
  const handleDownloadTemplate = async () => {
    try {
      await ProductTemplateService.downloadTemplate();
      toast.success('Plantilla descargada exitosamente');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Error al descargar la plantilla');
    }
  };

  // Contar errores
  const errorCount = parsedRows.filter(
    (row) => row.validationErrors && row.validationErrors.length > 0
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-[95vw] md:w-[92vw] lg:w-[90vw] xl:w-[88vw] min-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Productos desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con los datos de los productos para
            importarlos masivamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botón de descargar plantilla */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={importLoading || parsingLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
          </div>

          {/* Dropzone */}
          {!selectedFile && (
            <FileDropzone
              onFileAccepted={handleFileAccepted}
              disabled={importLoading || parsingLoading}
            />
          )}

          {/* Archivo seleccionado */}
          {selectedFile && (
            <SelectedFileDisplay
              file={selectedFile}
              onRemove={handleReset}
              disabled={importLoading || parsingLoading}
            />
          )}

          {/* Loading de parseo */}
          {parsingLoading && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-gray-600">Procesando archivo...</p>
            </div>
          )}

          {/* Tabla de preview de productos */}
          <ProductsPreviewTable
            rows={parsedRows}
            onRemoveRow={handleRemoveRow}
            disabled={importLoading}
            errorCount={errorCount}
          />

          {/* Errores */}
          <ErrorsAlert errors={errors} />

          {/* Barra de progreso durante importación */}
          {importLoading && <ImportProgress progress={importProgress} />}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={importLoading}
          >
            {parsedRows.length > 0 && !importLoading ? 'Cancelar' : 'Cerrar'}
          </Button>
          {parsedRows.length > 0 && (
            <Button onClick={handleImport} disabled={importLoading}>
              {importLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {parsedRows.length} Producto(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
