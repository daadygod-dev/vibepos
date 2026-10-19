import { Hono } from 'hono';
import { db } from '../db/client.js';
import { customers, configProfiles } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import Stripe from 'stripe';

export const stripeRouter = new Hono();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
  : null;

// 1. Stripe Webhook Handler
stripeRouter.post('/webhook', async (c) => {
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (stripe && webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook Signature Verification Failed]:', err.message);
      return c.json({ error: `Webhook Error: ${err.message}` }, 400);
    }
  } else {
    // Development / fallback mode: parse JSON directly
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId = (invoice.subscription as string) || (invoice.id as string);
      const periodEnd = invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end;
      const paidUntil = periodEnd
        ? new Date(periodEnd * 1000).toISOString().split('T')[0]
        : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      if (stripeSubId) {
        await db
          .update(customers)
          .set({ licenseStatus: 'active', paidUntil })
          .where(eq(customers.stripeSubscriptionId, stripeSubId));
        console.log(`[Stripe] Invoice paid for sub ${stripeSubId} -> license active until ${paidUntil}`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId = (invoice.subscription as string) || (invoice.id as string);

      if (stripeSubId) {
        // Enters grace period: past_due
        await db
          .update(customers)
          .set({ licenseStatus: 'past_due' })
          .where(eq(customers.stripeSubscriptionId, stripeSubId));
        console.log(`[Stripe] Invoice payment failed for sub ${stripeSubId} -> license past_due (grace period active)`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const stripeSubId = sub.id;

      if (stripeSubId) {
        // Remote lock: suspended
        await db
          .update(customers)
          .set({ licenseStatus: 'suspended' })
          .where(eq(customers.stripeSubscriptionId, stripeSubId));
        console.log(`[Stripe] Subscription deleted ${stripeSubId} -> terminal locked (suspended)`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const stripeSubId = sub.id;
      let newStatus: string = 'active';

      if (sub.status === 'active' || sub.status === 'trialing') {
        newStatus = 'active';
      } else if (sub.status === 'past_due') {
        newStatus = 'past_due';
      } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
        newStatus = 'suspended';
      }

      const periodEnd = sub.current_period_end;
      const paidUntil = periodEnd
        ? new Date(periodEnd * 1000).toISOString().split('T')[0]
        : undefined;

      if (stripeSubId) {
        await db
          .update(customers)
          .set({
            licenseStatus: newStatus,
            ...(paidUntil ? { paidUntil } : {}),
          })
          .where(eq(customers.stripeSubscriptionId, stripeSubId));
        console.log(`[Stripe] Subscription updated ${stripeSubId} -> status ${newStatus}`);
      }
      break;
    }
  }

  return c.json({ received: true });
});

// 2. Create Stripe Checkout Session
stripeRouter.post('/create-checkout-session', async (c) => {
  const body = (await c.req.json()) as {
    customerId: string;
    returnUrl?: string;
    plan?: 'standard' | 'enterprise';
  };

  const customerId = body.customerId;
  if (!customerId) return c.json({ error: 'Missing customerId' }, 400);

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer) return c.json({ error: 'Customer not found' }, 404);

  const returnUrl = body.returnUrl || 'http://localhost:5174/customers/' + customerId;

  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `vibe-pos SaaS License: ${customer.name}`,
                description: 'Full POS counter license with cloud sync and multi-tenant management',
              },
              unit_amount: body.plan === 'enterprise' ? 9900 : 4900, // $49/mo or $99/mo
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&payment=success`,
        cancel_url: `${returnUrl}?payment=cancelled`,
        metadata: { customerId },
      });

      return c.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        customerId,
      });
    } catch (err: any) {
      console.error('[Stripe Checkout Session Error]:', err.message);
      return c.json({ error: err.message }, 500);
    }
  }

  // Simulated Checkout URL for development
  const simulatedSubId = `sub_sim_${Date.now()}`;
  await db
    .update(customers)
    .set({
      stripeSubscriptionId: customer.stripeSubscriptionId || simulatedSubId,
    })
    .where(eq(customers.id, customerId));

  return c.json({
    checkoutUrl: `${returnUrl}?simulated=true&subscription=${simulatedSubId}`,
    sessionId: `cs_sim_${Date.now()}`,
    customerId,
    simulated: true,
  });
});

// 3. Create Stripe Customer Billing Portal Session
stripeRouter.post('/create-portal-session', async (c) => {
  const body = (await c.req.json()) as { customerId: string; returnUrl?: string };
  const customerId = body.customerId;

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer) return c.json({ error: 'Customer not found' }, 404);

  const returnUrl = body.returnUrl || 'http://localhost:5174/customers/' + customerId;

  if (stripe && customer.stripeCustomerId) {
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.stripeCustomerId,
        return_url: returnUrl,
      });
      return c.json({ portalUrl: portalSession.url });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  return c.json({
    portalUrl: `${returnUrl}?portal_simulated=true`,
    simulated: true,
  });
});

// 4. Development Webhook Simulator (to test active -> past_due -> suspended transitions)
stripeRouter.post('/simulate-webhook', async (c) => {
  const body = (await c.req.json()) as {
    customerId: string;
    action: 'payment_succeeded' | 'payment_failed' | 'subscription_deleted' | 'restore_active';
    paidUntil?: string;
  };

  const { customerId, action } = body;
  if (!customerId) return c.json({ error: 'Missing customerId' }, 400);

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer) return c.json({ error: 'Customer not found' }, 404);

  let newStatus = customer.licenseStatus;
  let newPaidUntil = customer.paidUntil;

  if (action === 'payment_succeeded' || action === 'restore_active') {
    newStatus = 'active';
    newPaidUntil =
      body.paidUntil ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  } else if (action === 'payment_failed') {
    newStatus = 'past_due';
  } else if (action === 'subscription_deleted') {
    newStatus = 'suspended';
  }

  // Update customer record
  await db
    .update(customers)
    .set({
      licenseStatus: newStatus,
      paidUntil: newPaidUntil,
    })
    .where(eq(customers.id, customerId));

  // Bump config version so connected POS terminals automatically hot-reload!
  const latestProfile = await db.query.configProfiles.findFirst({
    where: eq(configProfiles.customerId, customerId),
    orderBy: [desc(configProfiles.version)],
  });

  let nextVersion = (latestProfile?.version ?? 1) + 1;

  if (latestProfile) {
    const updatedConfig = {
      ...(latestProfile.config as object),
      licenseStatus: newStatus,
      paidUntil: newPaidUntil,
      version: nextVersion,
    };

    await db.insert(configProfiles).values({
      customerId,
      version: nextVersion,
      config: updatedConfig,
    });
  }

  return c.json({
    success: true,
    customerId,
    action,
    newStatus,
    newPaidUntil,
    configVersion: nextVersion,
  });
});

// 5. Query Subscription Status
stripeRouter.get('/subscription-status/:customerId', async (c) => {
  const customerId = c.req.param('customerId');

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer) return c.json({ error: 'Customer not found' }, 404);

  return c.json({
    customerId,
    licenseKey: customer.licenseKey,
    licenseStatus: customer.licenseStatus,
    paidUntil: customer.paidUntil,
    stripeCustomerId: customer.stripeCustomerId,
    stripeSubscriptionId: customer.stripeSubscriptionId,
  });
});
