import React from 'react';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Banknote, Info } from 'lucide-react';
import { useExchangeRateStore } from '@/shared/store/exchangeRateStore';

interface CurrencySelectorProps {
  selectedCurrency: 'bs' | 'arg';
  onCurrencyChange: (currency: 'bs' | 'arg') => void;
  disabled?: boolean;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrency,
  onCurrencyChange,
  disabled = false
}) => {
  const exchangeRate = useExchangeRateStore((s) => s.currentRate);

  const currencies = [
    { 
      id: 'bs' as const, 
      label: 'Bolivianos (Bs)', 
      symbol: 'Bs',
      flag: '🇧🇴'
    },
    { 
      id: 'arg' as const, 
      label: 'Dólares (USD)', 
      symbol: 'USD',
      flag: '🇺🇸'
    }
  ];

  const getCurrentCurrency = (currencyId: string) => {
    return currencies.find(c => c.id === currencyId) || currencies[0];
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Moneda de Pago
      </Label>
      <Select 
        value={selectedCurrency} 
        onValueChange={onCurrencyChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              <span>{getCurrentCurrency(selectedCurrency).flag}</span>
              <span>{getCurrentCurrency(selectedCurrency).label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency.id} value={currency.id}>
              <div className="flex items-center gap-2">
                <span>{currency.flag}</span>
                <span>{currency.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Información de tipo de cambio */}
      {selectedCurrency === 'arg' && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium text-blue-900">
              Tipo de Cambio
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white text-xs">
                1 USD = {exchangeRate.toFixed(2)} Bs
              </Badge>
            </div>
            <p className="text-xs text-blue-700">
              Los precios se mostrarán en dólares según el tipo de cambio actual.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
