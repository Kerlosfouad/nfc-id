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
import { getProfileSummary, recordEvent } from '@/lib/services/analyticsService';

interface RouteParams {
  params: Promise<{ profileId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { profileId } = await params;
  const days = Number(request.nextUrl.searchParams.get('days') ?? '7');

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
  const summary = await getProfileSummary(profileId, days);

  return NextResponse.json({ data: summary });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { profileId } = await params;

  let body: { eventType?: 'VIEW' | 'CLICK'; linkId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = body.eventType ?? 'CLICK';

  if (eventType === 'CLICK' && !body.linkId) {
    return NextResponse.json({ error: 'linkId is required' }, { status: 400 });
  }

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { publicId: true },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  let linkId: string | null = null;
  if (eventType === 'CLICK') {
    const link = await db.link.findFirst({
      where: { id: body.linkId, profileId },
      select: { id: true },
    });
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }
    linkId = link.id;
  }

  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : '0.0.0.0';
  const userAgent = request.headers.get('user-agent') ?? '';
  const referer = request.headers.get('referer') ?? '';

  await recordEvent({
    profileId,
    publicId: profile.publicId,
    eventType,
    linkId,
    rawIp,
    userAgent,
    referralSource: referer ? 'SOCIAL' : 'DIRECT',
    geoCountry: request.headers.get('x-vercel-ip-country'),
    geoSubdivision: request.headers.get('x-vercel-ip-country-region'),
  });

  return NextResponse.json({ data: { ok: true } });
}
