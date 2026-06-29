import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

// GET /api/v1/profiles — list all profiles owned by the authenticated user
export async function GET(request: NextRequest) {
  try {
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
        theme: true,
        passwordProtected: true,
        sensitiveContent: true,
        isActive: true,
        isSuspended: true,
        isVerified: true,
        primeDesignUntil: true,
        verifiedUntil: true,
        createdAt: true,
        updatedAt: true,
        links: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ data: profiles, error: null });
  } catch (error) {
    console.error('Load profiles failed', error);
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Failed to load profiles. Please make sure the database migration has finished.' } },
      { status: 500 }
    );
  }
}
