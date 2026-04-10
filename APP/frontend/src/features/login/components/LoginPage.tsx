import { useState } from "react";
import { Navigate } from "react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logoImage from "../../../assets/logo.png";

import { Button } from "../../../shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../shared/components/ui/card";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { AuthService } from "../../../shared/services/AuthService";
import { useAuthStore } from "../../../shared/store/authStore";

export const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { isAuthenticated, loginSuccess } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await AuthService.login(formData);

      if (response) {
        loginSuccess(response.user, response.token);
      } else {
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }
    } catch {
      setError("Error de conexión. Por favor, inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="mx-auto max-w-sm w-full !bg-secondary !gap-3">
        <CardHeader className="text-center text-white">
          <div className="flex justify-center mb-0">
            <img src={logoImage} alt="Somos total Logo" className="h-24 w-auto" />
          </div>
          
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Credenciales de prueba */}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                required
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={isLoading}
                className="!bg-white text-gray-900 placeholder-gray-400 border border-white/40 focus:border-primary-600 focus:ring-2 focus:ring-primary-200" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="bg-white text-gray-900 placeholder-gray-400 border border-white/40 focus:border-primary-600 focus:ring-2 focus:ring-primary-200" 
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-white/80"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="text-primary" size={16} /> : <Eye className="text-primary" size={16} />}
                </Button>
              </div>
            </div>

            {error && (
              <div
                className="bg-red-600/90 text-white px-4 py-3 rounded-md relative"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-green-100 text-gray-900 hover:bg-gray-100 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    
    </div>
  );
};
