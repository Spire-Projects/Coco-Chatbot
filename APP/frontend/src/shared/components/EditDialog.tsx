import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/shared/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Pencil } from "lucide-react";
import { Input } from "./ui/input";

function EditDialog({
  currentName,
  onConfirm,
}: {
  currentName: string;
  onConfirm: (newName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNewName(currentName);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const el = inputRef.current;
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
  }, [open, currentName]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-blue-600 hover:text-blue-800"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar</DialogTitle>
        </DialogHeader>
        <Input
          ref={inputRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuevo nombre"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              onClick={() => onConfirm(newName)}
              disabled={!newName.trim()}
            >
              Guardar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default EditDialog;
