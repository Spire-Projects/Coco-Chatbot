import { pgFetch } from '../api/client';
import { mapBranch, mapUserBranch, type Branch, type RawBranch, type RawUserBranch, type UserBranch } from '../types/Branch';

// ─── Branch CRUD ──────────────────────────────────────────────────────────────

export const BranchService = {
  /** Obtiene todas las sucursales activas (no eliminadas) */
  async getAll(): Promise<{ success: true; branches: Branch[] } | { success: false; error: string }> {
    try {
      const rows = await pgFetch<RawBranch[]>(
        '/branches?is_deleted=eq.false&order=name.asc&select=id,name,address,phone,is_active,sale_prefix,created_at,created_by,updated_at,is_deleted'
      );
      return { success: true, branches: rows.map(mapBranch) };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error cargando sucursales' };
    }
  },

  /** Crea una nueva sucursal */
  async create(data: { name: string; address?: string; phone?: string; salePrefix?: string }): Promise<{ success: true; branch: Branch } | { success: false; error: string }> {
    try {
      const rows = await pgFetch<RawBranch[]>('/branches?select=id,name,address,phone,is_active,sale_prefix,created_at,created_by,updated_at,is_deleted', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name.trim(),
          address: data.address?.trim() || null,
          phone: data.phone?.trim() || null,
          sale_prefix: data.salePrefix?.trim().toUpperCase() || '',
        }),
      });
      return { success: true, branch: mapBranch(rows[0]) };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error creando sucursal' };
    }
  },

  /** Actualiza datos de una sucursal */
  async update(id: string, data: Partial<{ name: string; address: string; phone: string; isActive: boolean; salePrefix: string }>): Promise<{ success: true; branch: Branch } | { success: false; error: string }> {
    try {
      const payload: Record<string, unknown> = {};
      if (data.name        !== undefined) payload.name         = data.name.trim();
      if (data.address     !== undefined) payload.address      = data.address.trim() || null;
      if (data.phone       !== undefined) payload.phone        = data.phone.trim() || null;
      if (data.isActive    !== undefined) payload.is_active    = data.isActive;
      if (data.salePrefix  !== undefined) payload.sale_prefix  = data.salePrefix.trim().toUpperCase() || '';

      const rows = await pgFetch<RawBranch[]>(
        `/branches?id=eq.${id}&select=id,name,address,phone,is_active,sale_prefix,created_at,created_by,updated_at,is_deleted`,
        { method: 'PATCH', body: JSON.stringify(payload) }
      );
      return { success: true, branch: mapBranch(rows[0]) };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error actualizando sucursal' };
    }
  },

  /** Soft-delete de una sucursal */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await pgFetch<unknown>(`/branches?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_deleted: true, is_active: false }),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error eliminando sucursal' };
    }
  },

  // ─── User-Branch relations ──────────────────────────────────────────────

  /** Obtiene las sucursales de un usuario con datos de la sucursal embebidos */
  async getBranchesByUser(userId: string): Promise<{ success: true; items: UserBranch[] } | { success: false; error: string }> {
    try {
      const rows = await pgFetch<RawUserBranch[]>(
        `/user_branches?user_id=eq.${userId}&is_active=eq.true&select=id,user_id,branch_id,is_active,branches(id,name,address,phone,is_active,created_at,is_deleted)`
      );
      return { success: true, items: rows.map(mapUserBranch) };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error cargando sucursales del usuario' };
    }
  },

  /** Asigna una sucursal a un usuario (crea la relación si no existe) */
  async assignBranchToUser(userId: string, branchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar si ya existe (activa o inactiva)
      const existing = await pgFetch<RawUserBranch[]>(
        `/user_branches?user_id=eq.${userId}&branch_id=eq.${branchId}&select=id,is_active`
      );

      if (existing.length > 0) {
        if (existing[0].is_active) {
          return { success: false, error: 'El usuario ya tiene esta sucursal asignada' };
        }
        // Reactivar
        await pgFetch<unknown>(`/user_branches?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: true }),
        });
      } else {
        await pgFetch<unknown>('/user_branches', {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, branch_id: branchId, is_active: true }),
        });
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error asignando sucursal' };
    }
  },

  /** Desasigna una sucursal de un usuario (soft: pone is_active = false) */
  async removeBranchFromUser(userId: string, branchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await pgFetch<unknown>(`/user_branches?user_id=eq.${userId}&branch_id=eq.${branchId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false }),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Error desasignando sucursal' };
    }
  },
};
