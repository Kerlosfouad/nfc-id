import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

// GET /api/v1/profiles — list all profiles owned by the authenticated user
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const profiles = await db.profile.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      publicId: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      isActive: true,
      isSuspended: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: profiles, error: null });
}
