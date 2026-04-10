import { Outlet, Navigate } from 'react-router';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../store/authStore';
// import { PageTransition } from './PageTransition'; // Removido para mayor velocidad
// import { usePrefetchHeavyPages } from '../hooks/usePrefetchHeavyPages'; // Temporalmente desactivado
import { useState, useCallback, memo } from 'react';
import { useBranchStore } from '../store/branchStore';

export const MainLayout = memo(() => {
  const { isAuthenticated } = useAuthStore();
  const { currentBranch } = useBranchStore();
  // En móvil/tablet el sidebar empieza cerrado, en desktop no importa porque siempre está visible
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Temporalmente desactivado - puede estar causando lentitud
  // usePrefetchHeavyPages();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar} 
      />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto px-2 py-2 sm:px-4 sm:py-4 md:px-6 md:py-6">
          <div className="h-full">
            <Outlet key={currentBranch?.id ?? 'no-branch'} />
          </div>
        </main>
      </div>
    </div>
  );
});
