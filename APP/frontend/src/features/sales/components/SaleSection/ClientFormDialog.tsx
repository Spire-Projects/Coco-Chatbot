import { memo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Loader2, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import type { Client } from "@/shared/types/Client";
import { clientService } from "@/shared/services";
import useGlobalStates from "@/shared/hooks/useGlobalStates";


const clientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email({ message: "Correo inválido" }).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: Client) => void;
}

const ClientFormDialog = memo(({ open, onOpenChange, onClientCreated }: ClientFormDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useGlobalStates();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const clearForm = () => {
    form.reset();
  };

  const handleClose = () => {
    if (!isLoading) {
      clearForm();
      onOpenChange(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true);
    try {
      const clientData = {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        address: data.address?.trim() || undefined,
        createdBy: user?.id ?? "",
      };
      const newClient = await clientService.create(clientData);
      onClientCreated(newClient);
      clearForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(`No se pudo crear el cliente, ya existe un cliente con esta información`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Crear Nuevo Cliente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              placeholder="Nombre del cliente"
              {...form.register("name")}
              disabled={isLoading}
              className="w-full"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              placeholder="Número de teléfono"
              {...form.register("phone")}
              disabled={isLoading}
              className="w-full"
            />
            {form.formState.errors.phone && (
              <p className="text-xs text-red-500">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo (opcional)</Label>
            <Input
              id="email"
              placeholder="ejemplo@correo.com"
              {...form.register("email")}
              disabled={isLoading}
              className="w-full"
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección (opcional)</Label>
            <Input
              id="address"
              placeholder="Dirección del cliente"
              {...form.register("address")}
              disabled={isLoading}
              className="w-full"
            />
            {form.formState.errors.address && (
              <p className="text-xs text-red-500">{form.formState.errors.address.message}</p>
            )}
          </div>
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
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

ClientFormDialog.displayName = 'ClientFormDialog';

export { ClientFormDialog };
