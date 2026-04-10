import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/shared/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface BaseOption {
  id: string;
  name: string;
}

interface Props<T extends BaseOption> {
  label: string;
  value: string;
  options: T[];
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<T>;
  onEdit?: (id: string, name: string) => Promise<T | null>;
  onDelete?: (id: string) => Promise<void>;
  setOptions?: React.Dispatch<React.SetStateAction<T[]>>;
}

export function AsyncCreatableSelect<T extends BaseOption>({
  label,
  value,
  options,
  onChange,
  onCreate,
  onEdit,
  onDelete,
  setOptions,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      const created = await onCreate(search);
      if (setOptions) {
        setOptions((prev) => [...prev, created]);
      }
      onChange(created.id);
      setSearch("");
      setCreating(false);
    } catch (err) {
      alert("No se pudo crear. Intenta de nuevo.");
      console.error(err);
    }
  };

  const handleEdit = async (id: string, newName: string) => {
    if (!onEdit || !setOptions) return;
    try {
      const updated = await onEdit(id, newName);
      setOptions((prev) =>
        prev.map((opt) =>
          opt.id === id ? { ...opt, name: updated?.name ?? newName } : opt
        )
      );
    } catch (err) {
      alert("No se pudo editar.");
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete || !setOptions) return;
    try {
      await onDelete(id);
      setOptions((prev) => prev.filter((opt) => opt.id !== id));
    } catch (err) {
      alert("No se pudo eliminar.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Seleccionar ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filtered.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded-sm"
            >
              <SelectItem value={option.id} className="flex-1 truncate">
                {option.name}
              </SelectItem>
              <div className="flex gap-1 ml-2">
                {onEdit && setOptions && (
                  <EditDialog
                    currentName={option.name}
                    onConfirm={(newName) => handleEdit(option.id, newName)}
                  />
                )}
                {onDelete && setOptions && (
                  <DeleteDialog
                    name={option.name}
                    onConfirm={() => handleDelete(option.id)}
                  />
                )}
              </div>
            </div>
          ))}
          {search &&
            !filtered.some(
              (opt) => opt.name.toLowerCase() === search.toLowerCase()
            ) && (
              <div className="p-2">
                <Button
                  type="button"
                  onClick={handleCreate}
                  className="w-full text-sm"
                  disabled={creating}
                >
                  + Crear "{search}"
                </Button>
              </div>
            )}
        </SelectContent>
      </Select>
    </div>
  );
}

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

function DeleteDialog({
  name,
  onConfirm,
}: {
  name: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar "{name}"?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirm}>
              Eliminar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
