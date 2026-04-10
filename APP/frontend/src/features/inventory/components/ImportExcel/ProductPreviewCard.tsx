import { AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { ParsedProductRow } from '../../types/ParsedProductRow';

interface ProductPreviewCardProps {
  row: ParsedProductRow;
  onRemove: (tempId: string) => void;
  disabled?: boolean;
}

export const ProductPreviewCard = ({
  row,
  onRemove,
  disabled = false,
}: ProductPreviewCardProps) => {
  const hasErrors = row.validationErrors && row.validationErrors.length > 0;
  
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div
      className={`
        p-4 rounded-lg border 
        ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Fila {row.rowNumber}
          </span>
          {hasErrors ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(row.tempId)}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500">Código</p>
          <p className="font-mono text-sm font-medium">{row.codigo}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Nombre</p>
          <p className="text-sm font-medium">{row.nombre}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-500">Modelo</p>
            <p className="text-sm">{row.modelo || '-'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Categoría</p>
            <p className="text-sm">{row.categoria || '-'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Precio</p>
            <p className="text-sm font-medium text-right">
              {formatNumber(row.precio)}
            </p>
          </div>
        </div>

        {(row.ram || row.rom || row.color || row.bateria || row.pantalla || row.procesador || row.camara || row.sim) && (
          <div>
            <p className="text-xs text-gray-500">Especificaciones</p>
            <p className="text-xs text-gray-600 line-clamp-2">
              {[
                row.ram ? `RAM: ${row.ram}` : null,
                row.rom ? `ROM: ${row.rom}` : null,
                row.color ? `Color: ${row.color}` : null,
                row.bateria ? `Bateria: ${row.bateria}` : null,
                row.pantalla ? `Pantalla: ${row.pantalla}` : null,
                row.procesador ? `Procesador: ${row.procesador}` : null,
                row.camara ? `Camara: ${row.camara}` : null,
                row.sim ? `SIM: ${row.sim}` : null,
              ].filter(Boolean).join(' • ')}
            </p>
          </div>
        )}

        {row.descripcion && (
          <div>
            <p className="text-xs text-gray-500">Descripción</p>
            <p className="text-xs text-gray-600 line-clamp-2">
              {row.descripcion}
            </p>
          </div>
        )}

        {hasErrors && (
          <div className="mt-2 pt-2 border-t border-red-200">
            <p className="text-xs text-red-600 font-medium">Errores:</p>
            <ul className="text-xs text-red-600 list-disc list-inside mt-1">
              {row.validationErrors?.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
