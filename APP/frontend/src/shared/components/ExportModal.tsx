import { useState, useCallback, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Separator } from '@/shared/components/ui/separator';
import { Download, Loader2 } from 'lucide-react';
import type { 
  ExportConfig, 
  ExportFieldConfig, 
  ExportDateRange 
} from '@/shared/types/ExportTypes';

interface ExportModalProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: ExportFieldConfig<T>[];
  onExport: (config: ExportConfig<T>) => Promise<void>;
  isExporting?: boolean;
}

export function ExportModal<T>({
  open,
  onOpenChange,
  title,
  fields: initialFields,
  onExport,
  isExporting = false
}: ExportModalProps<T>) {
  // Estado local
  const [reportTitle, setReportTitle] = useState(title);
  const [fields, setFields] = useState<ExportFieldConfig<T>[]>(initialFields);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  // Fechas - por defecto del primer día del mes actual hasta el último día a las 23:59
  const defaultDateRange = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return {
      from: firstDay,
      to: lastDay
    };
  }, []);

  const [dateRange, setDateRange] = useState<ExportDateRange>(defaultDateRange);

  // Formatear fecha para input date
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Formatear fecha para mostrar
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Manejo de campos
  const handleFieldToggle = useCallback((fieldKey: string, checked: boolean) => {
    setFields(prev => prev.map(field => 
      field.key === fieldKey 
        ? { ...field, selected: checked }
        : field
    ));
  }, []);

  const toggleAllFields = useCallback((checked: boolean) => {
    setFields(prev => prev.map(field => ({ ...field, selected: checked })));
  }, []);

  // Validación
  const selectedFieldsCount = useMemo(() => 
    fields.filter(field => field.selected).length, 
    [fields]
  );

  const canExport = useMemo(() => 
    selectedFieldsCount > 0 && dateRange.from && dateRange.to,
    [selectedFieldsCount, dateRange]
  );

  // Manejo de exportación
  const handleExport = useCallback(async () => {
    if (!canExport) return;

    const config: ExportConfig<T> = {
      title: reportTitle,
      fields,
      dateRange,
      includeMetadata
    };

    try {
      await onExport(config);
      onOpenChange(false);
    } catch (error) {
      console.error('Error durante exportación:', error);
    }
  }, [canExport, reportTitle, fields, dateRange, includeMetadata, onExport, onOpenChange]);

  // Reset cuando se abre el modal
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      setFields(initialFields);
      setReportTitle(title);
      setDateRange(defaultDateRange);
      setIncludeMetadata(true);
    }
    onOpenChange(open);
  }, [initialFields, title, defaultDateRange, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar a Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 py-4">
          {/* Título del reporte */}
          <div className="space-y-2">
            <Label htmlFor="reportTitle">Título del reporte</Label>
            <Input
              id="reportTitle"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Ingrese el título del reporte"
            />
          </div>

          {/* Rango de fechas */}
          <div className="space-y-3">
            <Label>Rango de fechas</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Fecha desde</Label>
                <Input
                  type="date"
                  value={formatDateForInput(dateRange.from)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setDateRange(prev => ({ ...prev, from: newDate }));
                  }}
                />
                <p className="text-xs text-gray-500">
                  {formatDateForDisplay(dateRange.from)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Fecha hasta</Label>
                <Input
                  type="date"
                  value={formatDateForInput(dateRange.to)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    newDate.setHours(23, 59, 59, 999);
                    setDateRange(prev => ({ ...prev, to: newDate }));
                  }}
                />
                <p className="text-xs text-gray-500">
                  {formatDateForDisplay(dateRange.to)} a las 23:59
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Selección de campos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Campos a incluir ({selectedFieldsCount} seleccionados)</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleAllFields(true)}
                >
                  Todos
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleAllFields(false)}
                >
                  Ninguno
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border rounded-md p-3">
              {fields.map((field) => (
                <div key={String(field.key)} className="flex items-center space-x-2">
                  <Checkbox
                    id={String(field.key)}
                    checked={field.selected}
                    onCheckedChange={(checked) => 
                      handleFieldToggle(String(field.key), checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={String(field.key)} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Opciones adicionales */}
          <div className="space-y-3">
            <Label>Opciones adicionales</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMetadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
              />
              <Label htmlFor="includeMetadata" className="text-sm cursor-pointer">
                Incluir hoja de información del reporte
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleExport}
            disabled={!canExport || isExporting}
            className="min-w-[120px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
