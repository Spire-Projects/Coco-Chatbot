import { pgFetch, storeAuthToken, removeAuthToken, storeRefreshToken } from '../api/client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  PostgRESTLoginResponse,
} from '../types/Auth';
import type { AuthUser } from '../types/User';

/** Mapea la respuesta cruda de PostgREST a AuthUser */
function toAuthUser(raw: PostgRESTLoginResponse['user']): AuthUser {
  return {
    id: raw.id,
    fullName: raw.name,  // API devuelve `name`, UI usa `fullName`
    email: raw.email,
    role: raw.role,
    active: true,
  };
}

export const AuthService = {
  /**
   * Inicia sesión contra PostgREST /rpc/login.
   * Almacena el token en localStorage si es exitoso.
   */
  async login(data: LoginRequest): Promise<LoginResponse | null> {
    try {
      // Limpiar token viejo antes de llamar para evitar PGRST301 con tokens expirados/inválidos
      removeAuthToken();
      const response = await pgFetch<PostgRESTLoginResponse>('/rpc/login', {
        method: 'POST',
        body: JSON.stringify({ p_email: data.email, p_password: data.password }),
        skipAuth: true,
      });

      const user = toAuthUser(response.user);
      storeAuthToken(response.token);
      if (response.refresh_token) storeRefreshToken(response.refresh_token);
      localStorage.setItem('falcon_user', JSON.stringify(user));

      return {
        user,
        token: response.token,
        expires_in: response.expires_in,
        refresh_token: response.refresh_token,
      };
    } catch (error) {
      console.error('Error en login:', error);
      return null;
    }
  },

  /**
   * Registra un nuevo usuario via PostgREST /rpc/register_user.
   * Requiere token de admin/superadmin en el header.
   */
  async register(data: RegisterRequest): Promise<RegisterResponse | null> {
    try {
      const response = await pgFetch<PostgRESTLoginResponse>('/rpc/register_user', {
        method: 'POST',
        body: JSON.stringify({
          p_name: data.fullName,
          p_email: data.email,
          p_password: data.password,
          p_role: data.role ?? 'vendedor',
        }),
      });

      const user = toAuthUser(response.user);
      return { user, token: response.token };
    } catch (error) {
      console.error('Error en registro:', error);
      return null;
    }
  },

  /** Cierra la sesión limpiando el token y usuario del localStorage */
  logout(): void {
    removeAuthToken();
  },

  /** Carga el usuario guardado en localStorage (sin validar contra la API) */
  loadUserFromStorage(): { user: AuthUser; token: string } | null {
    const token = localStorage.getItem('falcon_token');
    const userStr = localStorage.getItem('falcon_user');
    if (!token || !userStr) return null;

    try {
      const user: AuthUser = JSON.parse(userStr);
      return { user, token };
    } catch {
      removeAuthToken();
      return null;
    }
  },
};
