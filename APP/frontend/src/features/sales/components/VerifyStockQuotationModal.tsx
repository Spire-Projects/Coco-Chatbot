import { memo } from 'react';
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
import { Badge } from '@/shared/components/ui/badge';
import { AlertCircle, AlertTriangle, DollarSign, Package } from 'lucide-react';
import type { StockIssue } from '../services/QuotationStockVerificationService';

interface VerifyStockQuotationModalProps {
  open: boolean;
  issues: StockIssue[];
  onContinueWithoutIssues: () => void;
  onCancel: () => void;
}

const VerifyStockQuotationModal = memo(
  ({
    open,
    issues,
    onContinueWithoutIssues,
    onCancel,
  }: VerifyStockQuotationModalProps) => {
    const getIssueInfo = (issue: StockIssue) => {
      switch (issue.issue) {
        case 'out_of_stock':
          return {
            label: 'Sin Stock',
            color: 'destructive' as const,
            icon: AlertCircle,
            description: 'Este producto ya no tiene stock disponible',
          };
        case 'insufficient_stock':
          return {
            label: 'Stock Insuficiente',
            color: 'secondary' as const,
            icon: AlertTriangle,
            description: `Solo hay ${issue.currentStock} unidades disponibles`,
          };
        case 'price_changed':
          return {
            label: 'Precio Modificado',
            color: 'secondary' as const,
            icon: DollarSign,
            description: 'El precio de este producto ha cambiado',
          };
        default:
          return {
            label: 'Problema',
            color: 'secondary' as const,
            icon: AlertCircle,
            description: 'Hay un problema con este producto',
          };
      }
    };

    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
        minimumFractionDigits: 2,
      }).format(price);
    };

    return (
      <Dialog open={open} onOpenChange={onCancel}>
        <DialogContent className="max-w-4xl min-w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              Verificación de Stock - Cotización
            </DialogTitle>
            <DialogDescription>
              Se encontraron los siguientes problemas con los productos de esta
              cotización. Puedes continuar sin los productos marcados o cancelar
              para revisar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Solicitado</TableHead>
                  <TableHead className="text-center">Disponible</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Stock Alternativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue, index) => {
                  const info = getIssueInfo(issue);
                  const Icon = info.icon;

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{issue.item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {issue.item.productCode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ref.: {issue.item.receiptNumber || 'Sin referencia'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {issue.requestedQuantity} unidades
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            issue.currentStock === 0
                              ? 'destructive'
                              : issue.currentStock < issue.requestedQuantity
                              ? 'secondary'
                              : 'secondary'
                          }
                        >
                          {issue.currentStock} unidades
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <Badge variant={info.color}>{info.label}</Badge>
                            <p className="text-sm text-muted-foreground">
                              {info.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {issue.alternativePurchaseBox ? (
                          <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                Stock disponible en otro lote
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                <strong>Stock:</strong>{' '}
                                {issue.alternativePurchaseBox.availableStock} unidades
                              </p>
                              <p>
                                <strong>Precio:</strong>{' '}
                                {formatPrice(
                                  issue.alternativePurchaseBox.unitPrice
                                )}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              Este lote alternativo es solo informativo. Se
                              eliminará el producto de la cotización.
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No hay stock alternativo disponible
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar y Revisar
            </Button>
            <Button onClick={onContinueWithoutIssues}>
              Continuar sin Productos Marcados ({issues.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

VerifyStockQuotationModal.displayName = 'VerifyStockQuotationModal';

export default VerifyStockQuotationModal;
