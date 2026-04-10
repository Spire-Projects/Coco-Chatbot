export const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'superadmin':
      return 'default';
    case 'admin':
      return 'default';
    case 'vendedor':
      return 'secondary';
    default:
      return 'outline';
  }
};

export const getRoleLabel = (role: string) => {
  switch (role) {
    case 'superadmin':
      return 'Super Administrador';
    case 'admin':
      return 'Administrador';
    case 'vendedor':
      return 'Vendedor';
    default:
      return role;
  }
};
  