import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { dbService } from './db';
import { useConfigStore } from '../store/configStore';
import { useAuthStore } from '../store/authStore';
import { applyBranding } from './branding';
import type { PosConfig } from '@vibe-pos/config-schema';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type SyncTrigger =
  | 'manual'
  | 'auto_interval'
  | 'auto_retry'
  | 'idle'
  | 'shift_close'
  | 'online_resume';

export interface SyncAuditEntry {
  id: string;
  timestamp: string;
  trigger: SyncTrigger;
  recordsCount: number;
  status: 'success' | 'failed';
  error?: string;
  durationMs: number;
  configVersion?: number;
}

interface SyncState {
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  lastError: string | null;
  syncHistory: SyncAuditEntry[];
  setSyncing: (isSyncing: boolean) => void;
  setOnline: (isOnline: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastError: (error: string | null) => void;
  recordAudit: (entry: SyncAuditEntry) => void;
  clearHistory: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isSyncing: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSyncTime: null,
      pendingCount: 0,
      lastError: null,
      syncHistory: [],
      setSyncing: (isSyncing) => set({ isSyncing }),
      setOnline: (isOnline) => set({ isOnline }),
      setPendingCount: (pendingCount) => set({ pendingCount }),
      setLastError: (lastError) => set({ lastError }),
      recordAudit: (entry) =>
        set((s) => ({
          syncHistory: [entry, ...s.syncHistory.slice(0, 49)], // keep last 50
        })),
      clearHistory: () => set({ syncHistory: [] }),
    }),
    {
      name: 'vibe-pos-sync-state',
      partialize: (s) => ({
        lastSyncTime: s.lastSyncTime,
        syncHistory: s.syncHistory,
      }),
    }
  )
);

let retryTimeoutId: any = null;
let retryCount = 0;
let lastUserActivityTime = Date.now();
let isIdleSyncTriggered = false;

export const syncEngine = {
  // Update the pending queue count from local SQLite / web adapter
  async refreshPendingCount(): Promise<number> {
    try {
      const count = await dbService.getPendingCount();
      useSyncStore.getState().setPendingCount(count);
      return count;
    } catch {
      return 0;
    }
  },

  // Main synchronization routine
  async triggerSync(
    trigger: SyncTrigger = 'manual'
  ): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    const store = useSyncStore.getState();
    if (store.isSyncing) {
      return { success: false, syncedCount: 0, error: 'Sync already in progress' };
    }

    const config = useConfigStore.getState().config;
    const customerId = config?.customerId;
    const token = useAuthStore.getState().terminalToken;

    if (!customerId) {
      return { success: false, syncedCount: 0, error: 'Terminal not configured' };
    }

    store.setSyncing(true);
    store.setLastError(null);
    const startTime = Date.now();

    try {
      // 1. Fetch pending records from local DB
      const pendingItems = await dbService.getPendingSyncRecords(250);
      const recordsToPush = pendingItems.map((item) => {
        let parsedData: unknown = {};
        try {
          parsedData = JSON.parse(item.payload);
        } catch {
          parsedData = { raw: item.payload };
        }
        return {
          tableName: item.tableName,
          recordId: item.recordId,
          operation: item.operation,
          data: parsedData,
        };
      });

      // 2. Perform network push or status poll
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let serverResponse: {
        syncedRecordsCount: number;
        configVersion: number;
        licenseStatus: string;
        serverTime: string;
      };

      if (recordsToPush.length > 0) {
        const res = await axios.post(
          `${API_URL}/sync/push`,
          { records: recordsToPush, trigger },
          { headers, timeout: 12000 }
        );
        serverResponse = res.data;

        // Mark items as synced locally
        const syncedIds = pendingItems.map((p) => p.id);
        await dbService.markRecordsSynced(syncedIds);
      } else {
        // No pending items — ping sync status to verify cloud license and check for config version updates
        try {
          const res = await axios.get(`${API_URL}/sync/status/${customerId}`, {
            headers,
            timeout: 8000,
          });
          serverResponse = {
            syncedRecordsCount: 0,
            configVersion: res.data.configVersion,
            licenseStatus: res.data.licenseStatus,
            serverTime: res.data.serverTime,
          };
        } catch {
          // If status endpoint isn't authenticated yet (e.g. demo mode), assume current config
          serverResponse = {
            syncedRecordsCount: 0,
            configVersion: config.version,
            licenseStatus: config.licenseStatus,
            serverTime: new Date().toISOString(),
          };
        }
      }

      // 3. Hot-Reload: Check if server config version has incremented
      if (serverResponse.configVersion > config.version && token) {
        try {
          const configRes = await axios.get(`${API_URL}/config/${customerId}`, {
            headers,
            timeout: 8000,
          });
          const freshConfig = configRes.data.config as PosConfig;
          if (freshConfig) {
            useConfigStore.getState().setConfig(freshConfig);
            applyBranding(freshConfig.branding);
            console.log(`[SyncEngine] Hot-reloaded configuration to version ${freshConfig.version}`);
          }
        } catch (confErr) {
          console.warn('[SyncEngine] Failed to hot-reload updated config profile:', confErr);
        }
      }

      // 4. Update License Status if modified on server
      if (
        serverResponse.licenseStatus &&
        serverResponse.licenseStatus !== config.licenseStatus
      ) {
        useConfigStore.getState().setConfig({
          ...config,
          licenseStatus: serverResponse.licenseStatus as any,
        });
      }

      // 5. Update Local Telemetry & Queue
      const remainingPending = await dbService.getPendingCount();
      store.setPendingCount(remainingPending);
      store.setOnline(true);
      useSyncStore.setState({ lastSyncTime: serverResponse.serverTime || new Date().toISOString() });

      const audit: SyncAuditEntry = {
        id: `sync_${Date.now()}`,
        timestamp: new Date().toISOString(),
        trigger,
        recordsCount: recordsToPush.length,
        status: 'success',
        durationMs: Date.now() - startTime,
        configVersion: serverResponse.configVersion,
      };
      store.recordAudit(audit);

      // Reset exponential backoff on success
      retryCount = 0;
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }

      return { success: true, syncedCount: recordsToPush.length };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isNetworkError =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('Network Error');

      if (isNetworkError) {
        store.setOnline(false);
      }

      const errMsg =
        err.response?.data?.error || err.message || 'Unknown synchronization error';
      store.setLastError(errMsg);

      const audit: SyncAuditEntry = {
        id: `sync_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        trigger,
        recordsCount: 0,
        status: 'failed',
        error: errMsg,
        durationMs,
      };
      store.recordAudit(audit);

      // Exponential backoff with jitter (max 45s)
      retryCount++;
      const backoffMs = Math.min(
        45000,
        Math.floor(2500 * Math.pow(1.6, Math.min(retryCount, 6)) + Math.random() * 1500)
      );

      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      retryTimeoutId = setTimeout(() => {
        syncEngine.triggerSync('auto_retry');
      }, backoffMs);

      return { success: false, syncedCount: 0, error: errMsg };
    } finally {
      store.setSyncing(false);
    }
  },

  // Purge already-synced items to free local database storage
  async purgeSyncedRecords(): Promise<number> {
    const purged = await dbService.clearSyncedRecords();
    await syncEngine.refreshPendingCount();
    return purged;
  },

  // Initialize listeners (window online/offline, periodic background poll, idle detector)
  initSyncEngine(): () => void {
    syncEngine.refreshPendingCount();

    const handleOnline = () => {
      useSyncStore.getState().setOnline(true);
      syncEngine.triggerSync('online_resume');
    };

    const handleOffline = () => {
      useSyncStore.getState().setOnline(false);
    };

    const handleUserActivity = () => {
      lastUserActivityTime = Date.now();
      isIdleSyncTriggered = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true })
    );

    // Periodic interval sync (every 60 seconds)
    const intervalTimer = setInterval(() => {
      const { isOnline, isSyncing } = useSyncStore.getState();
      if (isOnline && !isSyncing) {
        syncEngine.triggerSync('auto_interval');
      }
    }, 60000);

    // Idle monitor (checks every 20 seconds)
    const idleTimer = setInterval(() => {
      const config = useConfigStore.getState().config;
      if (!config?.sync?.triggerOnIdle) return;

      const idleThresholdMs = (config.sync.idleMinutes || 5) * 60 * 1000;
      const elapsed = Date.now() - lastUserActivityTime;

      if (elapsed >= idleThresholdMs && !isIdleSyncTriggered) {
        isIdleSyncTriggered = true;
        const { isOnline, isSyncing } = useSyncStore.getState();
        if (isOnline && !isSyncing) {
          syncEngine.triggerSync('idle');
        }
      }
    }, 20000);

    // Initial background sync check after 2 seconds
    const initialSyncTimer = setTimeout(() => {
      syncEngine.triggerSync('auto_interval');
    }, 2000);

    // Teardown function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, handleUserActivity)
      );
      clearInterval(intervalTimer);
      clearInterval(idleTimer);
      clearTimeout(initialSyncTimer);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  },
};
