import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';
import { del, profileCacheKey } from '@/lib/services/cacheService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: profileId } = await params;
  const body = await request.json().catch(() => ({}));
  const verified = body.verified !== false; // default true

  const profile = await db.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } }, { status: 404 });
  }

  const updated = await db.profile.update({
    where: { id: profileId },
    data: { isVerified: verified },
  });

  await del(profileCacheKey(profile.publicId));

  return NextResponse.json({ data: { id: updated.id, isVerified: updated.isVerified }, error: null });
}
