import { Routes, Route, Navigate } from 'react-router';
import { Suspense, lazy } from 'react';
import { MainLayout } from '../shared/components/MainLayout';
import { LoginPage } from '../features/login/components/LoginPage';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { SalesPage } from '../features/sales/views/SalesPage';
import { ClientsPage } from '../features/clients/components/ClientsPage';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../shared/store/authStore';
import { InventoryPage } from '@/features/inventory/views/InventoryPage';
import { ReparationPage } from '@/features/reparation/views/ReparationPage';
const ReconditioningPage = lazy(() => import('@/features/reconditioning/views/ReconditioningPage').then(m => ({ default: m.ReconditioningPage })));

// Lazy loading solo para páginas menos críticas
const UserManager = lazy(() => import('../features/users/views/UserManager').then(module => ({ default: module.UserManager })));
const PurchasesPage = lazy(() => import('../features/purchases/views/PurchasesPage').then(module => ({ default: module.PurchasesPage })));
const ReportsPage = lazy(() => import('../features/reports/views/ReportsPage').then(module => ({ default: module.ReportsPage })));
const DailyCashClosuresPage = lazy(() => import('@/features/dailyCashClosure/views/DayliCashClosurePage').then(module => ({ default: module.DailyCashClosuresPage })));
const BranchManager = lazy(() => import('../features/branches/views/BranchManager').then(module => ({ default: module.BranchManager })));
const SettingsPage = lazy(() => import('../features/settings').then(module => ({ default: module.SettingsPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

export const AppRoutes = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Accesible para admin, superadmin y vendedor */}
        <Route path="dashboard" element={<ProtectedRoute allowedRoles={["superadmin", "admin", "vendedor"]}><DashboardPage /></ProtectedRoute>} />
        <Route path="sales" element={<ProtectedRoute allowedRoles={["superadmin", "admin", "vendedor"]}><SalesPage /></ProtectedRoute>} />
        <Route path="clients" element={<ProtectedRoute allowedRoles={["superadmin", "admin", "vendedor"]}><ClientsPage /></ProtectedRoute>} />
        <Route path="reparations" element={<ProtectedRoute allowedRoles={["superadmin", "admin", "vendedor"]}><ReparationPage /></ProtectedRoute>} />
        <Route path="reconditioning" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><Suspense fallback={<PageLoader />}><ReconditioningPage /></Suspense></ProtectedRoute>} />

        {/* Solo admin y superadmin */}
        <Route path="inventory" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><InventoryPage /></ProtectedRoute>} />
        <Route path="purchases" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><Suspense fallback={<PageLoader />}><PurchasesPage /></Suspense></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><Suspense fallback={<PageLoader />}><ReportsPage /></Suspense></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><Suspense fallback={<PageLoader />}><UserManager /></Suspense></ProtectedRoute>} />
        <Route path="dailyCash" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><Suspense fallback={<PageLoader />}><DailyCashClosuresPage /></Suspense></ProtectedRoute>} />
        <Route path="branches" element={<ProtectedRoute allowedRoles={["superadmin"]}><Suspense fallback={<PageLoader />}><BranchManager /></Suspense></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
