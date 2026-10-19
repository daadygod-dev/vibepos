import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../lib/auth.js';

export const requireVendor = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const payload = await verifyToken(header.slice(7)) as { role?: string };
    if (payload.role !== 'vendor') {
      return c.json({ error: 'Forbidden — vendor only' }, 403);
    }
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
