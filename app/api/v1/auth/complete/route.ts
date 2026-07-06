import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'A verified email is required.' } },
      { status: 400 },
    );
  }

  await db.user.upsert({
    where: { id: auth.userId },
    update: { email },
    create: { id: auth.userId, email, role: 'USER' },
  });

  return NextResponse.json({ data: { id: auth.userId, email }, error: null });
}
