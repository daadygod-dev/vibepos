import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { db } from '../db/client.js';
import { customers, vendorUsers } from '../db/schema.js';
import { signToken } from '../lib/auth.js';
import { eq } from 'drizzle-orm';

export const authRouter = new Hono();

// Desktop app: activate with license key
authRouter.post('/terminal', async (c) => {
  const { licenseKey } = await c.req.json();
  const customer = await db.query.customers.findFirst({
    where: eq(customers.licenseKey, licenseKey),
  });
  if (!customer || !customer.active) {
    return c.json({ error: 'Invalid license key' }, 401);
  }
  const token = await signToken({ customerId: customer.id, role: 'terminal' }, '365d');
  return c.json({ token, customerId: customer.id });
});

// Vendor: email + password login
authRouter.post('/vendor', async (c) => {
  const { email, password } = await c.req.json();
  const vendor = await db.query.vendorUsers.findFirst({
    where: eq(vendorUsers.email, email),
  });
  if (!vendor) return c.json({ error: 'Invalid credentials' }, 401);
  const valid = await bcrypt.compare(password, vendor.passwordHash);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
  const token = await signToken({ vendorId: vendor.id, role: 'vendor' });
  return c.json({ token });
});
