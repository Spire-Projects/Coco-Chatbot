import { useAuthStore } from "../store/authStore";
import { Menu, Building2, DollarSign } from "lucide-react";
import { useOptimizedNavigation } from "../hooks/useOptimizedNavigation";
import { memo } from "react";
import { useBranchStore } from "../store/branchStore";
import { useExchangeRateStore } from "../store/exchangeRateStore";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header = memo(({ onToggleSidebar }: HeaderProps) => {
  const { user } = useAuthStore();
  const { currentSectionName } = useOptimizedNavigation();
  const { currentRate } = useExchangeRateStore();
  const { branches, currentBranch, setCurrentBranch } = useBranchStore();



  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 shadow-sm">
      <div className="flex justify-between items-center">
        {user && (
          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Botón menú para móviles */}
              {onToggleSidebar && (
                <button
                  onClick={onToggleSidebar}
                  className="p-2 -ml-1 sm:-ml-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 lg:hidden"
                  aria-label="Menú"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}

              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate flex-1 min-w-0">
                {currentSectionName}
              </h2>
            </div>

            {/* Right side - Notifications and User Info */}
              <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
              <div className="hidden md:flex flex-col items-center border px-4 py-0.5 rounded-2xl gap-0">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-gray-900">Tipo de cambio</span>
                </div>
                <span className="text-xs text-gray-500">
                  1 USD = {currentRate.toFixed(2)} Bs
                </span>
              </div>

              {/* Branch selector */}
              {branches.length > 0 && (
                <div className="flex items-center gap-1.5 border rounded-xl px-3 py-1">
                  <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                  {branches.length === 1 ? (
                    <span className="text-sm font-medium text-gray-800 hidden sm:block">
                      {currentBranch?.name ?? branches[0].name}
                    </span>
                  ) : (
                    <select
                      value={currentBranch?.id ?? ''}
                      onChange={(e) => {
                        const found = branches.find((b) => b.id === e.target.value);
                        if (found) setCurrentBranch(found);
                      }}
                      className="text-sm font-medium text-gray-800 bg-transparent outline-none cursor-pointer max-w-[140px]"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200">
                {/* Desktop/Tablet: Mostrar nombre completo */}
                <div className="hidden sm:block text-sm text-right">
                  <div className="font-medium text-gray-900 text-xs sm:text-sm">
                    {user.fullName}
                  </div>
                  <div className="text-gray-500 capitalize text-xs">
                    {user.role}
                  </div>
                </div>

                {/* Mobile: Solo mostrar inicial y chevron */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {user.fullName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                 
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
});
