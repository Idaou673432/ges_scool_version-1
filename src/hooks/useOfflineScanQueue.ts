import { useState, useEffect, useCallback } from 'react';
import { 
  offlineScanQueueService, 
  QueuedScanItem 
} from '../services/offlineScanQueue';
import { AttendanceRecord } from '../types';

export function useOfflineScanQueue() {
  const [queue, setQueue] = useState<QueuedScanItem[]>(() => offlineScanQueueService.getQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ syncedCount: number; failedCount: number } | null>(null);

  useEffect(() => {
    // Subscribe to queue updates
    const unsubscribe = offlineScanQueueService.subscribe((updatedQueue) => {
      setQueue(updatedQueue);
    });
    return unsubscribe;
  }, []);

  const pendingCount = queue.filter(item => item.syncStatus === 'QUEUED' || item.syncStatus === 'FAILED').length;

  const syncNow = useCallback(async (onAttendanceSynced?: (record: Partial<AttendanceRecord>) => void) => {
    setIsSyncing(true);
    try {
      const res = await offlineScanQueueService.syncQueue(onAttendanceSynced);
      setLastSyncResult(res);
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const removeScan = useCallback((id: string) => {
    offlineScanQueueService.removeScan(id);
  }, []);

  const clearSynced = useCallback(() => {
    offlineScanQueueService.clearSynced();
  }, []);

  const clearAll = useCallback(() => {
    offlineScanQueueService.clearAll();
  }, []);

  return {
    queue,
    pendingCount,
    isSyncing,
    lastSyncResult,
    syncNow,
    removeScan,
    clearSynced,
    clearAll
  };
}
