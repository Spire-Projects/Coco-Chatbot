import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Search, X, Package, Pill } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

interface MedicationBatchSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  disabled?: boolean;
  showSearchType?: boolean;
}

export const MedicationBatchSearch = memo<MedicationBatchSearchProps>(({
  value,
  onChange,
  placeholder = "Buscar por nombre de medicamento o ID de lote...",
  debounceMs = 300,
  disabled = false,
  showSearchType = true
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasFocused = useRef(false);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Preserve focus after re-renders
  useEffect(() => {
    if (wasFocused.current && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  });

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    // Maintain focus after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    wasFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    wasFocused.current = false;
  }, []);

  // Detectar el tipo de búsqueda basado en el contenido
  const getSearchType = () => {
    if (!localValue.trim()) return null;
    
    // Si contiene solo letras, números y guiones, podría ser un ID de lote
    const batchIdPattern = /^[A-Za-z0-9\-_]+$/;
    const isLikelyBatchId = batchIdPattern.test(localValue.trim()) && localValue.trim().length <= 20;
    
    // Si contiene espacios o caracteres especiales, es más probable que sea nombre
    const hasSpacesOrSpecialChars = /[\s\(\)\[\]\.\/]/.test(localValue);
    
    if (isLikelyBatchId && !hasSpacesOrSpecialChars) {
      return 'batch';
    } else {
      return 'medication';
    }
  };

  const searchType = getSearchType();

  return (
    <div className="w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className="pl-10 pr-10 h-12 text-base"
        />
        {localValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Search type indicator */}
      {showSearchType && searchType && localValue.trim() && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-gray-500">Buscando por:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            {searchType === 'batch' ? (
              <>
                <Package className="h-3 w-3" />
                ID de Lote
              </>
            ) : (
              <>
                <Pill className="h-3 w-3" />
                Nombre de Medicamento
              </>
            )}
          </Badge>
        </div>
      )}
    </div>
  );
});

MedicationBatchSearch.displayName = 'MedicationBatchSearch';
