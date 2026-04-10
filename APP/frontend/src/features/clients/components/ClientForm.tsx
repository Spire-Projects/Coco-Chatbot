import { memo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";

interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ClientFormProps {
  form: UseFormReturn<ClientFormData>;
  mode?: "create" | "edit";
}

// Componente memoizado para evitar re-renders innecesarios
export const ClientForm = memo(({ form, mode = "create" }: ClientFormProps) => {
  const {
    register,
    formState: { errors },
  } = form;

  const isEditMode = mode === "edit";

  return (
    <div className="grid gap-4">
      {/* Información básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nombre completo *</Label>
          <Input
            id="name"
            placeholder={
              isEditMode ? "Editar nombre del cliente" : "Juan Pérez"
            }
            autoComplete="name"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="juan@ejemplo.com"
            autoComplete="email"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+591 70123456"
            autoComplete="tel"
            {...register("phone")}
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Dirección */}
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Textarea
          id="address"
          placeholder="Av. Ejemplo #123, Zona Centro, La Paz"
          className={`resize-none ${errors.address ? "border-red-500" : ""}`}
          {...register("address")}
        />
        {errors.address && (
          <p className="text-sm text-red-500">{errors.address.message}</p>
        )}
      </div>
    </div>
  );
});

ClientForm.displayName = "ClientForm";
