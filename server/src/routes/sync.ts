import { Hono } from 'hono';
import { db } from '../db/client.js';
import { syncRecords, customers, configProfiles } from '../db/schema.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { eq, desc } from 'drizzle-orm';

type Variables = {
  jwtPayload: { customerId: string; role?: string };
};

export const syncRouter = new Hono<{ Variables: Variables }>();

const ALLOWED_SYNC_TABLES = new Set([
  'orders',
  'order_items',
  'shifts',
  'payments',
  'rooms_folio',
  'inventory_logs',
  'audit_logs',
]);

const ALLOWED_OPERATIONS = new Set(['insert', 'update', 'delete']);
const MAX_SYNC_BATCH_SIZE = 250;

type SyncRecord = {
  tableName: string;
  recordId: string;
  operation: string;
  data: unknown;
};

// 1. Desktop app pushes delta records
syncRouter.post('/push', requireAuth, async (c) => {
  const jwtPayload = c.get('jwtPayload') as { customerId: string };
  const customerId = jwtPayload.customerId;
  const body = (await c.req.json()) as {
    records?: SyncRecord[];
    trigger?: string;
  };

  const records = body.records || [];
  const trigger = body.trigger || 'manual';

  // Security Check 1: Enforce maximum batch size
  if (records.length > MAX_SYNC_BATCH_SIZE) {
    return c.json(
      { error: `Batch size exceeds limit of ${MAX_SYNC_BATCH_SIZE} records per push` },
      400
    );
  }

  // Security Check 2: Table Whitelist & Operation Validation
  for (const r of records) {
    if (!r.tableName || !ALLOWED_SYNC_TABLES.has(r.tableName)) {
      return c.json(
        { error: `Unauthorized sync table name: '${r.tableName}'` },
        400
      );
    }
    if (!r.operation || !ALLOWED_OPERATIONS.has(r.operation)) {
      return c.json(
        { error: `Unauthorized sync operation: '${r.operation}'` },
        400
      );
    }
    if (!r.recordId || typeof r.recordId !== 'string') {
      return c.json({ error: 'Missing or invalid recordId in sync batch' }, 400);
    }
  }

  console.log(`[sync] ${customerId} pushed ${records.length} validated records (trigger: ${trigger})`);

  if (records.length > 0) {
    await db.insert(syncRecords).values(
      records.map((r) => ({
        id: undefined, // auto-generated
        customerId,
        tableName: r.tableName,
        recordId: r.recordId,
        operation: r.operation,
        data: r.data ?? {},
      }))
    );
  }

  // Return current config version for hot-reload check
  const latest = await db.query.configProfiles.findFirst({
    where: eq(configProfiles.customerId, customerId),
    orderBy: [desc(configProfiles.version)],
  });

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  return c.json({
    status: 'ok',
    syncedRecordsCount: records.length,
    configVersion: latest?.version ?? 1,
    licenseStatus: customer?.licenseStatus ?? 'active',
    serverTime: new Date().toISOString(),
  });
});

// 2. Desktop app inspects sync status & health
syncRouter.get('/status/:customerId', requireAuth, async (c) => {
  const jwtPayload = c.get('jwtPayload') as { customerId: string };
  const requestedId = c.req.param('customerId');

  if (jwtPayload.customerId !== requestedId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const latestSync = await db.query.syncRecords.findFirst({
    where: eq(syncRecords.customerId, requestedId),
    orderBy: [desc(syncRecords.syncedAt)],
  });

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, requestedId),
  });

  const latestConfig = await db.query.configProfiles.findFirst({
    where: eq(configProfiles.customerId, requestedId),
    orderBy: [desc(configProfiles.version)],
  });

  return c.json({
    customerId: requestedId,
    lastSyncTime: latestSync?.syncedAt || null,
    configVersion: latestConfig?.version ?? 1,
    licenseStatus: customer?.licenseStatus ?? 'active',
    serverTime: new Date().toISOString(),
  });
});
