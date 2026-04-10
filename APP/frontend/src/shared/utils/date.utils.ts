export const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return `Hoy, ${date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  }

 const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return `Ayer, ${date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  }
  
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatea una fecha en formato YYYY-MM-DD a DD/MM/YYYY
 * Evita problemas de zona horaria al no usar new Date()
 */
export const formatDateSafe = (dateString: string): string => {
  if (!dateString || typeof dateString !== 'string') {
    return 'Fecha inválida';
  }
  
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    return dateString; // Retorna el original si no es el formato esperado
  }
  
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

/**
 * Convierte una fecha ISO completa a formato YYYY-MM-DD (solo fecha)
 * Ej: "2025-09-03T14:30:00.000Z" → "2025-09-03"
 */
export const extractDateFromISO = (isoString: string): string => {
  if (!isoString) return '';
  return isoString.split('T')[0];
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (zona horaria local)
 */
export const getCurrentDateSafe = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};