import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import type { DailyCashClosure } from '@/shared/types/DailyCashClosure';
import { formatCurrency } from '../utils/calculations';

interface ClosureHistoryTableProps {
  items: DailyCashClosure[];
  userNames: { [key: string]: string };
  loading: boolean;
}

export const ClosureHistoryTable = ({
  items,
  userNames,
  loading,
}: ClosureHistoryTableProps) => {
  if (loading) {
    return <p>Cargando...</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Cierre BS</TableHead>
         
          <TableHead>Notas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const totalBs = item.closingAmountBs.amountQr + item.closingAmountBs.amountCash;
         
          
          return (
            <TableRow key={item.id}>
              <TableCell>{item.date}</TableCell>
              <TableCell>{userNames[item.userId] || item.userId}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{formatCurrency(totalBs, 'bs')}</div>
                  <div className="text-xs text-gray-500">
                    QR: {formatCurrency(item.closingAmountBs.amountQr, 'bs')} | 
                    Efectivo: {formatCurrency(item.closingAmountBs.amountCash, 'bs')}
                  </div>
                </div>
              </TableCell>
             
              <TableCell className="max-w-xs truncate">{item.notes || '-'}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
