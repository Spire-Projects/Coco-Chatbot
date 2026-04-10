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

const TableAccessoryMobile = memo(({ accessories, loading, searchQuery, onEdit, onDelete }: Props) => {
  const [selected, setSelected]       = useState<AccessoryView | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Cargando accesorios...</span>
          </div>
        ) : accessories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">No hay accesorios</p>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'No se encontraron accesorios' : 'Comienza registrando tu primer accesorio'}
              </p>
            </CardContent>
          </Card>
        ) : (
          accessories.map((acc) => (
            <Card key={acc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {acc.brandName && (
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                        {acc.brandName}
                      </p>
                    )}
                    <CardTitle className="text-base leading-tight">{acc.name}</CardTitle>
                    {acc.categoryName && (
                      <CardDescription className="mt-0.5">
                        <Badge variant="secondary" className="text-xs">{acc.categoryName}</Badge>
                      </CardDescription>
                    )}
                  </div>
                  {acc.stock === 0
                    ? <Badge variant="destructive">Sin stock</Badge>
                    : acc.stock <= acc.stockMinAlert
                      ? <Badge variant="outline" className="border-amber-500 text-amber-600 shrink-0">{acc.stock} disp.</Badge>
                      : <Badge variant="outline" className="border-green-500 text-green-600 shrink-0">{acc.stock} disp.</Badge>}
                </div>
              </CardHeader>

              <CardContent className="space-y-2 pt-0">
                {acc.variantDescription && (
                  <p className="text-xs text-muted-foreground">{acc.variantDescription}</p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Venta:</span>
                  <span className="font-semibold text-green-600">${acc.salePriceUsd.toFixed(2)}</span>
                </div>
                {acc.wholesalePriceUsd != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mayorista:</span>
                    <span className="text-muted-foreground">${acc.wholesalePriceUsd.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline" size="sm" className="flex-1"
                    onClick={() => { setSelected(acc); setDetailsOpen(true); }}
                  >
                    <QrCode className="h-4 w-4 mr-1" /> QR
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(acc)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => onDelete(acc)}
                    className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AccessoryDetailsModal
        isOpen={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelected(null); }}
        accessory={selected}
        onEdit={onEdit}
      />
    </>
  );
});

TableAccessoryMobile.displayName = 'TableAccessoryMobile';

export default TableAccessoryMobile;
