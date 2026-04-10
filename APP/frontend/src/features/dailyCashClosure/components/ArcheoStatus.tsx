import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface ArcheoStatusProps {
  totalSales: number;
  totalClosure: number;
  difference: number;
  isCorrect: boolean;
  isEvaluating: boolean;
  hasEdited: boolean;
  currency: 'bs' | 'arg';
}

export const ArcheoStatus = ({
  totalSales,
  totalClosure,
  difference,
  isCorrect,
  isEvaluating,
  hasEdited,
  currency,
}: ArcheoStatusProps) => {
  const getStatusColor = () => {
    if (!hasEdited || isEvaluating) return 'amber';
    return isCorrect ? 'green' : 'red';
  };

  const color = getStatusColor();

  return (
    <div className={`p-4 rounded-lg border-2 bg-${color}-50 border-${color}-200`}>
      <div className="flex items-center gap-3">
        {(!hasEdited || isEvaluating) ? (
          <AlertTriangle className={`h-6 w-6 text-${color}-500`} />
        ) : isCorrect ? (
          <CheckCircle className={`h-6 w-6 text-${color}-600`} />
        ) : (
          <XCircle className={`h-6 w-6 text-${color}-600`} />
        )}
        <div>
          <h3 className={`font-semibold text-${color}-800`}>
            {(!hasEdited || isEvaluating)
              ? 'En revisión...'
              : isCorrect
              ? 'Arqueo Correcto'
              : 'Arqueo Incorrecto'}
          </h3>
          <p className={`text-sm text-${color}-600`}>
            Ventas del día: {formatCurrency(totalSales, currency)} | 
            Total arqueo: {formatCurrency(totalClosure, currency)} | 
            Diferencia: {formatCurrency(difference, currency)}
          </p>
        </div>
      </div>
    </div>
  );
};
