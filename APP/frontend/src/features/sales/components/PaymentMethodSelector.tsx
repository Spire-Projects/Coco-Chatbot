import React from 'react';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { QrCode, DollarSign, CreditCard, Banknote } from 'lucide-react';
import type { PaymentMethod } from '@/shared/types/modelTypes/Sale';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const PAYMENT_METHODS = [
  { id: 'cash_bob' as const, label: 'Efectivo Bs', icon: Banknote },
  { id: 'cash_usd' as const, label: 'Efectivo USD', icon: DollarSign },
  { id: 'qr' as const, label: 'QR / Transfer.', icon: QrCode },
  { id: 'card' as const, label: 'Tarjeta', icon: CreditCard },
];

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onPaymentMethodChange,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Método de Pago
      </Label>
      <Select
        value={selectedMethod}
        onValueChange={onPaymentMethodChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <SelectItem key={method.id} value={method.id}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{method.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PaymentMethodSelector;
