// Removed — Firestore conflict resolution not needed in PostgREST architecture
const processingDocuments = new Set<string>();
const lastUpdateTimes = new Map<string, number>();

/**
 * Verifica si un documento está siendo procesado actualmente
 */
export const isDocumentBeingProcessed = (documentId: string): boolean => {
  return processingDocuments.has(documentId);
};

/**
 * Marca un documento como en proceso
 */
export const markDocumentAsProcessing = (documentId: string): void => {
  processingDocuments.add(documentId);
  // Auto-limpiar después de 5 segundos (reducido desde 30) para evitar bloqueos largos
  setTimeout(() => {
    processingDocuments.delete(documentId);
  }, 5000);
};

/**
 * Desmarca un documento como en proceso
 */
export const unmarkDocumentAsProcessing = (documentId: string): void => {
  processingDocuments.delete(documentId);
};

/**
 * Verifica si un documento fue actualizado recientemente (cooldown de 1 segundo)
 */
export const wasRecentlyUpdated = (documentId: string): boolean => {
  const lastUpdate = lastUpdateTimes.get(documentId);
  if (!lastUpdate) return false;
  
  const cooldownPeriod = 1000; // 1 segundo (reducido desde 2)
  return Date.now() - lastUpdate < cooldownPeriod;
};

/**
 * Registra que un documento fue actualizado
 */
export const recordDocumentUpdate = (documentId: string): void => {
  lastUpdateTimes.set(documentId, Date.now());
  
  // Limpiar entradas antigas para evitar memory leaks
  setTimeout(() => {
    lastUpdateTimes.delete(documentId);
  }, 60000); // Limpiar después de 1 minuto
};

/**
 * Compara dos documentos para ver si son funcionalmente idénticos
 * (ignorando campos de metadata de RxDB, pero manteniendo campos de datos reales)
 */
export const areDocumentsFunctionallyEqual = (doc1: any, doc2: any): boolean => {
  // Campos a ignorar en la comparación - SOLO metadata de RxDB y sincronización
  const fieldsToIgnore = [
    '_rev',
    '_deleted', 
    '_meta',
    '_lastSyncedAt',
    '_serverUpdatedAt',
    'serverTimestamp',
    '_forceLocalPriority',
    '_attachments'
    // NO ignorar updatedAt, _lastModifiedAt, createdAt - estos son datos importantes
  ];
  
  // Crear copias limpias para comparación
  const clean1 = { ...doc1 };
  const clean2 = { ...doc2 };
  
  fieldsToIgnore.forEach(field => {
    delete clean1[field];
    delete clean2[field];
  });
  
  // Agregar logs para debugging
  console.log(`🔍 ConflictResolver: Comparando documentos funcionalmente:`, {
    doc1_clean: clean1,
    doc2_clean: clean2
  });
  
  // Comparar como JSON para una comparación profunda
  const json1 = JSON.stringify(clean1, Object.keys(clean1).sort());
  const json2 = JSON.stringify(clean2, Object.keys(clean2).sort());
  
  const areEqual = json1 === json2;
  console.log(`🔍 ConflictResolver: ¿Son funcionalmente iguales? ${areEqual}`);
  
  return areEqual;
};

/**
 * Limpia todas las caches (útil para testing)
 */
export const clearConflictResolverCache = (): void => {
  processingDocuments.clear();
  lastUpdateTimes.clear();
};
