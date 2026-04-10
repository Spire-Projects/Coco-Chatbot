import { create } from 'zustand';
import type { AuthUser } from '../types/User';
import { AuthService } from '../services/AuthService';
import { BranchService } from '../services/BranchService';
import { useBranchStore } from './branchStore';
import { useExchangeRateStore } from './exchangeRateStore';
import { setUnauthorizedHandler } from '../api/client';

// Loads branches for a user and syncs to branchStore (fire and forget)
async function syncBranchesForUser(userId: string) {
  const result = await BranchService.getBranchesByUser(userId);
  if (result.success) {
    const branches = result.items
      .filter((ub) => ub.isActive && ub.branch && !ub.branch.isDeleted && ub.branch.isActive)
      .map((ub) => ub.branch!);
    useBranchStore.getState().setBranches(branches);
  }
}

function performLogout(set: (partial: Partial<AuthState>) => void) {
  AuthService.logout();
  useBranchStore.getState().clearBranches();
  useExchangeRateStore.getState().clearRate();
  set({ user: null, token: null, isAuthenticated: false, isValidating: false });
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isValidating: boolean;
}

interface AuthActions {
  loginSuccess: (user: AuthUser, token: string) => void;
  logout: () => void;
  /** Carga sesión desde localStorage sin validar contra la API */
  loadFromStorage: () => void;
  setValidating: (val: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isValidating: false,

  loginSuccess: (user, token) => {
    set({ user, token, isAuthenticated: true, isValidating: false });
    syncBranchesForUser(user.id);
    useExchangeRateStore.getState().fetchRate();
    // When the 401 refresh cycle fails, auto-logout
    setUnauthorizedHandler(() => performLogout(set));
  },

  logout: () => {
    performLogout(set);
  },

  loadFromStorage: () => {
    set({ isValidating: true });
    const session = AuthService.loadUserFromStorage();
    if (session) {
      set({
        user: session.user,
        token: session.token,
        isAuthenticated: true,
        isValidating: false,
      });
      syncBranchesForUser(session.user.id);
      useExchangeRateStore.getState().fetchRate();
      // Also register handler for sessions restored from localStorage
      setUnauthorizedHandler(() => performLogout(set));
    } else {
      set({ isValidating: false });
    }
  },

  setValidating: (val) => set({ isValidating: val }),
}));
