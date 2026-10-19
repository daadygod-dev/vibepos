import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PosConfig } from '@vibe-pos/config-schema';
import { useTablesStore } from './tablesStore';
import { useRoomsStore } from './roomsStore';

interface ConfigState {
  config: PosConfig | null;
  localConfigVersion: number;
  setConfig: (config: PosConfig) => void;
  clearConfig: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: null,
      localConfigVersion: 0,
      setConfig: (config) => {
        if (config.tables && config.tables.length > 0) {
          useTablesStore.getState().syncFromConfig(config.tables);
        }
        if (config.rooms && config.rooms.length > 0) {
          useRoomsStore.getState().syncFromConfig(config.rooms);
        }
        set({ config, localConfigVersion: config.version });
      },
      clearConfig: () => set({ config: null, localConfigVersion: 0 }),
    }),
    { name: 'vibe-pos-config' },
  ),
);
