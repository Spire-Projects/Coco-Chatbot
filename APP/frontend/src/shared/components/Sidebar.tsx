// @ts-nocheck
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  FileText,
  LogOut,
  X,
  Book,
  Wrench,
  Building2,
  ChevronDown,
  Settings,
  Recycle,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { useAuthStore } from "../store/authStore";
import { useBranchStore } from "../store/branchStore";
import { Button } from "./ui/button";
import logo from "../../assets/logo.png"
import type { UserRole } from "../types/User";
import { useEffect, useMemo, memo, useCallback } from "react";

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  title: string;
  icon: any;
  href: string;
  color: string;
  roles?: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-white/90",
    roles: ["superadmin", "admin", "vendedor"],
  },
  {
    title: "Inventario",
    icon: Package,
    href: "/inventory",
    color: "text-white/90",
    roles: ["superadmin", "admin"],
  },
  {
    title: "Reacondicionamiento",
    icon: Recycle,
    href: "/reconditioning",
    color: "text-white/90",
    roles: ["superadmin", "admin"],
  },
  {
    title: "Ventas",
    icon: ShoppingBag,
    href: "/sales",
    color: "text-white/90",
    roles: ["superadmin", "admin", "vendedor"],
  },
  {
    title: "Compras",
    icon: ShoppingCart,
    href: "/purchases",
    color: "text-white/90",
    roles: ["superadmin", "admin"],
  },
  {
    title: "Clientes",
    icon: Users,
    href: "/clients",
    color: "text-white/90",
    roles: ["superadmin", "admin", "vendedor"],
  },
  {
    title: "Reportes",
    icon: FileText,
    href: "/reports",
    color: "text-white/90",
    roles: ["superadmin", "admin"],
  },
  {
    title: "Usuarios",
    icon: Users,
    href: "/users",
    color: "text-white/90",
    roles: ["superadmin", "admin"],
  },
  {
    title: "Arqueo de Caja",
    icon: Book,
    href: "/dailyCash",
    color: "text-white/90",
    roles: ["superadmin", "admin"],
  },
  {
    title: "Sucursales",
    icon: Building2,
    href: "/branches",
    color: "text-white/90",
    roles: ["superadmin"],
  },
  {
    title: "Configuración",
    icon: Settings,
    href: "/settings",
    color: "text-white/90",
    roles: ["superadmin", "admin"],
  },
  
];

export const Sidebar = memo(({ className, isOpen = true, onClose }: SidebarProps) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { branches, currentBranch, setCurrentBranch } = useBranchStore();

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Cerrar sidebar en cambio de ruta SOLO si está abierto en dispositivos móviles
  useEffect(() => {
    if (onClose && isOpen && window.innerWidth < 1024) {
      onClose();
    }
  }, [location.pathname]); // Removido onClose de las dependencias para evitar loops

  // Filtrar elementos del menú según el rol del usuario - memoizado
  const visibleMenuItems = useMemo(() => 
    menuItems.filter(
      (item) => !item.roles || (user && item.roles.includes(user.role))
    ), [user]);

  return (
    <>
      {/* Overlay para dispositivos móviles - solo cuando isOpen es true */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      <div
        className={cn(
          // En desktop: siempre visible y relativo
          // En mobile/tablet: fijo y con transform basado en isOpen
          "lg:relative lg:translate-x-0 lg:z-0",
          "fixed top-0 left-0 h-full z-50",
          "flex flex-col overflow-hidden bg-secondary border-r border-gray-200 shadow-sm",
          "w-64 transition-transform duration-300 ease-in-out",
          // En mobile/tablet: mostrar/ocultar basado en isOpen
          // En desktop: siempre visible
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Botón cerrar en móvil/tablet */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 lg:hidden z-10"
          >
            <X className="h-5 w-5 text-white/80" />
          </button>
        )}
        
        {/* Logo */}
        <div className="flex h-30 shrink-0 items-center px-5 border-b border-white/10">
          <div className="flex items-center justify-center w-full">
            <img
              src={logo}
              alt="Logo"
              className="h-30 p-1 w-auto object-contain"
              style={{ filter: "brightness(1.4)" }}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto px-3 py-4">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                      "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                      // Si está activo: fondo claro y texto oscuro para contraste.
                      isActive
                        ? "bg-white/90 text-gray-800 shadow-sm border-l-4 border-white/30 ml-0"
                        : // Por defecto sobre bg-secondary usamos texto claro y hover con fondo semitransparente
                          "text-white/90 hover:bg-white/10 hover:text-white ml-4"
                    )}
              >
                <Icon
                  className={cn(
                    "mr-3 h-5 w-5 shrink-0",
                        isActive ? "text-gray-800" : item.color
                  )}
                />
                    <p className={cn("truncate", isActive ? "text-gray-800" : "text-white/90")}>{item.title}</p>
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="shrink-0 border-t border-white/10 p-3 space-y-2">
          {/* Branch selector — only shown when user has branches */}
          {branches.length > 0 && (
            <div className="px-1">
              <p className="text-white/50 text-xs mb-1 font-medium tracking-wide uppercase">Sucursal</p>
              {branches.length === 1 ? (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5">
                  <Building2 className="h-4 w-4 text-white/60 shrink-0" />
                  <span className="text-sm text-white/80 truncate">{currentBranch?.name ?? branches[0].name}</span>
                </div>
              ) : (
                <div className="relative">
                  <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/50 pointer-events-none" />
                  <select
                    value={currentBranch?.id ?? ''}
                    onChange={(e) => {
                      const found = branches.find((b) => b.id === e.target.value);
                      if (found) setCurrentBranch(found);
                    }}
                    className="w-full bg-white/5 border border-white/10 text-white/80 text-sm rounded-md pl-8 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-gray-800 text-white">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="group flex w-full items-center justify-start px-3 py-2.5 text-white/90 font-medium rounded-lg hover:bg-white/10"
          >
            <LogOut className="h-5 w-5 mr-3 text-white/80 group-hover:text-white" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </>
  );
});
