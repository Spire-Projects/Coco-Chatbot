import { useCallback } from 'react';

interface UseKeyboardNavigationProps<T> {
  open: boolean;
  setOpen: (open: boolean) => void;
  filteredItems: T[];
  highlightedIndex: number;
  setHighlightedIndex: (index: number | ((prev: number) => number)) => void;
  search: string;
  setSearch: (search: string) => void;
  exactMatch: boolean;
  onSelect: (item: T) => void;
  onCreate?: () => void;
  canCreate?: boolean;
}

export const useKeyboardNavigation = <T>({
  open,
  setOpen,
  filteredItems,
  highlightedIndex,
  setHighlightedIndex,
  search,
  setSearch,
  exactMatch,
  onSelect,
  onCreate,
  canCreate = false,
}: UseKeyboardNavigationProps<T>) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        }
        setHighlightedIndex(prev => 
          filteredItems.length > 0 
            ? Math.min(prev + 1, filteredItems.length - 1)
            : -1
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        }
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          const item = filteredItems[highlightedIndex];
          onSelect(item);
        } else if (search && !exactMatch && canCreate && onCreate) {
          onCreate();
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (open) {
          setOpen(false);
          setSearch("");
          setHighlightedIndex(-1);
        }
        break;

      case 'Tab':
        // Permitir tab normal, cerrando el popover
        if (open) {
          setOpen(false);
          setHighlightedIndex(-1);
        }
        break;

      default:
        break;
    }
  }, [
    filteredItems,
    highlightedIndex,
    open,
    search,
    exactMatch,
    canCreate,
    setOpen,
    setHighlightedIndex,
    setSearch,
    onSelect,
    onCreate,
  ]);

  return {
    handleKeyDown,
  };
};

export default useKeyboardNavigation;