import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useKeyboardNavigation } from "@/shared/hooks/useKeyboardNavigation";
import EditDialog from "./EditDialog";
import DeleteDialog from "./DeleteDialog";

interface CreatableSelectProps<T> {
  label: string;
  values: T[];
  selectedValue?: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  searchFunction: (query: string) => Promise<T[]>;
  onAddValue?: (name: string) => Promise<T>;
  displayField: keyof T; // Campo que se mostrará (ej: 'name', 'tradeName', etc.)
  valueField: keyof T; // Campo único para identificar (ej: 'id')
  disabled?: boolean; // Si se quiere deshabilitar el select
  hideLabel?: boolean; // Si se quiere ocultar la etiqueta
  onEditValue?: (item: T) => Promise<T | null>;
  onDeleteValue?: (item: T) => Promise<void>;
  secondaryDisplayField?: keyof T; // Nuevo campo opcional
  secondaryLabel?: string; // Nuevo campo opcional
  tertiaryDisplayField?: keyof T; // Nuevo campo opcional para mostrar tercer renglón
  tertiaryLabel?: string; // Nuevo label opcional para el tertiary
}

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
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

function CreatableSelect<T extends Record<string, any>>({
  label,
  values,
  selectedValue,
  onChange,
  placeholder,
  searchFunction,
  onAddValue,
  onEditValue,
  onDeleteValue,
  displayField,
  valueField,
  disabled = false,
  hideLabel = false,
  secondaryDisplayField,
  secondaryLabel,
  tertiaryDisplayField,
  tertiaryLabel,
}: CreatableSelectProps<T>) {
  const [search, setSearch] = useState("");
  const [filteredValues, setFilteredValues] = useState<T[]>(values);
  const [isSearching, setIsSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll hacia el elemento destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex]);

  // Debounce del search para evitar muchas peticiones
  const debouncedSearch = useDebounce(search, 300);

  // Memoizar valores calculados
  const displayText = useMemo(
    () => (selectedValue ? String(selectedValue[displayField]) : ""),
    [selectedValue, displayField]
  );

  const exactMatch = useMemo(
    () =>
      filteredValues.some(
        (item) =>
          String(item[displayField]).toLowerCase() === search.toLowerCase()
      ),
    [filteredValues, search, displayField]
  );

  // Búsqueda optimizada con debounce
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setFilteredValues(values);
        setHighlightedIndex(-1);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchFunction(debouncedSearch);
        setFilteredValues(results);
        setHighlightedIndex(0); // Auto-highlight primero
      } catch (error) {
        console.error("Error en búsqueda:", error);
        setFilteredValues([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch, values, searchFunction]);

  // Mantener foco en input al filtrar
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      const input = inputRef.current;
      // Usar setTimeout para asegurar que el re-render termine
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
    }
  }, [filteredValues]);

  const handleCreate = useCallback(async () => {
    if (!onAddValue || !search.trim()) return;

    setCreating(true);
    try {
      const newItem = await onAddValue(search.trim());
      onChange(newItem);
      setSearch("");
      setFilteredValues((prev) => [...prev, newItem]);
      setOpen(false);
    } catch (error) {
      console.error("Error creando elemento:", error);
      alert("No se pudo crear. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }, [onAddValue, search, onChange]);

  const handleSelect = useCallback(
    (item: T) => {
      onChange(item);
      setSearch("");
      setOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Navegación con teclado usando hook personalizado
  const { handleKeyDown } = useKeyboardNavigation({
    open,
    setOpen,
    filteredItems: filteredValues,
    highlightedIndex,
    setHighlightedIndex,
    search,
    setSearch,
    exactMatch,
    onSelect: handleSelect,
    onCreate: handleCreate,
    canCreate: Boolean(onAddValue),
  });

  const handleSearch = useCallback(
    (query: string) => {
      setSearch(query);
      setHighlightedIndex(-1);
      if (!open) {
        setOpen(true);
      }
    },
    [open]
  );

  // Resetear estado cuando se abre/cierra el popover
  useEffect(() => {
    if (open) {
      // Cuando se abre, resetear búsqueda si hay valor seleccionado
      if (selectedValue && !search) {
        setSearch("");
      }
      setHighlightedIndex(-1);
    } else {
      // Cuando se cierra, limpiar búsqueda
      setSearch("");
      setHighlightedIndex(-1);
    }
  }, [open, selectedValue, search]);

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            className="w-full justify-between h-auto min-h-[2.5rem] py-2"
            disabled={disabled}
            onClick={() => !disabled && setOpen(!open)}
          >
            <span
              className={`text-left flex-1 text-wrap break-words pr-2 ${
                !displayText ? "text-gray-400" : ""
              }`}
              style={{ 
                wordBreak: "break-word",
                overflowWrap: "break-word",
                hyphens: "auto"
              }}
            >
              {displayText ||
                placeholder ||
                `Seleccionar ${label.toLowerCase()}`}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 min-w-[300px]"
          align="start"
          sideOffset={4}
        >
          {disabled ? (
            <div className="p-2">
              <div className="px-2 py-1.5 text-sm">{displayText}</div>
            </div>
          ) : (
            <>
              <div className="p-2 border-b">
                <Input
                  ref={inputRef}
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8"
                  autoFocus
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
              {isSearching ? (
                <div className="p-2 text-center text-gray-500 text-sm">
                  Buscando...
                </div>
              ) : (
                <div 
                  ref={listRef} 
                  className="max-h-[300px] overflow-y-auto overscroll-contain select-scroll"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {filteredValues.map((item, index) => {
                    return (
                      <div
                        key={String(item[valueField])}
                        className={`relative flex items-start justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors group ${
                          highlightedIndex === index
                            ? "bg-accent text-accent-foreground"
                            : ""
                        } ${
                          selectedValue &&
                          String(selectedValue[valueField]) ===
                            String(item[valueField])
                            ? "bg-accent/50"
                            : ""
                        } ${tertiaryDisplayField ? 'min-h-[75px] py-3' : ''}`}
                      >
                        <div 
                          className="cursor-pointer flex-1 pr-2  h-8 flex flex-col items-center"
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div 
                            className="text-wrap break-words leading-tight text-left flex-col flex justify-end w-full"
                            style={{ 
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                              hyphens: "auto"
                            }}
                          >
                            {String(item[displayField])} 
                          </div>
                          {secondaryDisplayField && (
                            <div className="text-xs text-gray-600 mt-1 text-wrap break-words w-full">
                              {secondaryLabel && (
                                <span className="font-medium mr-1 w-full text-left">
                                  {secondaryLabel}:
                                </span>
                              )}
                              <span>{String(item[secondaryDisplayField])}</span>
                            </div>
                          )}
                          {tertiaryDisplayField && (
                            <div className="text-xs text-gray-600 mt-0.5 text-wrap break-words w-full">
                              {tertiaryLabel && (
                                <span className="font-medium mr-1 w-full text-left">
                                  {tertiaryLabel}:
                                </span>
                              )}
                              <span>{String(item[tertiaryDisplayField ?? ""] ?? "")}</span>
                            </div>
                          )}
                        </div>
                        
                        {(onEditValue || onDeleteValue) && (
                          <div 
                            className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            {onEditValue && (
                              <EditDialog
                                currentName={String(item[displayField])}
                                onConfirm={async (newName) => {
                                  const updated = await onEditValue({
                                    ...item,
                                    [displayField]: newName,
                                  });
                                  if (!updated) return;
                                  setFilteredValues((prev) =>
                                    prev.map((v) =>
                                      String(v[valueField]) ===
                                      String(updated[valueField])
                                        ? updated
                                        : v
                                    )
                                  );
                                  if (
                                    selectedValue &&
                                    String(selectedValue[valueField]) ===
                                      String(updated[valueField])
                                  ) {
                                    onChange(updated);
                                  }
                                }}
                              />
                            )}
                            {onDeleteValue && (
                              <DeleteDialog
                                name={String(item[displayField])}
                                onConfirm={async () => {
                                  await onDeleteValue(item);
                                  setFilteredValues((prev) =>
                                    prev.filter(
                                      (v) =>
                                        String(v[valueField]) !==
                                        String(item[valueField])
                                    )
                                  );
                                  if (
                                    selectedValue &&
                                    String(selectedValue[valueField]) ===
                                      String(item[valueField])
                                  ) {
                                    onChange(null as any); // Limpiar selección si se borró
                                  }
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {search && !exactMatch && onAddValue && (
                    <div className="p-2 border-t">
                      <Button
                        type="button"
                        onClick={handleCreate}
                        className="w-full text-sm h-8 "
                        disabled={creating}
                        variant="ghost"
                      >
                        {creating ? "Creando..." : `+ Crear "${search}"`}
                      </Button>
                    </div>
                  )}
                  {filteredValues.length === 0 && !search && (
                    <div className="p-2 text-center text-gray-500 text-sm">
                      No hay opciones disponibles
                    </div>
                  )}
                  {filteredValues.length === 0 && search && !isSearching && (
                    <div className="p-2 text-center text-gray-500 text-sm">
                      No se encontraron resultados
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default CreatableSelect;
