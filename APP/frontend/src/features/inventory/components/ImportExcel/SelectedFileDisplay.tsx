import { FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface SelectedFileDisplayProps {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}

export const SelectedFileDisplay = ({
  file,
  onRemove,
  disabled = false,
}: SelectedFileDisplayProps) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <FileSpreadsheet className="h-8 w-8 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{file.name}</p>
        <p className="text-xs text-gray-500">
          {(file.size / 1024).toFixed(2)} KB
        </p>
      </div>
      {!disabled && (
        <Button variant="ghost" size="sm" onClick={onRemove} className="flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
