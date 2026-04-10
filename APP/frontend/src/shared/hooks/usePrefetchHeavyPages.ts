import { useEffect } from 'react';
import { useOptimizedNavigation } from './useOptimizedNavigation';

/**
 * Hook que prefetch las páginas pesadas cuando el usuario está en dashboard
 * Esto mejora la experiencia de navegación
 */
export const usePrefetchHeavyPages = () => {
  const { currentPath, isHeavyPage } = useOptimizedNavigation();

  useEffect(() => {
    // Solo hacer prefetch si estamos en dashboard y no en una página pesada
    if (currentPath === '/dashboard' && !isHeavyPage) {
      const prefetchPages = async () => {
        try {
          // Prefetch las páginas más usadas con un delay escalonado
          const heavyImports = [
            () => import('../../features/inventory/views/InventoryPage'),
            () => import('../../features/sales/views/SalesPage'),
            () => import('../../features/clients/components/ClientsPage'),
          ];

          // Ejecutar imports con delay para no bloquear el thread principal
          for (let i = 0; i < heavyImports.length; i++) {
            setTimeout(() => {
              heavyImports[i]().catch(() => {
                // Ignorar errores de prefetch
              });
            }, i * 500); // 500ms entre cada prefetch
          }
        } catch (error) {
          // Ignorar errores de prefetch
          console.debug('Prefetch failed:', error);
        }
      };

      // Empezar prefetch después de 2 segundos en dashboard
      const timeoutId = setTimeout(prefetchPages, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentPath, isHeavyPage]);
};
