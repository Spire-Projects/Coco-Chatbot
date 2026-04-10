import React, { useState, useEffect, useMemo } from 'react';
import { UserSearchAndFilters, type UserFilter } from '../components/UserSearchAndFilters';
import { UserTable } from '../components/UserTable';
import { DataPagination } from '../../../shared/components/DataPagination';
import type { AuthUser } from '@/shared/types/User';
import { UserDialog } from '../components/UserDialog';
import CustomDialog from '../../../shared/components/CustomDialog';
import { useUserActions } from '../hooks/useUserActions';
import PageHeader from '@/shared/components/PageHeader';
import { User2Icon } from 'lucide-react';

export const UserManager: React.FC = () => {
  // Estados para búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<UserFilter>('all');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  // Usar el hook personalizado para toda la lógica de gestión de usuarios
  const {
    users,
    loading,
    dialogOpen,
    dialogMode,
    editingUser,
    deleteDialogOpen,
    userToDelete,
    deleteLoading,
    loadUsers,
    handleNewUser,
    handleEditUser,
    handleDeleteUser,
    confirmDeleteUser,
    handleDialogSuccess,
    closeDialog,
    cancelDelete,
    filterUsers,
    calculateUserCounts
  } = useUserActions();

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Aplicar filtros
  const filteredUsers = useMemo(() => 
    filterUsers(users, searchQuery, activeFilter),
  [users, searchQuery, activeFilter, filterUsers]);

  // Calcular usuarios paginados
  const paginatedUsers = useMemo<AuthUser[]>(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, usersPerPage]);

  // Calcular contadores para los filtros
  const userCounts = useMemo(() => 
    calculateUserCounts(users),
  [users, calculateUserCounts]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (filter: UserFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1); 
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = Math.min(startIndex + usersPerPage, filteredUsers.length);

  return (
    <div className="p-0 xs:p-1 sm:p-2 md:p-4 lg:p-6 space-y-6">
      <PageHeader title='Usuarios' subtitle='Gestion de usuarios' icon={<User2Icon/>}></PageHeader>
      <div className="mb-6">
        <UserSearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onNewUser={handleNewUser}
          userCounts={userCounts}
        />
      </div>
      <div className="mb-4">
        <UserTable
          users={paginatedUsers}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          loading={loading}
        />
      </div>
      {filteredUsers.length > 0 && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          itemsPerPage={usersPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={(newUsersPerPage: number) => {
            setUsersPerPage(newUsersPerPage);
            setCurrentPage(1);
          }}
          startIndex={startIndex}
          endIndex={endIndex}
          itemName="usuarios"
        />
      )}
      <UserDialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        onSuccess={handleDialogSuccess}
        user={editingUser}
        mode={dialogMode}
      />
      
      {/* Diálogo de confirmación para eliminación de usuario */}
      <CustomDialog
        isOpen={deleteDialogOpen}
        onConfirm={confirmDeleteUser}
        onCancel={cancelDelete}
        textConfirm="Eliminar"
        textCancel="Cancelar"
        title="Eliminar Usuario Permanentemente"
        description={userToDelete ? `¿Estás seguro que deseas eliminar permanentemente al usuario ${userToDelete.fullName}? Esta acción no se puede deshacer y el registro será eliminado completamente de la base de datos.` : ""}
        loading={deleteLoading}
      />
    </div>
  );
};
