import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useEntityDataQuery } from "@/shared/hooks/useEntityDataQuery";
import { supplierService } from "@/shared/services/SupplierService";
import type { Supplier, SupplierView, SupplierFilter, CreateSupplierData, UpdateSupplierData } from "@/shared/types/modelTypes/Supplier";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import SearchInput from "@/shared/components/SearchInput";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/components/ui/form";
import CustomDialog from "@/shared/components/CustomDialog";
import { DataPagination } from "@/shared/components/DataPagination";

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const supplierSchema = z.object({
  name:  z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SuppliersTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierView | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierView | null>(null);

  const queryClient = useQueryClient();

  const {
    items: suppliers,
    loading,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    searchQuery,
    setPage,
    setPageSize,
    setSearch,
  } = useEntityDataQuery<Supplier, SupplierView, SupplierFilter>(
    supplierService,
    "suppliers",
    { initialPageSize: 10 },
  );

  // ── Form ──────────────────────────────────────────────────────────────────

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  const openCreate = useCallback(() => {
    setEditingSupplier(null);
    form.reset({ name: "", phone: "", email: "", notes: "" });
    setIsDialogOpen(true);
  }, [form]);

  const openEdit = useCallback((supplier: SupplierView) => {
    setEditingSupplier(supplier);
    form.reset({
      name:  supplier.name,
      phone: supplier.phone  ?? "",
      email: supplier.email  ?? "",
      notes: supplier.notes  ?? "",
    });
    setIsDialogOpen(true);
  }, [form]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (data: SupplierFormData) => {
      if (editingSupplier) {
        const payload: UpdateSupplierData = {
          name:  data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          notes: data.notes || undefined,
        };
        return supplierService.update(editingSupplier.id, payload);
      }
      const payload: CreateSupplierData = {
        name:  data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        notes: data.notes || undefined,
      };
      return supplierService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(editingSupplier ? "Proveedor actualizado" : "Proveedor creado");
      setIsDialogOpen(false);
      setEditingSupplier(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar proveedor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor eliminado");
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
    },
    onError: () => {
      toast.error("Error al eliminar proveedor");
    },
  });

  const handleConfirmDelete = useCallback(() => {
    if (supplierToDelete) deleteMutation.mutate(supplierToDelete.id);
  }, [supplierToDelete, deleteMutation]);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex   = Math.min(currentPage * pageSize, totalItems);

  return (
    <>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
        <SearchInput value={searchQuery} onChange={setSearch} isLoading={loading} />
        <Button size="sm" onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedores</CardTitle>
          <CardDescription>Empresas o personas que suministran productos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Cargando proveedores...</span>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay proveedores registrados</p>
              <p className="text-sm">
                {searchQuery
                  ? "No se encontraron proveedores con ese criterio"
                  : "Comienza agregando tu primer proveedor"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden md:table-cell">Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {s.email || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {s.phone || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {s.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setSupplierToDelete(s); setIsDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && totalItems > 0 && (
        <div className="mt-4">
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            onItemsPerPageChange={setPageSize}
            startIndex={startIndex}
            endIndex={endIndex}
            itemName="proveedores"
          />
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl><Input placeholder="Nombre del proveedor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="correo@ejemplo.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl><Input placeholder="+591 70000000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl><Input placeholder="Observaciones opcionales" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <CustomDialog
        isOpen={isDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setIsDeleteDialogOpen(false); setSupplierToDelete(null); }}
        loading={deleteMutation.isPending}
        title="Eliminar Proveedor"
        description={
          supplierToDelete
            ? `¿Eliminar a "${supplierToDelete.name}"? Esta acción no se puede deshacer.`
            : "¿Eliminar este proveedor?"
        }
        textConfirm="Eliminar"
        textCancel="Cancelar"
      />
    </>
  );
}
