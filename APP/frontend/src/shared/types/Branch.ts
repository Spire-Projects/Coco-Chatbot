// Representa una sucursal del sistema (tabla `branches` en PostgreSQL)
export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  salePrefix: string;   // prefijo para numeración de ventas (ej: 'AMER', 'TARJ')
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

// Representa la relación usuario ↔ sucursal (tabla `user_branches`)
export interface UserBranch {
  id: string;
  userId: string;
  branchId: string;
  isActive: boolean;
  branch?: Branch;
}

// Forma que devuelve PostgREST (snake_case)
export interface RawBranch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active: boolean;
  sale_prefix?: string | null;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface RawUserBranch {
  id: string;
  user_id: string;
  branch_id: string;
  is_active: boolean;
  branches?: RawBranch;
}

/** Convierte la fila raw de la DB al tipo de dominio */
export function mapBranch(raw: RawBranch): Branch {
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address ?? undefined,
    phone: raw.phone ?? undefined,
    isActive: raw.is_active,
    salePrefix: raw.sale_prefix ?? '',
    createdAt: raw.created_at,
    createdBy: raw.created_by ?? undefined,
    updatedAt: raw.updated_at,
    isDeleted: raw.is_deleted ?? false,
  };
}

export function mapUserBranch(raw: RawUserBranch): UserBranch {
  return {
    id: raw.id,
    userId: raw.user_id,
    branchId: raw.branch_id,
    isActive: raw.is_active,
    branch: raw.branches ? mapBranch(raw.branches) : undefined,
  };
}
