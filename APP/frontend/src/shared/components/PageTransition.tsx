import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  duration?: number;
}

/**
 * Componente de transición muy ligero que no bloquea la navegación
 */
export const PageTransition = ({ children, duration = 100 }: PageTransitionProps) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Solo hacer un fade muy sutil, sin delay
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, duration / 4); // Duración muy corta

    return () => clearTimeout(timer);
  }, [location.pathname, duration]);

  return (
    <div 
      className={`transition-opacity duration-75 ${
        isVisible ? 'opacity-100' : 'opacity-95'
      }`}
    >
      {children}
    </div>
  );
};
