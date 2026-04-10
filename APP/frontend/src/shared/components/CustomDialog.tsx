
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface CustomDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    textConfirm?: string;
    textCancel?: string;
    title?: string;
    description?: string;
    loading?: boolean;
}

const CustomDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  textConfirm = "Confirmar",
  textCancel = "Cancelar",
  title = "¿Desea completar esta acción?",
  description = "¿Estás seguro que deseas completar esta acción? Esta acción no se puede deshacer.",
  loading = false,
}: CustomDialogProps) => {
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {textCancel}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {textConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomDialog;