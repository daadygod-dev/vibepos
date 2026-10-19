import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRouter } from './routes/auth.js';
import { configRouter } from './routes/config.js';
import { syncRouter } from './routes/sync.js';
import { vendorRouter } from './routes/vendor.js';
import { stripeRouter } from './routes/stripe.js';

const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors());

app.get('/', (c) => c.json({ status: 'vibe-pos api running' }));

app.route('/api/auth', authRouter);
app.route('/api/config', configRouter);
app.route('/api/sync', syncRouter);
app.route('/api/vendor', vendorRouter);
app.route('/api/stripe', stripeRouter);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 vibe-pos server running on port ${port}`);
});

export default app;
