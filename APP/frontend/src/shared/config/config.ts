// App configuration — PostgREST architecture
export const config = {
  // Modo de la aplicación: 'cloud' usa PostgREST
  APP_MODE: 'cloud' as const,

  // Configuración de la aplicación
  APP: {
    NAME: 'FalconApp',
    VERSION: '1.0.10',
  },

  // Configuración de tokens
  TOKEN: {
    STORAGE_KEY: 'falcon_token',
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos en ms
  },

  // API PostgREST
  API: {
    BASE_URL: import.meta.env.VITE_API_URL as string,
  },
};
