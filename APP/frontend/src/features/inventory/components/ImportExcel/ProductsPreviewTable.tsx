import { AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import type { ParsedProductRow } from '../../types/ParsedProductRow';
import { ProductPreviewCard } from './ProductPreviewCard';

interface ProductsPreviewTableProps {
  rows: ParsedProductRow[];
  onRemoveRow: (tempId: string) => void;
  disabled?: boolean;
  errorCount: number;
}

export const ProductsPreviewTable = ({
  rows,
  onRemoveRow,
  disabled = false,
  errorCount,
}: ProductsPreviewTableProps) => {
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">
          Productos encontrados ({rows.length})
        </h3>
        {errorCount > 0 && (
          <p className="text-xs text-amber-600">
            {errorCount} producto(s) con errores
          </p>
        )}
      </div>

      {/* Vista Tablet/Desktop - Tabla con scroll horizontal */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <div className="w-full overflow-x-auto">
          <div className="max-h-96 overflow-y-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Fila</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Specs</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const hasErrors =
                  row.validationErrors && row.validationErrors.length > 0;

                return (
                  <TableRow
                    key={row.tempId}
                    className={hasErrors ? 'bg-red-50' : ''}
                  >
                    <TableCell className="text-center text-xs text-gray-500">
                      {row.rowNumber}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.codigo}
                    </TableCell>
                    <TableCell className="text-sm">{row.nombre}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.modelo || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.categoria || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {row.descripcion
                        ? row.descripcion.substring(0, 50) +
                          (row.descripcion.length > 50 ? '...' : '')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatNumber(row.precio)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {[
                        row.ram ? `RAM: ${row.ram}` : null,
                        row.rom ? `ROM: ${row.rom}` : null,
                        row.color ? `Color: ${row.color}` : null,
                      ].filter(Boolean).join(' • ') || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasErrors ? (
                        <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveRow(row.tempId)}
                        disabled={disabled}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>

      {/* Vista Mobile - Cards */}
      <div className="md:hidden space-y-3 max-h-96 overflow-y-auto">
        {rows.map((row) => (
          <ProductPreviewCard
            key={row.tempId}
            row={row}
            onRemove={onRemoveRow}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
