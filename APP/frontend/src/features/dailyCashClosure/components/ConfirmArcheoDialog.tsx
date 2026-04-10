import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface ConfirmArcheoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  totalSales: number;
  totalClosure: number;
  difference: number;
  currency: 'bs' | 'arg';
}

export const ConfirmArcheoDialog = ({
  open,
  onOpenChange,
  onConfirm,
  totalSales,
  totalClosure,
  difference,
  currency,
}: ConfirmArcheoDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Arqueo Incorrecto
          </AlertDialogTitle>
          <AlertDialogDescription>
            El arqueo actual no coincide con las ventas del día. 
            Hay una diferencia de <strong>{formatCurrency(Math.abs(difference), currency)}</strong> 
            {difference > 0 ? ' de más' : ' de menos'}.
            
            <div className="mt-3 space-y-1">
              <p>• Total ventas del día: {formatCurrency(totalSales, currency)}</p>
              <p>• Total arqueo: {formatCurrency(totalClosure, currency)}</p>
              <p>• Diferencia: {formatCurrency(difference, currency)}</p>
            </div>
            
            ¿Desea guardar el arqueo de todas maneras?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Guardar de todas maneras
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
