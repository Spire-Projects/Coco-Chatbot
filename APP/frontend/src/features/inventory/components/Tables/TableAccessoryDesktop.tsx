import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Pencil, Trash2, Package, QrCode } from 'lucide-react';
import type { AccessoryView } from '@/shared/types/modelTypes/Accessory';
import { memo, useState } from 'react';
import { AccessoryDetailsModal } from '../AccessoryDetailsModal';

interface Props {
  accessories: AccessoryView[];
  loading: boolean;
  searchQuery: string;
  onEdit: (a: AccessoryView) => void;
  onDelete: (a: AccessoryView) => void;
}

const getStockBadge = (stock: number, minAlert: number) => {
  if (stock === 0)
    return <Badge variant="destructive">Sin stock</Badge>;
  if (stock <= minAlert)
    return <Badge variant="outline" className="border-amber-500 text-amber-600">{stock} disp.</Badge>;
  return <Badge variant="outline" className="border-green-500 text-green-600">{stock} disp.</Badge>;
};

const TableAccessoryDesktop = memo(({ accessories, loading, searchQuery, onEdit, onDelete }: Props) => {
  const [selected, setSelected]     = useState<AccessoryView | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Accesorios</CardTitle>
          <CardDescription>Administra los accesorios de tu inventario</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Cargando accesorios...</span>
            </div>
          ) : accessories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay accesorios</p>
              <p className="text-sm">
                {searchQuery
                  ? 'No se encontraron accesorios con ese criterio'
                  : 'Comienza registrando tu primer accesorio'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Precio venta</TableHead>
                  <TableHead>Mayorista</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessories.map((acc) => (
                  <TableRow
                    key={acc.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => { setSelected(acc); setDetailsOpen(true); }}
                  >
                    <TableCell>
                      <p className="font-medium leading-tight">{acc.name}</p>
                      {acc.variantDescription && (
                        <p className="text-xs text-muted-foreground mt-0.5">{acc.variantDescription}</p>
                      )}
                    </TableCell>

                    <TableCell>
                      {acc.categoryName
                        ? <Badge variant="secondary">{acc.categoryName}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>

                    <TableCell>
                      {acc.brandName
                        ? <Badge variant="outline">{acc.brandName}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold text-green-600">
                        ${acc.salePriceUsd.toFixed(2)}
                      </span>
                    </TableCell>

                    <TableCell>
                      {acc.wholesalePriceUsd != null
                        ? <span className="text-muted-foreground text-sm">${acc.wholesalePriceUsd.toFixed(2)}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>

                    <TableCell>{getStockBadge(acc.stock, acc.stockMinAlert)}</TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setSelected(acc); setDetailsOpen(true); }}
                          title="Ver QR"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(acc)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => onDelete(acc)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AccessoryDetailsModal
        isOpen={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelected(null); }}
        accessory={selected}
        onEdit={onEdit}
      />
    </>
  );
});

TableAccessoryDesktop.displayName = 'TableAccessoryDesktop';

export default TableAccessoryDesktop;
