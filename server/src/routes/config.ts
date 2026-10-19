import { Hono } from 'hono';
import { db } from '../db/client.js';
import { configProfiles, customers } from '../db/schema.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { eq, desc } from 'drizzle-orm';

type Variables = {
  jwtPayload: { customerId?: string; role?: string };
};

export const configRouter = new Hono<{ Variables: Variables }>();

// Desktop app fetches its config
configRouter.get('/:customerId', requireAuth, async (c) => {
  const customerId = c.req.param('customerId');
  const jwtPayload = c.get('jwtPayload') as { customerId?: string };

  // Terminal can only fetch its own config
  if (jwtPayload.customerId !== customerId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const profile = await db.query.configProfiles.findFirst({
    where: eq(configProfiles.customerId, customerId),
    orderBy: [desc(configProfiles.version)],
  });

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!profile || !customer) return c.json({ error: 'Not found' }, 404);

  // Inject live license status into config
  const config = {
    ...(profile.config as object),
    licenseStatus: customer.licenseStatus,
    paidUntil: customer.paidUntil,
  };

  return c.json({ config, version: profile.version });
});
