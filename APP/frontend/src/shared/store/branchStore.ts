import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '../types/Branch';

interface BranchState {
  /** Sucursales asignadas al usuario autenticado */
  branches: Branch[];
  /** Sucursal actualmente seleccionada/activa */
  currentBranch: Branch | undefined;
}

interface BranchActions {
  /** Carga la lista de sucursales del usuario y auto-selecciona si sólo hay una */
  setBranches: (branches: Branch[]) => void;
  /** Cambia la sucursal activa manualmente */
  setCurrentBranch: (branch: Branch) => void;
  /** Limpia el store al cerrar sesión */
  clearBranches: () => void;
}

export const useBranchStore = create<BranchState & BranchActions>()(
  persist(
    (set) => ({
      branches: [],
      currentBranch: undefined,

      setBranches: (branches) => {
        set((state) => {
          // Si la sucursal actual ya no está en la nueva lista, resetearla
          const stillValid = branches.find((b) => b.id === state.currentBranch?.id);
          const autoSelected = branches.length === 1 ? branches[0] : stillValid ?? (branches.length > 0 ? branches[0] : undefined);
          return { branches, currentBranch: autoSelected };
        });
      },

      setCurrentBranch: (branch) => set({ currentBranch: branch }),

      clearBranches: () => set({ branches: [], currentBranch: undefined }),
    }),
    {
      name: 'falcon_branch',
      // Solo persistir la sucursal actual para restaurar la selección entre sesiones
      partialize: (state) => ({ currentBranch: state.currentBranch }),
    }
  )
);
