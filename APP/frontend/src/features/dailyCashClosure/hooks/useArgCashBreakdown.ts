import { useState, useCallback } from 'react';

const argentineDenominations = [
  // Monedas
  { label: '¢0.01', value: 0.01 },
  { label: '¢0.05', value: 0.05 },
  { label: '¢0.10', value: 0.10 },
  { label: '¢0.25', value: 0.25 },
  { label: '¢0.50', value: 0.50 },
  { label: '$1', value: 1 },
  { label: '$2', value: 2 },
  { label: '$2', value: 2 },
  { label: '$5', value: 5 },
  { label: '$10', value: 10 },
  // Billetes
  { label: '$2', value: 2 },
  { label: '$5', value: 5 },
  { label: '$10', value: 10 },
  { label: '$20', value: 20 },
  { label: '$50', value: 50 },
  { label: '$100', value: 100 },
  { label: '$200', value: 200 },
  { label: '$500', value: 500 },
  { label: '$1000', value: 1000 },
];

export function useArgCashBreakdown() {
  const [quantities, setQuantities] = useState<string[]>(
    argentineDenominations.map(() => '0')
  );

  const updateQuantity = useCallback((index: number, value: string) => {
    setQuantities((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const calculateTotal = useCallback(() => {
    return quantities.reduce((sum, q, i) => {
      const qty = Number(q) || 0;
      return sum + qty * argentineDenominations[i].value;
    }, 0);
  }, [quantities]);

  const reset = useCallback(() => {
    setQuantities(argentineDenominations.map(() => '0'));
  }, []);

  return {
    quantities,
    updateQuantity,
    calculateTotal,
    reset,
    denominations: argentineDenominations,
  };
}
