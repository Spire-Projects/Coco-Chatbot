import type { AuthUser, UserRole } from './User';

// Register
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterResponse {
  user: AuthUser;
  token: string;
}

// Login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  expires_in: number;
  refresh_token?: string;
}

// Respuesta cruda que devuelve PostgREST /rpc/login
export interface PostgRESTLoginResponse {
  user: {
    id: string;
    name: string;
    role: UserRole;
    email: string;
  };
  token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}
