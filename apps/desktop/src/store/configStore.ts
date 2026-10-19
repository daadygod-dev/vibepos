import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PosConfig } from '@vibe-pos/config-schema';

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
      setConfig: (config) => set({ config, localConfigVersion: config.version }),
      clearConfig: () => set({ config: null, localConfigVersion: 0 }),
    }),
    { name: 'vibe-pos-config' },
  ),
);
