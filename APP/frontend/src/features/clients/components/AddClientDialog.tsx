import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import type { ClientView, CreateClientData, UpdateClientData } from "@/shared/types/Client";
import { ClientForm } from "./ClientForm";
import useGlobalStates from "@/shared/hooks/useGlobalStates";
import { clientService } from "@/shared/services";

// Schema de validación - Solo nombre es obligatorio
const clientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: () => void;
  mode?: "create" | "edit";
  client?: ClientView | null;
}

export const AddClientDialog = ({ 
  open, 
  onOpenChange, 
  onClientCreated, 
  mode = "create",
  client = null
}: AddClientDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = mode === "edit" && client;
  const {user} = useGlobalStates();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  // Llenar el formulario cuando se está editando
  useEffect(() => {
    if (isEditMode && client) {
      form.reset({
        name: client.name,
        email: client.email,
        phone: client.phone || "",
        address: client.address || "",
      });
    } else if (mode === "create") {
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: "",
      });
    }
  }, [isEditMode, client, mode, form]);

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true);
    try {
      if (isEditMode && client) {
        // Modo edición
        const updateData: UpdateClientData = {
          name: data.name,
          email: data.email?.trim() || "",
          phone: data.phone?.trim() || "",
          address: data.address?.trim() || "",
          updatedBy: user?.id || ""
        };

        await clientService.update(client.id, updateData);
        toast.success("Cliente actualizado exitosamente");
      } else {
        // Modo creación
        const clientData: CreateClientData = {
          name: data.name,
          email: data.email?.trim() || "",
          phone: data.phone?.trim() || "",
          address: data.address?.trim() || "",
          createdBy: user?.id || ""
        };

        await clientService.create(clientData);
        toast.success("Cliente creado exitosamente");
      }
      
      form.reset();
      onOpenChange(false);
      onClientCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 
        `Error al ${isEditMode ? 'actualizar' : 'crear'} cliente`);
    } finally {
      setIsLoading(false);
    }
  };

  const dialogTitle = isEditMode ? "Editar Cliente" : "Crear Cliente Frecuente";
  const submitButtonText = isEditMode 
    ? (isLoading ? "Actualizando..." : "Actualizar Cliente")
    : (isLoading ? "Creando..." : "Crear Cliente");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">{dialogTitle}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ClientForm form={form} mode={mode} />
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {submitButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;