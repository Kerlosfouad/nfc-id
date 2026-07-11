import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';

function newPublicId() {
  return `nfc-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function defaultProfile(ownerId: string, displayName = 'My Profile') {
  return {
    publicId: newPublicId(),
    ownerId,
    displayName,
    theme: {
      style: 'minimal' as const,
      primaryColor: '#03A9F4',
      fontFamily: 'Inter',
    },
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    });

    const profile =
      (await db.profile.findFirst({
        where: { ownerId: auth.userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, publicId: true, displayName: true },
      })) ??
      (await db.profile.create({
        data: defaultProfile(auth.userId, user?.email?.split('@')[0] || 'My Profile'),
        select: { id: true, publicId: true, displayName: true },
      }));

    return NextResponse.json({ data: { profile }, error: null }, { status: 200 });
  } catch (error) {
    console.error('[nfc/prepare-write] Unexpected error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Could not prepare your profile link' } },
      { status: 500 },
    );
  }
}
