// @ts-nocheck
import { pgFetch, removeAuthToken, storeAuthToken } from '../api/client';
import type { AuthUser, UserRole } from '../types/User';

interface RawUser {
  id: string;
  name?: string;
  full_name?: string;
  fullName?: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
}

function mapUser(raw: RawUser): AuthUser {
  return {
    id: raw.id,
    fullName: raw.fullName ?? raw.full_name ?? raw.name ?? raw.email,
    email: raw.email,
    role: raw.role,
    active: raw.is_active ?? !raw.is_deleted,
    createdAt: raw.created_at,
  };
}

export const UserService = {
  async register(data: { fullName: string; email: string; password: string; role?: UserRole }) {
    try {
      const res = await pgFetch<{ user: { id: string; name: string; email: string; role: UserRole }; token: string }>(
        '/rpc/register_user',
        {
          method: 'POST',
          body: JSON.stringify({
            p_name: data.fullName,
            p_email: data.email,
            p_password: data.password,
            p_role: data.role ?? 'vendedor',
          }),
        }
      );

      const user = mapUser({ ...res.user, fullName: res.user.name, active: true });
      if (res.token) {
        storeAuthToken(res.token);
        localStorage.setItem('falcon_user', JSON.stringify(user));
      }

      return { success: true, user, token: res.token };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error creando usuario' };
    }
  },

  async login(data: { email: string; password: string }) {
    try {
      const res = await pgFetch<{ user: { id: string; name: string; email: string; role: UserRole }; token: string }>(
        '/rpc/login',
        {
          method: 'POST',
          body: JSON.stringify({ p_email: data.email, p_password: data.password }),
        }
      );

      const user = mapUser({ ...res.user, fullName: res.user.name, active: true });
      storeAuthToken(res.token);
      localStorage.setItem('falcon_user', JSON.stringify(user));

      return { success: true, user, token: res.token };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Credenciales inválidas' };
    }
  },

  logout() {
    removeAuthToken();
  },

  async getAllUsers() {
    try {
      const rows = await pgFetch<RawUser[]>('/users?select=id,name,email,role,is_active,is_deleted,created_at');
      return { success: true, users: rows.map(mapUser).filter((u) => u.active) };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error cargando usuarios' };
    }
  },

  async getUserById(id: string) {
    try {
      const rows = await pgFetch<RawUser[]>(`/users?id=eq.${id}&select=id,name,email,role,is_active,is_deleted,created_at&limit=1`);
      const user = rows?.[0] ? mapUser(rows[0]) : null;
      if (!user) return { success: false, error: 'Usuario no encontrado' };
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error cargando usuario' };
    }
  },

  async updateUser(id: string, data: Partial<AuthUser> & { fullName?: string }) {
    try {
      const payload: Record<string, unknown> = {
        email: data.email,
        role: data.role,
        is_active: data.active,
      };
      if (data.fullName) payload.name = data.fullName;

      const rows = await pgFetch<RawUser[]>(`/users?id=eq.${id}&select=id,name,email,role,is_active,is_deleted,created_at`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      return { success: true, user: rows?.[0] ? mapUser(rows[0]) : null };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error actualizando usuario' };
    }
  },

  async deleteUser(id: string) {
    try {
      await pgFetch<unknown>(`/users?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_deleted: true, is_active: false }),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error eliminando usuario' };
    }
  },
};
