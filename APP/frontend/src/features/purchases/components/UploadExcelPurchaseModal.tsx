import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Trash2, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Progress } from '@/shared/components/ui/progress';
import { parseExcelFile } from '../utils/parseExcelPurchases';
import { purchaseImporterService } from '../services/PurchaseImporterService';
import { PurchaseTemplateService } from '../services/PurchaseTemplateService';
import type { ParsedPurchaseRow } from '../types/ParsedPurchaseRow';

/**
 * Formatea un número al formato boliviano (punto para miles, coma para decimales)
 */
function formatBolivianNumber(value: number | null): string {
  if (value === null) return '-';
  
  // Formatear con 2 decimales
  const formatted = value.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatted;
}

interface UploadExcelPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  createdBy: string;
}

export const UploadExcelPurchaseModal = ({
  isOpen,
  onClose,
  onSuccess,
  createdBy,
}: UploadExcelPurchaseModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPurchaseRow[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Configurar dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsingFile(true);
    setParsedRows([]);
    setParseErrors([]);

    try {
      const result = await parseExcelFile(selectedFile);
      
      if (result.validRows.length === 0) {
        toast.error('No se encontraron filas válidas en el archivo');
        setParseErrors([
          'No se encontraron filas válidas',
          ...result.errors,
        ]);
      } else {
        setParsedRows(result.validRows);
        toast.success(`Se encontraron ${result.validRows.length} filas válidas`);
        
        if (result.errors.length > 0) {
          setParseErrors(result.errors);
        }
      }
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast.error('Error al leer el archivo Excel');
      setParseErrors([
        error instanceof Error ? error.message : 'Error desconocido al parsear el archivo',
      ]);
    } finally {
      setIsParsingFile(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Eliminar una fila del preview
  const handleRemoveRow = (tempId: string) => {
    setParsedRows((prev) => prev.filter((row) => row.tempId !== tempId));
    toast.info('Fila eliminada de la importación');
  };

  // Resetear el modal
  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setImportProgress(0);
  };

  // Cerrar el modal
  const handleClose = () => {
    if (isImporting) {
      toast.error('Espera a que termine la importación');
      return;
    }
    handleReset();
    onClose();
  };

  // Descargar plantilla de Excel
  const handleDownloadTemplate = async () => {
    try {
      await PurchaseTemplateService.generateTemplate();
      toast.success('Plantilla descargada exitosamente');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Error al generar la plantilla');
    }
  };

  // Confirmar importación
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('No hay filas para importar');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const result = await purchaseImporterService.importRows(
        parsedRows,
        createdBy,
        (current, total) => {
          const progress = Math.round((current / total) * 100);
          setImportProgress(progress);
        }
      );

      if (result.failedImports > 0) {
        toast.warning(
          `Se importaron ${result.successfulImports} de ${result.totalRows} filas. ${result.failedImports} fallaron.`
        );
      } else {
        toast.success(`Se importaron exitosamente ${result.successfulImports} compras`);
      }

      onSuccess();
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error importing purchases:', error);
      toast.error('Error al importar las compras');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className=" min-w-[80vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar Compras desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx o .xls) con las compras. Solo se procesará la primera hoja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botón para descargar plantilla */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isImporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar Plantilla
            </Button>
          </div>

          {/* Dropzone Area */}
          {!file && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Suelta el archivo aquí...</p>
              ) : (
                <>
                  <p className="text-gray-700 font-medium mb-2">
                    Arrastra un archivo Excel aquí, o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-gray-500">
                    Formatos soportados: .xlsx, .xls
                  </p>
                </>
              )}
            </div>
          )}

          {/* File Info */}
          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isParsingFile || isImporting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Parsing Loader */}
          {isParsingFile && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Procesando archivo...</span>
            </div>
          )}

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Se encontraron algunos problemas:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {parseErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && !isParsingFile && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  <CheckCircle2 className="inline h-4 w-4 text-green-600 mr-1" />
                  {parsedRows.length} filas válidas encontradas
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-125 overflow-x-auto overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-xs">Fila</TableHead>
                        <TableHead className="w-24 text-xs">Fecha</TableHead>
                        <TableHead className="w-32 text-xs">Proveedor</TableHead>
                        <TableHead className="w-28 text-xs">N° Comprobante</TableHead>
                        <TableHead className="min-w-37.5 text-xs">Producto</TableHead>
                        <TableHead className="w-24 text-xs">Código</TableHead>
                        <TableHead className="w-28 text-xs">Categoría</TableHead>
                        <TableHead className="w-20 text-right text-xs">Cantidad</TableHead>
                        <TableHead className="w-24 text-right text-xs">P.U. (Bs)</TableHead>
                        <TableHead className="w-24 text-right text-xs">Total (Bs)</TableHead>
                        <TableHead className="w-24 text-right text-xs">P.V. (Bs)</TableHead>
                        <TableHead className="w-20 text-right text-xs">IMEIs</TableHead>
                        <TableHead className="min-w-30 text-xs">Notas</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row) => {
                        const calculatedTotal = row.precioTotal || 
                          (row.cantidadComprada && row.precioUnitario 
                            ? row.cantidadComprada * row.precioUnitario 
                            : null);

                        return (
                          <TableRow key={row.tempId}>
                            <TableCell className="font-mono text-xs text-gray-500">
                              {row.rowNumber}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {row.fechaCompra || 'Hoy'}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {row.proveedor || '-'}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {row.numeroComprobante || 'Auto'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.producto || '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-xs">
                              {row.codigo}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {row.categoria || '-'}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatBolivianNumber(row.cantidadComprada)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatBolivianNumber(row.precioUnitario)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs">
                              {formatBolivianNumber(calculatedTotal)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatBolivianNumber(row.precioVenta?? 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              {row.imeis?.length || 0}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 max-w-30 truncate" title={row.notas || ''}>
                              {row.notas || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRow(row.tempId)}
                                disabled={isImporting}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Importando compras...</span>
                <span className="font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isImporting || isParsingFile}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${parsedRows.length} ${parsedRows.length === 1 ? 'compra' : 'compras'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
