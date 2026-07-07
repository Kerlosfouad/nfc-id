import webPush from 'web-push';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';

type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

let pushTablesEnsured = false;

export async function ensurePushSubscriptionTable() {
  if (pushTablesEnsured) return;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      expiration_time BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id)
  `);
  pushTablesEnsured = true;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@linkup.local', publicKey, privateKey);
  return true;
}

export async function savePushSubscription(userId: string, subscription: PushSubscriptionInput) {
  await ensurePushSubscriptionTable();
  await db.$executeRaw`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, expiration_time, updated_at)
    VALUES (${randomUUID()}, ${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${subscription.expirationTime ?? null}, NOW())
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      expiration_time = EXCLUDED.expiration_time,
      updated_at = NOW()
  `;
}

export async function deletePushSubscription(endpoint: string) {
  await ensurePushSubscriptionTable();
  await db.$executeRaw`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function sendPushToAdmins(payload: { title: string; body: string; url?: string; tag?: string; image?: string }) {
  if (!configureWebPush()) return;
  await ensurePushSubscriptionTable();

  const subscriptions = await db.$queryRaw<Array<{ endpoint: string; p256dh: string; auth: string }>>`
    SELECT ps.endpoint, ps.p256dh, ps.auth
    FROM push_subscriptions ps
    INNER JOIN "User" u ON u.id = ps.user_id
    WHERE u.role = 'ADMIN'
  `;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await db.$executeRaw`DELETE FROM push_subscriptions WHERE endpoint = ${subscription.endpoint}`;
        }
      }
    }),
  );
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string; image?: string }) {
  if (!configureWebPush()) return;
  await ensurePushSubscriptionTable();

  const subscriptions = await db.$queryRaw<Array<{ endpoint: string; p256dh: string; auth: string }>>`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ${userId}
  `;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await db.$executeRaw`DELETE FROM push_subscriptions WHERE endpoint = ${subscription.endpoint}`;
        }
      }
    }),
  );
}
