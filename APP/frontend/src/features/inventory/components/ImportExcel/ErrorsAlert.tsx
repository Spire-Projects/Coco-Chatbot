import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface ErrorsAlertProps {
  errors: string[];
}

export const ErrorsAlert = ({ errors }: ErrorsAlertProps) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          <p className="font-medium">Se encontraron los siguientes errores:</p>
          <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
            {errors.length > 10 && (
              <li className="text-gray-500">
                ... y {errors.length - 10} errores más
              </li>
            )}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
};
