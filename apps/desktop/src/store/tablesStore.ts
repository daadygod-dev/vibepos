import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty';

export interface TableDef {
  id: string;
  name: string;
  seats: number;
  status: TableStatus;
  floor: string;
  x: number;
  y: number;
  currentOrderId: string | null;
  currentBill?: number;
}

interface TablesState {
  tables: TableDef[];
  floors: string[];
  activeFloor: string;
  setTables: (tables: TableDef[]) => void;
  updateTable: (id: string, patch: Partial<TableDef>) => void;
  setActiveFloor: (floor: string) => void;
  occupyTable: (id: string, orderId: string, bill?: number) => void;
  freeTable: (id: string) => void;
  setTableStatus: (id: string, status: TableStatus) => void;
}

const DEFAULT_TABLES: TableDef[] = [
  // Main Hall
  { id: 'T1', name: 'Table 1', seats: 4, status: 'occupied', floor: 'Main Hall', x: 0, y: 0, currentOrderId: 'ORD-101', currentBill: 35.75 },
  { id: 'T2', name: 'Table 2', seats: 2, status: 'available', floor: 'Main Hall', x: 1, y: 0, currentOrderId: null },
  { id: 'T3', name: 'Table 3', seats: 6, status: 'occupied', floor: 'Main Hall', x: 2, y: 0, currentOrderId: 'ORD-102', currentBill: 47.30 },
  { id: 'T4', name: 'Table 4', seats: 4, status: 'reserved', floor: 'Main Hall', x: 0, y: 1, currentOrderId: null },
  { id: 'T5', name: 'Table 5', seats: 2, status: 'available', floor: 'Main Hall', x: 1, y: 1, currentOrderId: null },
  { id: 'T6', name: 'Table 6', seats: 8, status: 'dirty', floor: 'Main Hall', x: 2, y: 1, currentOrderId: null },
  // Patio
  { id: 'P1', name: 'Patio 1', seats: 4, status: 'occupied', floor: 'Patio', x: 0, y: 0, currentOrderId: 'ORD-103', currentBill: 19.80 },
  { id: 'P2', name: 'Patio 2', seats: 4, status: 'available', floor: 'Patio', x: 1, y: 0, currentOrderId: null },
  { id: 'P3', name: 'Patio 3', seats: 2, status: 'available', floor: 'Patio', x: 2, y: 0, currentOrderId: null },
  // VIP Lounge
  { id: 'V1', name: 'VIP Lounge 1', seats: 6, status: 'reserved', floor: 'VIP', x: 0, y: 0, currentOrderId: null },
  { id: 'V2', name: 'VIP Suite 2', seats: 10, status: 'available', floor: 'VIP', x: 1, y: 0, currentOrderId: null },
];

export const useTablesStore = create<TablesState>()(
  persist(
    (set) => ({
      tables: DEFAULT_TABLES,
      floors: ['Main Hall', 'Patio', 'VIP'],
      activeFloor: 'Main Hall',
      setTables: (tables) => set({ tables }),
      updateTable: (id, patch) =>
        set((s) => ({ tables: s.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      setActiveFloor: (floor) => set({ activeFloor: floor }),
      occupyTable: (id, orderId, bill = 0) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id ? { ...t, status: 'occupied', currentOrderId: orderId, currentBill: bill } : t
          ),
        })),
      freeTable: (id) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id ? { ...t, status: 'dirty', currentOrderId: null, currentBill: undefined } : t
          ),
        })),
      setTableStatus: (id, status) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  ...(status === 'available' || status === 'dirty' || status === 'reserved'
                    ? { currentOrderId: null, currentBill: undefined }
                    : {}),
                }
              : t
          ),
        })),
    }),
    { name: 'vibe-pos-tables' },
  ),
);
