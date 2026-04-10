import { useState, useEffect } from 'react';

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  error: string | null;
  lastSyncType: 'manual' | 'automatic';
  formattedLastSync: string;
  forceSyncronization: () => Promise<void>;
}

export const useSyncStatus = (): SyncStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    lastSyncTime: null,
    isSyncing: false,
    error: null,
    lastSyncType: 'automatic',
    formattedLastSync: 'N/A',
    forceSyncronization: async () => {},
  };
};
