import type { UserRole } from '../../types/User';

// Tipos de usuario (RxDB schema removed — schema no longer needed in PostgREST architecture)
export interface UserDocument {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastSession?: string;
  isDeleted: boolean;
  sincronized?: boolean;

}

// Datos para crear un usuario
export interface CreateUserData {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

// Datos para actualizar un usuario
export interface UpdateUserData {
  fullName?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
}

// Credenciales de login
export interface LoginCredentials {
  email: string;
  password: string;
}

// Usuario autenticado (sin datos sensibles)
