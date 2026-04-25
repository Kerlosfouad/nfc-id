/**
 * GET /api/v1/analytics/[profileId]
 *
 * Owner-only endpoint that returns an aggregated analytics summary for the
 * given profile. Uses the x-user-id header for ownership verification
 * (Task 11 will replace this with real JWT middleware).
 *
 * Requirements: 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProfileSummary } from '@/lib/services/analyticsService';

interface RouteParams {
  params: Promise<{ profileId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { profileId } = await params;

  // Temporary auth: read requesting user from header (replaced by JWT in Task 11)
  const requestingUserId = request.headers.get('x-user-id');
  if (!requestingUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the profile exists and the requesting user is the owner
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { ownerId: true },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (profile.ownerId !== requestingUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Return summary (max 60s staleness via Redis cache)
  const summary = await getProfileSummary(profileId);

  return NextResponse.json({ data: summary });
}
