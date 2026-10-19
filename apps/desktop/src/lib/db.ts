// ============================================================
// vibe-pos — Local Database Layer (SQLite + Web Fallback)
// Operates with @tauri-apps/plugin-sql when in desktop mode,
// or persistent local storage fallback when previewing in web.
// ============================================================

export interface DbOrder {
  id: string;
  customerId: string;
  tableId?: string | null;
  tableName?: string | null;
  roomNumber?: string | null;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  staffId: string;
  staffName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbOrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export interface DbShift {
  id: string;
  customerId?: string;
  staffId: string;
  staffName: string;
  openedAt: string;
  closedAt?: string | null;
  startCash: number;
  endCash?: number | null;
  cashSales: number;
  cardSales: number;
  expectedCash: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface DbSyncItem {
  id: number;
  customerId: string;
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string; // JSON string
  createdAt: string;
  status: 'pending' | 'synced' | 'failed';
}

export interface HardwareSettings {
  printerType: 'escpos_network' | 'escpos_usb' | 'system_dialog';
  printerIp: string;
  printerPort: number;
  paperSize: '58mm' | '80mm';
  cashDrawerKick: boolean;
  autoPrintReceipt: boolean;
}

// Global in-memory storage for web fallback
interface WebStore {
  orders: DbOrder[];
  orderItems: DbOrderItem[];
  shifts: DbShift[];
  syncQueue: DbSyncItem[];
  hardwareSettings: HardwareSettings;
}

const STORAGE_KEY = 'vibe_pos_sqlite_store';

function loadWebStore(): WebStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    orders: [],
    orderItems: [],
    shifts: [
      {
        id: 'shift_init_1',
        staffId: 'staff_manager_1',
        staffName: 'Alex Vance',
        openedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        startCash: 150.0,
        cashSales: 185.5,
        cardSales: 432.0,
        expectedCash: 335.5,
        status: 'open',
      },
    ],
    syncQueue: [],
    hardwareSettings: {
      printerType: 'system_dialog',
      printerIp: '192.168.1.100',
      printerPort: 9100,
      paperSize: '80mm',
      cashDrawerKick: true,
      autoPrintReceipt: true,
    },
  };
}

function saveWebStore(store: WebStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

let isTauriEnv: boolean | null = null;
let tauriDb: any = null;

async function checkTauri() {
  if (isTauriEnv !== null) return isTauriEnv;
  isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauriEnv) {
    try {
      const sqlModule = await import('@tauri-apps/plugin-sql');
      const Database = sqlModule.default;
      tauriDb = await Database.load('sqlite:vibe_pos.db');
      await initTauriTables();
    } catch (err) {
      console.warn('Tauri SQL plugin load failed, falling back to local adapter:', err);
      isTauriEnv = false;
    }
  }
  return isTauriEnv;
}

async function initTauriTables() {
  if (!tauriDb) return;
  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      table_id TEXT,
      table_name TEXT,
      room_number TEXT,
      status TEXT,
      subtotal REAL,
      discount REAL,
      tax REAL,
      total REAL,
      staff_id TEXT,
      staff_name TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      product_id TEXT,
      name TEXT,
      price REAL,
      qty INTEGER,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      staff_id TEXT,
      staff_name TEXT,
      opened_at TEXT,
      closed_at TEXT,
      start_cash REAL,
      end_cash REAL,
      cash_sales REAL,
      card_sales REAL,
      expected_cash REAL,
      status TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT,
      table_name TEXT,
      record_id TEXT,
      operation TEXT,
      payload TEXT,
      created_at TEXT,
      status TEXT
    );
  `);
}

// ── Database Operations API ───────────────────────────────────────────────────

export const dbService = {
  // Initialize Database
  async init(): Promise<void> {
    await checkTauri();
  },

  // Save an Order + Items + Queue Sync Record
  async createOrder(order: DbOrder, items: DbOrderItem[]): Promise<void> {
    const isT = await checkTauri();
    if (isT && tauriDb) {
      await tauriDb.execute(
        `INSERT INTO orders (id, customer_id, table_id, table_name, room_number, status, subtotal, discount, tax, total, staff_id, staff_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          order.id,
          order.customerId,
          order.tableId || null,
          order.tableName || null,
          order.roomNumber || null,
          order.status,
          order.subtotal,
          order.discount,
          order.tax,
          order.total,
          order.staffId,
          order.staffName,
          order.createdAt,
          order.updatedAt,
        ]
      );

      for (const item of items) {
        await tauriDb.execute(
          `INSERT INTO order_items (id, order_id, product_id, name, price, qty, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.id, item.orderId, item.productId, item.name, item.price, item.qty, item.notes || null]
        );
      }

      // Add to sync queue
      await tauriDb.execute(
        `INSERT INTO sync_queue (customer_id, table_name, record_id, operation, payload, created_at, status)
         VALUES ($1, 'orders', $2, 'insert', $3, $4, 'pending')`,
        [order.customerId, order.id, JSON.stringify({ ...order, items }), order.createdAt]
      );
    } else {
      const store = loadWebStore();
      store.orders.unshift(order);
      store.orderItems.push(...items);
      store.syncQueue.push({
        id: Date.now(),
        customerId: order.customerId,
        tableName: 'orders',
        recordId: order.id,
        operation: 'insert',
        payload: JSON.stringify({ ...order, items }),
        createdAt: order.createdAt,
        status: 'pending',
      });
      // Update active shift sales if open
      const activeShift = store.shifts.find((s) => s.status === 'open');
      if (activeShift) {
        activeShift.cashSales += order.total;
        activeShift.expectedCash += order.total;
      }
      saveWebStore(store);
    }
  },

  // Get active open cash shift
  async getActiveShift(): Promise<DbShift | null> {
    const isT = await checkTauri();
    if (isT && tauriDb) {
      const rows = await tauriDb.select(
        `SELECT * FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`
      );
      return rows[0] || null;
    }
    const store = loadWebStore();
    return store.shifts.find((s) => s.status === 'open') || null;
  },

  // Open a new cash drawer shift
  async openShift(staffId: string, staffName: string, startCash: number, customerId?: string): Promise<DbShift> {
    const custId = customerId || 'demo_customer';
    const shift: DbShift = {
      id: `shift_${Date.now()}`,
      customerId: custId,
      staffId,
      staffName,
      openedAt: new Date().toISOString(),
      startCash,
      cashSales: 0,
      cardSales: 0,
      expectedCash: startCash,
      status: 'open',
    };

    const isT = await checkTauri();
    if (isT && tauriDb) {
      await tauriDb.execute(
        `INSERT INTO shifts (id, staff_id, staff_name, opened_at, start_cash, cash_sales, card_sales, expected_cash, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [shift.id, staffId, staffName, shift.openedAt, startCash, 0, 0, startCash, 'open']
      );
      // Queue sync record for shift creation
      await tauriDb.execute(
        `INSERT INTO sync_queue (customer_id, table_name, record_id, operation, payload, created_at, status)
         VALUES ($1, 'shifts', $2, 'insert', $3, $4, 'pending')`,
        [custId, shift.id, JSON.stringify(shift), shift.openedAt]
      );
    } else {
      const store = loadWebStore();
      store.shifts.unshift(shift);
      store.syncQueue.push({
        id: Date.now(),
        customerId: custId,
        tableName: 'shifts',
        recordId: shift.id,
        operation: 'insert',
        payload: JSON.stringify(shift),
        createdAt: shift.openedAt,
        status: 'pending',
      });
      saveWebStore(store);
    }
    return shift;
  },

  // Close shift and reconcile cash
  async closeShift(shiftId: string, endCash: number, notes?: string): Promise<DbShift> {
    const closedAt = new Date().toISOString();
    const isT = await checkTauri();
    if (isT && tauriDb) {
      await tauriDb.execute(
        `UPDATE shifts SET closed_at = $1, end_cash = $2, status = 'closed', notes = $3 WHERE id = $4`,
        [closedAt, endCash, notes || null, shiftId]
      );
      const rows = await tauriDb.select(`SELECT * FROM shifts WHERE id = $1`, [shiftId]);
      const closedShift = rows[0];
      if (closedShift) {
        await tauriDb.execute(
          `INSERT INTO sync_queue (customer_id, table_name, record_id, operation, payload, created_at, status)
           VALUES ($1, 'shifts', $2, 'update', $3, $4, 'pending')`,
          [closedShift.customer_id || 'demo_customer', shiftId, JSON.stringify(closedShift), closedAt]
        );
      }
      return closedShift;
    } else {
      const store = loadWebStore();
      const target = store.shifts.find((s) => s.id === shiftId);
      if (target) {
        target.closedAt = closedAt;
        target.endCash = endCash;
        target.status = 'closed';
        target.notes = notes;
        store.syncQueue.push({
          id: Date.now(),
          customerId: target.customerId || 'demo_customer',
          tableName: 'shifts',
          recordId: shiftId,
          operation: 'update',
          payload: JSON.stringify(target),
          createdAt: closedAt,
          status: 'pending',
        });
        saveWebStore(store);
        return target;
      }
      throw new Error('Shift not found');
    }
  },

  // Get shifts history
  async getShifts(): Promise<DbShift[]> {
    const isT = await checkTauri();
    if (isT && tauriDb) {
      return await tauriDb.select(`SELECT * FROM shifts ORDER BY opened_at DESC`);
    }
    return loadWebStore().shifts;
  },

  // Hardware Settings
  getHardwareSettings(): HardwareSettings {
    return loadWebStore().hardwareSettings;
  },

  saveHardwareSettings(settings: HardwareSettings): void {
    const store = loadWebStore();
    store.hardwareSettings = settings;
    saveWebStore(store);
  },

  // Get Pending Sync Queue records (up to limit)
  async getPendingSyncRecords(limit = 250): Promise<DbSyncItem[]> {
    const isT = await checkTauri();
    if (isT && tauriDb) {
      return await tauriDb.select(
        `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY id ASC LIMIT $1`,
        [limit]
      );
    }
    return loadWebStore().syncQueue.filter((s) => s.status === 'pending').slice(0, limit);
  },

  // Get Pending Count
  async getPendingCount(): Promise<number> {
    const isT = await checkTauri();
    if (isT && tauriDb) {
      const rows = await tauriDb.select(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
      );
      return rows[0]?.count ? Number(rows[0].count) : 0;
    }
    return loadWebStore().syncQueue.filter((s) => s.status === 'pending').length;
  },

  // Mark records as successfully synced
  async markRecordsSynced(ids: number[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const isT = await checkTauri();
    if (isT && tauriDb) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      await tauriDb.execute(
        `UPDATE sync_queue SET status = 'synced' WHERE id IN (${placeholders})`,
        ids
      );
    } else {
      const store = loadWebStore();
      const idSet = new Set(ids);
      for (const item of store.syncQueue) {
        if (idSet.has(item.id)) {
          item.status = 'synced';
        }
      }
      saveWebStore(store);
    }
  },

  // Mark records as failed
  async markRecordsFailed(ids: number[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const isT = await checkTauri();
    if (isT && tauriDb) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      await tauriDb.execute(
        `UPDATE sync_queue SET status = 'failed' WHERE id IN (${placeholders})`,
        ids
      );
    } else {
      const store = loadWebStore();
      const idSet = new Set(ids);
      for (const item of store.syncQueue) {
        if (idSet.has(item.id)) {
          item.status = 'failed';
        }
      }
      saveWebStore(store);
    }
  },

  // Retrieve sync queue for audit log & telemetry
  async getSyncQueue(limit = 50): Promise<DbSyncItem[]> {
    const isT = await checkTauri();
    if (isT && tauriDb) {
      return await tauriDb.select(
        `SELECT * FROM sync_queue ORDER BY id DESC LIMIT $1`,
        [limit]
      );
    }
    return loadWebStore().syncQueue.slice(-limit).reverse();
  },

  // Purge already-synced records to keep local storage compact
  async clearSyncedRecords(): Promise<number> {
    const isT = await checkTauri();
    if (isT && tauriDb) {
      const res = await tauriDb.execute(`DELETE FROM sync_queue WHERE status = 'synced'`);
      return res?.rowsAffected ?? 0;
    } else {
      const store = loadWebStore();
      const initial = store.syncQueue.length;
      store.syncQueue = store.syncQueue.filter((s) => s.status !== 'synced');
      const removed = initial - store.syncQueue.length;
      saveWebStore(store);
      return removed;
    }
  },
};
