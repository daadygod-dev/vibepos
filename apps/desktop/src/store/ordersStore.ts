import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId?: string | null;
  tableName?: string;
  roomNumber?: string | null;
  status: OrderStatus;
  items: OrderItem[];
  staffId: string;
  staffName: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, string | number>;
}

interface OrdersState {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  removeOrder: (id: string) => void;
  getOrdersByTable: (tableId: string) => Order[];
  getActiveOrders: () => Order[];
  getKitchenTickets: () => Order[];
}

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-101',
    tableId: 'T1',
    tableName: 'Table 1',
    status: 'preparing',
    items: [
      { id: '1', name: 'Margherita Pizza', price: 12.5, qty: 2, notes: 'Extra crispy' },
      { id: '3', name: 'Caesar Salad', price: 7.5, qty: 1, notes: 'Dressing on the side' },
    ],
    staffId: 'staff_1',
    staffName: 'Alice',
    subtotal: 32.5,
    discount: 0,
    tax: 3.25,
    total: 35.75,
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ORD-102',
    tableId: 'T3',
    tableName: 'Table 3',
    status: 'new',
    items: [
      { id: '2', name: 'Classic Burger', price: 9.0, qty: 3, notes: 'Medium rare' },
      { id: '5', name: 'Espresso', price: 2.5, qty: 2 },
      { id: '4', name: 'Tiramisu', price: 5.5, qty: 2 },
    ],
    staffId: 'staff_1',
    staffName: 'Alice',
    subtotal: 43.0,
    discount: 0,
    tax: 4.3,
    total: 47.3,
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ORD-103',
    tableId: 'T6',
    tableName: 'Patio 1',
    status: 'ready',
    items: [
      { id: '1', name: 'Margherita Pizza', price: 12.5, qty: 1 },
      { id: '4', name: 'Tiramisu', price: 5.5, qty: 1 },
    ],
    staffId: 'staff_2',
    staffName: 'Bob',
    subtotal: 18.0,
    discount: 0,
    tax: 1.8,
    total: 19.8,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: INITIAL_ORDERS,
      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      updateOrderStatus: (id, status) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
          ),
        })),
      removeOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
      getOrdersByTable: (tableId) =>
        get().orders.filter((o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status)),
      getActiveOrders: () => get().orders.filter((o) => !['paid', 'cancelled'].includes(o.status)),
      getKitchenTickets: () =>
        get().orders.filter((o) => ['new', 'preparing'].includes(o.status)),
    }),
    { name: 'vibe-pos-orders' },
  ),
);
