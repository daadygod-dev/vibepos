import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// -------------------------------------------------------
// Vendor users (only you)
// -------------------------------------------------------
export const vendorUsers = sqliteTable('vendor_users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
});

// -------------------------------------------------------
// Customers (businesses you serve)
// -------------------------------------------------------
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').references(() => vendorUsers.id),
  name: text('name').notNull(),
  businessType: text('business_type').notNull(),
  licenseKey: text('license_key').unique().notNull(),
  licenseStatus: text('license_status').default('active').notNull(),
  paidUntil: text('paid_until'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  configVersion: integer('config_version').default(1).notNull(),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
});

// -------------------------------------------------------
// Config profiles (versioned per customer)
// -------------------------------------------------------
export const configProfiles = sqliteTable('config_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  version: integer('version').notNull(),
  config: text('config', { mode: 'json' }).notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
});

// -------------------------------------------------------
// Sync records (delta from desktop app)
// -------------------------------------------------------
export const syncRecords = sqliteTable('sync_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  operation: text('operation').notNull(), // 'insert' | 'update' | 'delete'
  data: text('data', { mode: 'json' }).notNull(),
  syncedAt: text('synced_at').$defaultFn(() => new Date().toISOString()).notNull(),
});
