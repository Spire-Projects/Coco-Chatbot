// Cache global para entidades frecuentemente accedidas
const entityCache = new Map<string, { value: any; timestamp: number }>();

// Tiempo de expiración del cache (5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Obtener valor del cache
 */
export const getCachedValue = <T>(key: string): T | null => {
  const cached = entityCache.get(key);
  if (!cached) return null;

  // Verificar si el cache expiró
  if (Date.now() - cached.timestamp > CACHE_EXPIRATION) {
    entityCache.delete(key);
    return null;
  }

  return cached.value as T;
};

/**
 * Guardar valor en cache
 */
export const setCachedValue = <T>(key: string, value: T): void => {
  entityCache.set(key, {
    value,
    timestamp: Date.now()
  });
};

/**
 * Limpiar cache completo o por prefijo
 */
export const clearCache = (prefix?: string): void => {
  if (!prefix) {
    entityCache.clear();
    return;
  }

  // Limpiar solo las entradas que coincidan con el prefijo
  for (const key of entityCache.keys()) {
    if (key.startsWith(prefix)) {
      entityCache.delete(key);
    }
  }
};