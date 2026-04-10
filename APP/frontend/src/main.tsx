import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router";
import { Provider } from "react-redux";
import { store } from "./shared/store/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 min — datos frescos sin refetch
      gcTime:    1000 * 60 * 10,  // 10 min — caché en memoria
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
import { initSecurity } from "./shared/config/security";
import { registerSW } from "virtual:pwa-register";


// Mostrar información de configuración en desarrollo
import "./shared/utils/debug.utils";

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Nueva versión disponible. Por favor, recarga la página.');
    },
    onOfflineReady() {
      console.log('Aplicación lista para funcionar sin conexión.');
    },
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      console.log('Service Worker registrado:', swUrl);
      
      // Verificar actualizaciones cada hora
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: Error) {
      console.error('Error al registrar Service Worker:', error);
    }
  });
}


// Inicializar configuración de seguridad
try {
  initSecurity();
} catch (error) {
  console.error("Error crítico de seguridad:", error);
  // En modo deploy, no continuar si hay errores de seguridad
  if (import.meta.env.VITE_APP_MODE === "deploy") {
    throw error;
  }
}

// Suprimir warnings de extensiones del navegador (solo en desarrollo)
if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("runtime.lastError") ||
        message.includes("message port closed") ||
        message.includes("Extension context invalidated"))
    ) {
      return; // Suprimir estos warnings específicos
    }
    originalConsoleError.apply(console, args);
  };
}

// Inicializar base de datos y datos por defecto
async function initializeApp() {
  try {
    console.log("🔄 Inicializando aplicación...");
    console.log("✅ Aplicación inicializada correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error inicializando aplicación:", error);
    if (import.meta.env.VITE_APP_MODE === "deploy") {
      throw error;
    }
    return false;
  }
}

// Función principal que espera la inicialización antes de renderizar
async function main() {
  try {
    // Esperar a que la aplicación se inicialice completamente
    const initialized = await initializeApp();

    if (!initialized && import.meta.env.VITE_APP_MODE === "deploy") {
      throw new Error("Failed to initialize application");
    }

    // Solo renderizar React después de que todo esté listo
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </Provider>
        </QueryClientProvider>
      </StrictMode>
    );
  } catch (error) {
    // Mostrar error en la UI
    document.getElementById("root")!.innerHTML = `
      <div style="padding: 20px; text-align: center; color: red; font-family: Arial, sans-serif;">
        <h1>Error de Inicialización</h1>
        <p>No se pudo inicializar la aplicación.</p>
        <p>Por favor, recarga la página.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px;">
          Recargar
        </button>
      </div>
    `;
  }
}

// Ejecutar la función principal
main();
