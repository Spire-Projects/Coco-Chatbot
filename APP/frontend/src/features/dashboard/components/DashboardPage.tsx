import { useAuthStore } from "../../../shared/store/authStore";
import { Link } from "react-router";
import { useSyncStatus } from "@/shared/hooks/useSyncStatus";
import { BarChart2, Info, Package, Plus, RefreshCw, User, Users, Wifi, WifiOff } from "lucide-react";

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { 
    isOnline, 
    lastSyncTime, 
    isSyncing, 
    lastSyncType,
    formattedLastSync,
    forceSyncronization 
  } = useSyncStatus();



  return (
    <div className="space-y-6">
      <div>
        <div className="bg-white p-6 rounded-lg border shadow-xs mb-6">
          <p className="text-2xl font-bold text-gray-900 mb-4 !mb-1">
            Bienvenido, {user?.fullName}
          </p>
          <p className="text-gray-700">
            Gestiona tus productos de manera eficiente y moderna
          </p>
        </div>
        <div className="space-y-6">
          {/* Acciones Rápidas arriba ocupando todo el ancho */}
          <div className="bg-white border  rounded-lg p-4 shadow-xs">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-full p-2 mr-2">
                <Plus className="text-green-500 w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-black">Acciones Rápidas</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            

              <Link to={"/sales"} className="flex items-center p-4 bg-white rounded-xl border border-blue-100 hover:bg-blue-50 transition group">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <Plus className="text-green-500 w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 group-hover:text-green-600">Nueva Venta</div>
                  <div className="text-sm text-gray-500">Procesar venta</div>
                </div>
              </Link>
               {user?.role === 'vendedor' && (
               <Link to={"/clients"} className="flex items-center p-4 bg-white rounded-xl border border-blue-100 hover:bg-blue-50 transition group">
                <div className="bg-orange-100 rounded-full p-2 mr-3">
                  <BarChart2 className="text-orange-500 w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 group-hover:text-orange-600">Clientes</div>
                  <div className="text-sm text-gray-500">Ver clientes</div>
                </div>
              </Link>
              )}
              {(user?.role === 'admin' || user?.role === 'superadmin') && (
               <Link to={"/reports"} className="flex items-center p-4 bg-white rounded-xl border border-blue-100 hover:bg-blue-50 transition group">
                <div className="bg-orange-100 rounded-full p-2 mr-3">
                  <BarChart2 className="text-orange-500 w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 group-hover:text-orange-600">Reportes</div>
                  <div className="text-sm text-gray-500">Ver estadísticas</div>
                </div>
              </Link>
              )}

              {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <Link to="/users" className="flex items-center p-4 bg-white rounded-xl border border-blue-100 hover:bg-blue-50 transition group">
                <div className="bg-purple-100 rounded-full p-2 mr-3">
                  <Users className="text-purple-500 w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 group-hover:text-purple-600">Gestión de Usuarios</div>
                  <div className="text-sm text-gray-500">Administrar usuarios</div>
                </div>
              </Link>
              )}

                {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <Link to={"/inventory"} className="flex items-center p-4 bg-white rounded-xl border border-blue-100  hover:bg-blue-50 transition group">
                <div className="bg-blue-100 rounded-full p-2 mr-3">
                  <Package className="text-blue-500 w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800 group-hover:text-blue-600">Ver Inventario</div>
                  <div className="text-sm text-gray-500">Gestiona el inventario</div>
                </div>
              </Link>
              )}
             
            </div>
          </div>

          {/* Tu información y Estado del Sistema en grid de 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tu información */}
            <div className="bg-white border shadow-xs rounded-lg p-4">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 rounded-full p-2 mr-2">
                  <User className="text-blue-500 w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-black">Tu Información</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex flex-row justify-between"><span className="text-gray-500">Email:</span> {user?.email}</p>
                <p className="flex flex-row justify-between"><span className="text-gray-500">Rol:</span> <span className="capitalize">{user?.role}</span></p>
                <p className="flex flex-row justify-between"><span className="text-gray-500">Estado:</span><p className={`${user?.active ? 'text-green-500' : 'text-red-500'}`}> {user?.active ? 'Activo' : 'Inactivo'} </p></p>
                <p className="flex flex-row justify-between"><span className="text-gray-500">Registro:</span> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {/* Estado del Sistema */}
            <div className="bg-white border shadow-xs rounded-lg p-4">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 rounded-full p-2 mr-2">
                  <Info className="text-orange-500 w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-black">Estado del Sistema</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="h-4 w-4 text-green-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                    Conexión:
                  </span>
                  <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Última sincronización:</span>
                  <div className="text-right">
                    <div className={lastSyncTime ? 'text-gray-700' : 'text-orange-600'}>
                      {formattedLastSync}
                    </div>
                    {lastSyncTime && (
                      <div className="text-xs text-gray-500">
                        {lastSyncType === 'manual' ? '🔄 Manual' : '⚡ Automática'}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={forceSyncronization}
                  disabled={isSyncing || !isOnline}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
