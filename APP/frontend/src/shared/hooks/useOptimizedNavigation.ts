import { useLocation } from 'react-router';
import { useMemo } from 'react';

/**
 * Hook optimizado para navegación que evita renders innecesarios
 * Solo recalcula cuando cambia la ruta actual
 */
export const useOptimizedNavigation = () => {
  const location = useLocation();

  // Mapeo de rutas a nombres de sección - memoizado
  const sectionNames: Record<string, string> = useMemo(() => ({
    "/dashboard": "Dashboard",
    "/inventory": "Inventario", 
    "/sales": "Ventas",
    "/purchases": "Compras",
    "/clients": "Clientes",
    "/reports": "Reportes",
    "/users": "Usuarios",
    "/dailyCash": "Arqueo de Caja",
    "/settings": "Configuración",
  }), []);

  // Obtener el nombre de la sección actual - memoizado
  const currentSectionName = useMemo(() => {
    return sectionNames[location.pathname] || "Dashboard";
  }, [location.pathname, sectionNames]);

  // Determinar si estamos en una página que requiere carga pesada
  const isHeavyPage = useMemo(() => {
    const heavyPages = ['/inventory', '/sales', '/purchases', '/users', '/reports'];
    return heavyPages.includes(location.pathname);
  }, [location.pathname]);

  return {
    currentPath: location.pathname,
    currentSectionName,
    isHeavyPage,
    sectionNames
  };
};
