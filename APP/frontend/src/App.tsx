import { useEffect, useCallback, useRef } from "react";
import { Toaster, toast } from "sonner";
import { AppRoutes } from "./routes/AppRoutes";
import { useAuthStore } from "./shared/store/authStore";


function App() {
  const { user, isAuthenticated, isValidating, loadFromStorage } = useAuthStore();
  const isInitialized = useRef(false);
  const lastValidationTime = useRef<number>(0);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible" && isAuthenticated && user) {
      const now = Date.now();
      if (now - lastValidationTime.current > 20000) {
        lastValidationTime.current = now;
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      console.log("✅ Aplicación inicializada correctamente");
      loadFromStorage();
    }
  }, [loadFromStorage]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated && !isValidating) {
      toast.warning("Sesión cerrada", {
        duration: 5000,
      });
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isValidating]);

  return (
    <div>
      {isValidating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center py-1 text-sm">
          Validando sesión...
        </div>
      )}
      <AppRoutes />
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </div>
  );
}

export default App;

