// Roles del sistema — deben coincidir con el enum user_role de PostgreSQL
export type UserRole = 'superadmin' | 'admin' | 'vendedor';

export interface AuthUser {
  id: string;
  fullName: string; // mapeado desde `name` en la DB
  email: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
  lastSession?: string;
  /** Sucursales asignadas al usuario (cargadas tras login) */
  branches?: import('./Branch').Branch[];
}
