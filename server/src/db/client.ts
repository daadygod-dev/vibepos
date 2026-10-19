import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { createDefaultConfig } from '@vibe-pos/config-schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure persistent data directory exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.SQLITE_DB_PATH || path.join(dataDir, 'vibepos.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for high concurrency
sqlite.pragma('journal_mode = WAL');

// Initialize database schema tables if not exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS vendor_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    vendor_id TEXT,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    license_key TEXT UNIQUE NOT NULL,
    license_status TEXT DEFAULT 'active' NOT NULL,
    paid_until TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    config_version INTEGER DEFAULT 1 NOT NULL,
    active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendor_users(id)
  );

  CREATE TABLE IF NOT EXISTS config_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    config TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS sync_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    data TEXT NOT NULL,
    synced_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

export const db = drizzle(sqlite, { schema });

// Seed initial vendor and demo businesses if database is fresh
function seedDatabase() {
  const existingVendor = sqlite.prepare('SELECT id FROM vendor_users LIMIT 1').get();
  const now = new Date().toISOString();
  let vendorId = 'vendor_admin_1';

  if (!existingVendor) {
    const defaultEmail = process.env.VENDOR_EMAIL || 'admin@vibepos.internal';
    const defaultPasswordHash =
      process.env.VENDOR_PASSWORD_HASH || bcrypt.hashSync('admin123', 10);

    sqlite
      .prepare(
        'INSERT INTO vendor_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(vendorId, defaultEmail, defaultPasswordHash, now);
    console.log(`[db] Seeded initial vendor user: ${defaultEmail}`);
  } else {
    vendorId = (existingVendor as { id: string }).id;
  }

  const existingCustomer = sqlite.prepare('SELECT id FROM customers LIMIT 1').get();
  if (!existingCustomer) {
    const demoBusinesses = [
      {
        id: 'demo_rest',
        name: "Mario's Italian Bistro",
        businessType: 'restaurant' as const,
        licenseKey: 'LK-DEMO-RESTAURANT-2026',
      },
      {
        id: 'demo_groc',
        name: 'Green Grocer Market',
        businessType: 'grocery' as const,
        licenseKey: 'LK-DEMO-GROCERY-2026',
      },
      {
        id: 'demo_hot',
        name: 'Grand Palace Hotel',
        businessType: 'hotel' as const,
        licenseKey: 'LK-DEMO-HOTEL-2026',
      },
    ];

    const insertCustomer = sqlite.prepare(`
      INSERT INTO customers (id, vendor_id, name, business_type, license_key, license_status, paid_until, config_version, active, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, 1, 1, ?)
    `);

    const insertConfig = sqlite.prepare(`
      INSERT INTO config_profiles (customer_id, version, config, created_at)
      VALUES (?, 1, ?, ?)
    `);

    const paidUntil = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    for (const b of demoBusinesses) {
      const config = createDefaultConfig(b.id, b.name, b.businessType);
      insertCustomer.run(b.id, vendorId, b.name, b.businessType, b.licenseKey, paidUntil, now);
      insertConfig.run(b.id, JSON.stringify(config), now);
    }

    console.log('[db] Seeded 3 real demo businesses with dynamic catalogs, tables, and staff rosters!');
  }
}

seedDatabase();
