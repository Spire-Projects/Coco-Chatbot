import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Custom hook para centralizar accesos a estados globales usados frecuentemente.
 * El tipo de cambio USD/Bs se maneja desde useExchangeRateStore.
 */
export const useGlobalStates = () => {
  // Auth desde Zustand
  const { user, isAuthenticated, isValidating: authLoading, logout, loadFromStorage } = useAuthStore();

  // Auth actions
  const loadUser = useCallback(() => loadFromStorage(), [loadFromStorage]);
  const doLogout = useCallback(() => logout(), [logout]);

  return useMemo(
    () => ({
      // auth state
      user,
      isAuthenticated,
      authLoading,
      // auth actions
      loadUser,
      doLogout,
    }),
    [user, isAuthenticated, authLoading, loadUser, doLogout]
  );
};

export default useGlobalStates;
