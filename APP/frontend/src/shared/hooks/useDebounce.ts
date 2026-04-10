import { useEffect, useState } from 'react';

/**
 * Hook para aplicar debounce a un valor
 * @param value - Valor a aplicar debounce
 * @param delay - Tiempo de espera en milisegundos
 * @returns Valor con debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
