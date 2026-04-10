// Utilidad para limpiar completamente la base de datos
export const clearAllData = async () => {
  try {
    console.log('🧹 Limpiando toda la base de datos...');
    
    // Limpiar localStorage
    localStorage.clear();
    
    // Limpiar sessionStorage
    sessionStorage.clear();
    
    // Limpiar IndexedDB
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases.map(db => {
          if (db.name) {
            return new Promise<void>((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(db.name!);
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => reject(deleteReq.error);
            });
          }
          return Promise.resolve();
        })
      );
    }
    
    console.log('✅ Base de datos limpiada completamente');
    console.log('🔄 Recarga la página para reinicializar');
    
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  }
};

// Agregar función global para debug
if (import.meta.env.DEV) {
  (window as any).clearAllData = clearAllData;
  console.log('🛠️ Función disponible: clearAllData() - para limpiar toda la BD');
}
