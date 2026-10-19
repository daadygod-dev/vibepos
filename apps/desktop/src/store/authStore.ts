import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoleDefinition } from '@vibe-pos/config-schema';

export interface Session {
  staffId: string;
  staffName: string;
  role: RoleDefinition;
  startedAt: string;
}

interface AuthState {
  session: Session | null;
  terminalToken: string | null;
  setSession: (session: Session) => void;
  setTerminalToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      terminalToken: null,
      setSession: (session) => set({ session }),
      setTerminalToken: (token) => set({ terminalToken: token }),
      logout: () => set({ session: null }),
    }),
    { name: 'vibe-pos-auth' },
  ),
);
