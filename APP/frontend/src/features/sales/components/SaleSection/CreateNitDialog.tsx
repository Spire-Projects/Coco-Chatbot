import { memo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { AlertCircle, Receipt } from 'lucide-react';
import { validateNitNumber, validateSocialReason } from "@/shared/services/NitService";
import type { NIT } from "@/shared/types/Nit";

interface CreateNitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNitCreated: (numberNit: string, socialReason: string) => Promise<NIT>;
}

const CreateNitDialog = memo(({ open, onOpenChange, onNitCreated }: CreateNitDialogProps) => {
  const [numberNit, setNumberNit] = useState('');
  const [socialReason, setSocialReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpiar formulario
  const clearForm = () => {
    setNumberNit('');
    setSocialReason('');
    setError(null);
  };

  // Manejar cierre del diálogo
  const handleClose = () => {
    if (!isLoading) {
      clearForm();
      onOpenChange(false);
    }
  };

  // Validar formulario
  const validateForm = (): string | null => {
    if (!numberNit.trim()) {
      return 'El número de NIT es requerido';
    }

    if (!validateNitNumber(numberNit.trim())) {
      return 'El número de NIT debe tener entre 7 y 15 dígitos';
    }

    if (!socialReason.trim()) {
      return 'La razón social es requerida';
    }

    if (!validateSocialReason(socialReason.trim())) {
      return 'La razón social debe tener al menos 3 caracteres';
    }

    return null;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onNitCreated(numberNit.trim(), socialReason.trim());
      clearForm();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el NIT';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Crear Nuevo NIT
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Número de NIT */}
          <div className="space-y-2">
            <Label htmlFor="numberNit">Número de NIT</Label>
            <Input
              id="numberNit"
              type="text"
              value={numberNit}
              onChange={(e) => setNumberNit(e.target.value)}
              placeholder="Ej: 123456789-0"
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Razón Social */}
          <div className="space-y-2">
            <Label htmlFor="socialReason">Razón Social</Label>
            <Input
              id="socialReason"
              type="text"
              value={socialReason}
              onChange={(e) => setSocialReason(e.target.value)}
              placeholder="Ej: Empresa S.A."
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Mostrar error si existe */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : 'Crear NIT'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CreateNitDialog.displayName = 'CreateNitDialog';

export { CreateNitDialog };
