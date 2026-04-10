export const useForceSynchronization = () => ({
  isSyncing: false,
  lastSyncTime: null as Date | null,
  syncStatus: {} as Record<string, unknown>,
  forceFullSync: async () => {},
  forceCollectionSync: async (_: string) => {},
  checkSyncStatus: async () => ({}),
  resolvePendingSync: async () => {},
});

export const SyncStatusComponent = () => null;
