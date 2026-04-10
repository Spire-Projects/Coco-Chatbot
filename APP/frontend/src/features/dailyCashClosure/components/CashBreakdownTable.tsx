import { Input } from '@/shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatCurrency } from '../utils/calculations';

interface CashBreakdownTableProps {
  denominations: { label: string; value: number }[];
  quantities: string[];
  onQuantityChange: (index: number, value: string) => void;
  currency: 'bs' | 'arg';
}

export const CashBreakdownTable = ({
  denominations,
  quantities,
  onQuantityChange,
  currency,
}: CashBreakdownTableProps) => {
  return (
    <div>
      <h3 className="font-medium mb-2">Detalle de Efectivo {currency === 'bs' ? 'BS' : 'ARS'}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Denominación</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {denominations.map((item, i) => (
            <TableRow key={item.label}>
              <TableCell>{item.label}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={quantities[i]}
                  onChange={(e) => onQuantityChange(i, e.target.value)}
                  min="0"
                />
              </TableCell>
              <TableCell>
                {formatCurrency((Number(quantities[i]) || 0) * item.value, currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
