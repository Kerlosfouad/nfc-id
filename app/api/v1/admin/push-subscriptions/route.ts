import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { deletePushSubscription, savePushSubscription, sendPushToUser } from '@/lib/services/pushNotifications';

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = SubscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid push subscription.' } },
      { status: 400 },
    );
  }

  await savePushSubscription(auth.userId, parsed.data);
  void sendPushToUser(auth.userId, {
    title: 'LinkUp notifications enabled',
    body: 'Order alerts are now active on this phone.',
    url: '/admin/orders',
    tag: 'linkup-push-test',
  });
  return NextResponse.json({ data: { ok: true }, error: null });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid push endpoint.' } },
      { status: 400 },
    );
  }

  await deletePushSubscription(parsed.data.endpoint);
  return NextResponse.json({ data: { ok: true }, error: null });
}
