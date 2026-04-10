import { useState, useCallback } from 'react';
import { bolivianDenominations } from '@/shared/utils/dailyCash.utils';

export function useCashBreakdown() {
  const [quantities, setQuantities] = useState<string[]>(
    bolivianDenominations.map(() => '0')
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
      return sum + qty * bolivianDenominations[i].value;
    }, 0);
  }, [quantities]);

  const reset = useCallback(() => {
    setQuantities(bolivianDenominations.map(() => '0'));
  }, []);

  return {
    quantities,
    updateQuantity,
    calculateTotal,
    reset,
    denominations: bolivianDenominations,
  };
}
