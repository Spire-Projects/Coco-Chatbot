import { Loader2, Search } from "lucide-react";
import { Input } from "./ui/input";
import { memo } from "react";

const SearchInput = memo(({
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}) => {
  return (
    <div className="relative flex-1">
      {isLoading ? (
        <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
      ) : (
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      )}
      <Input
        type="text"
        placeholder="Buscar por código, nombre o descripción..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-busy={isLoading}
        className="pl-10"
      />
    </div>
  );
});

export default SearchInput;