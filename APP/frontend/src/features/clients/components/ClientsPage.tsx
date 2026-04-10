import { useState, useCallback } from "react";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddClientDialog } from "./AddClientDialog";
import { ClientSearchControls } from "./ClientSearchControls";
import { ClientTable } from "./ClientTable";
import { ClientMobileList } from "./ClientMobileList";
import { DataPagination } from "@/shared/components/DataPagination";
import CustomDialog from "@/shared/components/CustomDialog";
import { useEntityDataQuery } from "@/shared/hooks/useEntityDataQuery";
import type { Client, ClientView, ClientFilter } from "@/shared/types/Client";
import { clientService } from "@/shared/services";
import PageHeader from "@/shared/components/PageHeader";

export const ClientsPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientView | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientView | null>(null);

  const queryClient = useQueryClient();

  const {
    items: clients,
    loading,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    searchQuery,
    setPage,
    setPageSize,
    setSearch,
  } = useEntityDataQuery<Client, ClientView, ClientFilter>(
    clientService,
    "clients",
    { initialPageSize: 10 }
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente eliminado exitosamente");
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
    },
    onError: () => {
      toast.error("Error al eliminar el cliente");
    },
  });

  const handleClientSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    setIsDialogOpen(false);
    setEditingClient(null);
  }, [queryClient]);

  const handleEditClient = useCallback((client: ClientView) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteClient = useCallback((client: ClientView) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!clientToDelete) return;
    deleteMutation.mutate(clientToDelete.id);
  }, [clientToDelete, deleteMutation]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setClientToDelete(null);
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setEditingClient(null);
  }, []);

  const handleCreateClick = useCallback(() => {
    setEditingClient(null);
    setIsDialogOpen(true);
  }, []);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="p-0 xs:p-1 sm:p-2 md:p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Gestión de clientes"
        icon={<UserCog className="w-6 h-6 text-blue-600" />}
      />

      <div className="mt-5">
        <ClientSearchControls
          searchTerm={searchQuery}
          onSearchChange={setSearch}
          onCreateClick={handleCreateClick}
        />

        <ClientTable
          clients={clients}
          loading={loading}
          searchQuery={searchQuery}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
        />

        <ClientMobileList
          clients={clients}
          loading={loading}
          searchQuery={searchQuery}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
        />

        {!loading && totalItems > 0 && (
          <div className="mt-6">
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={setPageSize}
              startIndex={startIndex}
              endIndex={endIndex}
              itemName="clientes"
            />
          </div>
        )}
      </div>

      <AddClientDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onClientCreated={handleClientSaved}
        mode={editingClient ? "edit" : "create"}
        client={editingClient}
      />

      <CustomDialog
        isOpen={isDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleteMutation.isPending}
        title="Eliminar Cliente"
        description={
          clientToDelete
            ? `¿Estás seguro de que deseas eliminar a "${clientToDelete.name}"? Esta acción no se puede deshacer.`
            : "¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
        }
        textConfirm="Eliminar"
        textCancel="Cancelar"
      />
    </div>
  );
};

