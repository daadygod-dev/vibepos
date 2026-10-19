import { pgTable, text, integer, jsonb, timestamp, date, bigserial, boolean } from 'drizzle-orm/pg-core';

// -------------------------------------------------------
// Vendor users (only you)
// -------------------------------------------------------
export const vendorUsers = pgTable('vendor_users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// -------------------------------------------------------
// Customers (businesses you serve)
// -------------------------------------------------------
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').references(() => vendorUsers.id),
  name: text('name').notNull(),
  businessType: text('business_type').notNull(),
  licenseKey: text('license_key').unique().notNull(),
  licenseStatus: text('license_status').default('active').notNull(),
  paidUntil: date('paid_until'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  configVersion: integer('config_version').default(1).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// -------------------------------------------------------
// Config profiles (versioned per customer)
// -------------------------------------------------------
export const configProfiles = pgTable('config_profiles', {
  id: bigserial('id', { mode: 'number' }),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  version: integer('version').notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// -------------------------------------------------------
// Sync records (delta from desktop app)
// -------------------------------------------------------
export const syncRecords = pgTable('sync_records', {
  id: bigserial('id', { mode: 'number' }),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  operation: text('operation').notNull(), // 'insert' | 'update'
  data: jsonb('data').notNull(),
  syncedAt: timestamp('synced_at').defaultNow(),
});
