import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';
import { del, profileCacheKey } from '@/lib/services/cacheService';

function parseUntil(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: profileId } = await params;
  const body = await request.json().catch(() => ({}));
  const verified = body.verified !== false; // default true
  const verifiedUntil = parseUntil(body.verifiedUntil);
  const primeDesignUntil = parseUntil(body.primeDesignUntil);

  if (('verifiedUntil' in body && verifiedUntil === undefined) || ('primeDesignUntil' in body && primeDesignUntil === undefined)) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid expiry date' } }, { status: 400 });
  }

  const profile = await db.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } }, { status: 404 });
  }

  const updated = await db.profile.update({
    where: { id: profileId },
    data: {
      isVerified: verified,
      ...(verifiedUntil !== undefined ? { verifiedUntil, isVerified: !!verifiedUntil && verifiedUntil.getTime() > Date.now() } : {}),
      ...(primeDesignUntil !== undefined ? { primeDesignUntil } : {}),
    },
  });

  await del(profileCacheKey(profile.publicId));

  return NextResponse.json({
    data: {
      id: updated.id,
      isVerified: updated.isVerified,
      verifiedUntil: updated.verifiedUntil,
      primeDesignUntil: updated.primeDesignUntil,
    },
    error: null,
  });
}
