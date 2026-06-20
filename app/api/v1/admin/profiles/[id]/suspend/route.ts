/**
 * POST /api/v1/admin/profiles/[id]/suspend
 *
 * Admin-only endpoint to suspend a Profile.
 * Calls the `suspendProfile` use case which sets `isSuspended = true` and
 * invalidates the Redis cache entry for the associated publicId within 5 seconds.
 *
 * Requirements: 10.2, 10.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import {
  suspendProfile,
  ProfileNotFoundError,
  ProfileAlreadySuspendedError,
} from '@/lib/use-cases/suspendProfile';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: profileId } = await params;

  // Execute use case
  try {
    const result = await suspendProfile({ profileId });
    return NextResponse.json({ data: result, error: null }, { status: 200 });
  } catch (err) {
    if (err instanceof ProfileNotFoundError) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 },
      );
    }
    if (err instanceof ProfileAlreadySuspendedError) {
      return NextResponse.json(
        { data: null, error: { code: 'CONFLICT', message: err.message } },
        { status: 409 },
      );
    }
    throw err;
  }
}
