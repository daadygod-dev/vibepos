import { Hono } from 'hono';
import { db } from '../db/client.js';
import { customers, configProfiles } from '../db/schema.js';
import { requireVendor } from '../middleware/requireVendor.js';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { PosConfig } from '@vibe-pos/config-schema';
import { createDefaultConfig } from '@vibe-pos/config-schema';

type Variables = {
  jwtPayload: { vendorId?: string; role?: string };
};

export const vendorRouter = new Hono<{ Variables: Variables }>();

// List all customers owned by the authenticated vendor
vendorRouter.get('/customers', requireVendor, async (c) => {
  const jwt = c.get('jwtPayload') as { vendorId?: string };
  const vendorId = jwt?.vendorId;

  const all = await db.query.customers.findMany({
    where: vendorId ? eq(customers.vendorId, vendorId) : undefined,
    orderBy: [desc(customers.createdAt)],
  });
  return c.json(all);
});

// Create new customer scoped to this vendor
vendorRouter.post('/customers', requireVendor, async (c) => {
  const jwt = c.get('jwtPayload') as { vendorId?: string };
  const vendorId = jwt?.vendorId;
  const { name, businessType } = await c.req.json();

  if (!name || !businessType) {
    return c.json({ error: 'Name and businessType are required' }, 400);
  }

  const customerId = `cust_${nanoid(10)}`;
  const licenseKey = `LK-${nanoid(20).toUpperCase()}`;
  const defaultConfig = createDefaultConfig(customerId, name, businessType);

  await db.insert(customers).values({
    id: customerId,
    vendorId: vendorId || null,
    name,
    businessType,
    licenseKey,
    licenseStatus: 'active',
    configVersion: 1,
    active: true,
  });

  await db.insert(configProfiles).values({
    customerId,
    version: 1,
    config: defaultConfig as unknown as Record<string, unknown>,
  });

  return c.json({ customerId, licenseKey, config: defaultConfig }, 201);
});

// Get single customer (authorized for this vendor)
vendorRouter.get('/customers/:id', requireVendor, async (c) => {
  const jwt = c.get('jwtPayload') as { vendorId?: string };
  const vendorId = jwt?.vendorId;
  const id = c.req.param('id');

  const customer = await db.query.customers.findFirst({
    where: vendorId ? and(eq(customers.id, id), eq(customers.vendorId, vendorId)) : eq(customers.id, id),
  });
  if (!customer) return c.json({ error: 'Customer not found or unauthorized' }, 404);

  const profile = await db.query.configProfiles.findFirst({
    where: eq(configProfiles.customerId, id),
    orderBy: [desc(configProfiles.version)],
  });

  return c.json({ customer, config: profile?.config ?? null });
});

// Update customer config
vendorRouter.put('/customers/:id/config', requireVendor, async (c) => {
  const jwt = c.get('jwtPayload') as { vendorId?: string };
  const vendorId = jwt?.vendorId;
  const id = c.req.param('id');
  const { config } = await c.req.json() as { config: PosConfig };

  if (!config || typeof config !== 'object') {
    return c.json({ error: 'Invalid configuration payload' }, 400);
  }

  const customer = await db.query.customers.findFirst({
    where: vendorId ? and(eq(customers.id, id), eq(customers.vendorId, vendorId)) : eq(customers.id, id),
  });
  if (!customer) return c.json({ error: 'Customer not found or unauthorized' }, 404);

  const newVersion = (customer.configVersion ?? 1) + 1;

  await db.insert(configProfiles).values({
    customerId: id,
    version: newVersion,
    config: config as unknown as Record<string, unknown>,
  });

  await db.update(customers)
    .set({ configVersion: newVersion })
    .where(eq(customers.id, id));

  return c.json({ version: newVersion });
});
