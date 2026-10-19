import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PosRoom } from '@vibe-pos/config-schema';

export type RoomStatus = 'available' | 'occupied' | 'checkout' | 'maintenance';
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'penthouse';

export interface FolioEntry {
  id: string;
  description: string;
  amount: number;
  timestamp: string;
  category: 'room' | 'dining' | 'service' | 'minibar' | 'spa';
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  rate: number;
  guestName: string | null;
  guestPhone?: string;
  checkIn: string | null;
  checkOut: string | null;
  folio: FolioEntry[];
}

interface RoomsState {
  rooms: Room[];
  floors: number[];
  activeFloor: number;
  setActiveFloor: (floor: number) => void;
  setRooms: (rooms: Room[]) => void;
  syncFromConfig: (configRooms?: PosRoom[]) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  checkInGuest: (id: string, guestName: string, guestPhone: string, checkOut: string) => void;
  checkOutRoom: (id: string) => void;
  addFolioEntry: (roomId: string, entry: Omit<FolioEntry, 'id' | 'timestamp'>) => void;
  setRoomStatus: (id: string, status: RoomStatus) => void;
  getRoomFolioTotal: (roomId: string) => number;
}

const DEFAULT_ROOMS: Room[] = [
  // Floor 1
  {
    id: 'R101',
    number: '101',
    floor: 1,
    type: 'standard',
    status: 'available',
    rate: 85,
    guestName: null,
    checkIn: null,
    checkOut: null,
    folio: [],
  },
  {
    id: 'R102',
    number: '102',
    floor: 1,
    type: 'standard',
    status: 'occupied',
    rate: 85,
    guestName: 'John Smith',
    guestPhone: '+1 555-0192',
    checkIn: new Date(Date.now() - 2 * 86400000).toISOString(),
    checkOut: new Date(Date.now() + 86400000).toISOString(),
    folio: [
      { id: 'f1', description: 'Room Charge (2 Nights)', amount: 170, timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), category: 'room' },
      { id: 'f2', description: 'Continental Breakfast', amount: 15, timestamp: new Date(Date.now() - 86400000).toISOString(), category: 'dining' },
      { id: 'f3', description: 'Minibar Beverages', amount: 12.5, timestamp: new Date().toISOString(), category: 'minibar' },
    ],
  },
  {
    id: 'R103',
    number: '103',
    floor: 1,
    type: 'deluxe',
    status: 'available',
    rate: 120,
    guestName: null,
    checkIn: null,
    checkOut: null,
    folio: [],
  },
  // Floor 2
  {
    id: 'R201',
    number: '201',
    floor: 2,
    type: 'deluxe',
    status: 'occupied',
    rate: 120,
    guestName: 'Dr. Sarah Connor',
    guestPhone: '+1 555-0431',
    checkIn: new Date(Date.now() - 86400000).toISOString(),
    checkOut: new Date(Date.now() + 2 * 86400000).toISOString(),
    folio: [
      { id: 'f4', description: 'Room Charge (1 Night)', amount: 120, timestamp: new Date(Date.now() - 86400000).toISOString(), category: 'room' },
      { id: 'f5', description: 'Room Service Dinner', amount: 48, timestamp: new Date().toISOString(), category: 'dining' },
      { id: 'f6', description: 'Airport Transfer Shuttle', amount: 35, timestamp: new Date().toISOString(), category: 'service' },
    ],
  },
  {
    id: 'R202',
    number: '202',
    floor: 2,
    type: 'suite',
    status: 'maintenance',
    rate: 200,
    guestName: null,
    checkIn: null,
    checkOut: null,
    folio: [],
  },
  {
    id: 'R203',
    number: '203',
    floor: 2,
    type: 'standard',
    status: 'checkout',
    rate: 85,
    guestName: 'Michael Chang',
    guestPhone: '+1 555-0887',
    checkIn: new Date(Date.now() - 3 * 86400000).toISOString(),
    checkOut: new Date().toISOString(),
    folio: [
      { id: 'f7', description: 'Room Charge (3 Nights)', amount: 255, timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), category: 'room' },
      { id: 'f8', description: 'Aromatherapy Massage', amount: 95, timestamp: new Date(Date.now() - 86400000).toISOString(), category: 'spa' },
    ],
  },
  // Floor 3
  {
    id: 'R301',
    number: '301',
    floor: 3,
    type: 'suite',
    status: 'available',
    rate: 200,
    guestName: null,
    checkIn: null,
    checkOut: null,
    folio: [],
  },
  {
    id: 'R302',
    number: '302',
    floor: 3,
    type: 'penthouse',
    status: 'occupied',
    rate: 350,
    guestName: 'Eleanor Vance',
    guestPhone: '+1 555-0914',
    checkIn: new Date(Date.now() - 86400000).toISOString(),
    checkOut: new Date(Date.now() + 4 * 86400000).toISOString(),
    folio: [
      { id: 'f9', description: 'Penthouse Rate (1 Night)', amount: 350, timestamp: new Date().toISOString(), category: 'room' },
      { id: 'f10', description: 'Champagne & Caviar Service', amount: 160, timestamp: new Date().toISOString(), category: 'dining' },
    ],
  },
];

export const useRoomsStore = create<RoomsState>()(
  persist(
    (set, get) => ({
      rooms: DEFAULT_ROOMS,
      floors: [1, 2, 3],
      activeFloor: 1,
      setActiveFloor: (floor) => set({ activeFloor: floor }),
      setRooms: (rooms) => set({ rooms }),
      syncFromConfig: (configRooms?: PosRoom[]) => {
        if (!configRooms || configRooms.length === 0) return;
        set((s) => {
          const updatedRooms = configRooms.map((cr) => {
            const existing = s.rooms.find((r) => r.id === cr.id);
            if (existing) {
              return {
                ...existing,
                number: cr.number,
                floor: cr.floor,
                type: cr.type,
                rate: cr.rate,
              };
            }
            return {
              id: cr.id,
              number: cr.number,
              floor: cr.floor,
              type: cr.type,
              status: 'available' as RoomStatus,
              rate: cr.rate,
              guestName: null,
              checkIn: null,
              checkOut: null,
              folio: [],
            };
          });
          const floors = Array.from(new Set(updatedRooms.map((r) => r.floor))).sort((a, b) => a - b);
          const activeFloor = floors.includes(s.activeFloor) ? s.activeFloor : floors[0] || 1;
          return { rooms: updatedRooms, floors, activeFloor };
        });
      },
      updateRoom: (id, patch) =>
        set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      checkInGuest: (id, guestName, guestPhone, checkOut) =>
        set((s) => ({
          rooms: s.rooms.map((r) => {
            if (r.id !== id) return r;
            const initialEntry: FolioEntry = {
              id: `f-${Date.now()}`,
              description: `Initial Room Charge (${r.type.toUpperCase()})`,
              amount: r.rate,
              timestamp: new Date().toISOString(),
              category: 'room',
            };
            return {
              ...r,
              status: 'occupied' as const,
              guestName,
              guestPhone,
              checkIn: new Date().toISOString(),
              checkOut,
              folio: [initialEntry],
            };
          }),
        })),
      checkOutRoom: (id) =>
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'available' as const,
                  guestName: null,
                  guestPhone: undefined,
                  checkIn: null,
                  checkOut: null,
                  folio: [],
                }
              : r
          ),
        })),
      addFolioEntry: (roomId, entry) =>
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  folio: [
                    ...r.folio,
                    {
                      ...entry,
                      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                }
              : r
          ),
        })),
      setRoomStatus: (id, status) =>
        set((s) => ({
          rooms: s.rooms.map((r) => (r.id === id ? { ...r, status } : r)),
        })),
      getRoomFolioTotal: (roomId) => {
        const room = get().rooms.find((r) => r.id === roomId);
        return room ? room.folio.reduce((sum, e) => sum + e.amount, 0) : 0;
      },
    }),
    { name: 'vibe-pos-rooms' },
  ),
);
