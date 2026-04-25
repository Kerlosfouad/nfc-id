/**
 * POST /api/v1/reports
 *
 * Public endpoint — any Visitor can submit a report against a Profile.
 * Creates a ModerationTicket linked to the reported Profile.
 * The reporter's IP is hashed (SHA-256) before storage; raw IP is never persisted.
 *
 * Requirements: 10.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { db } from '@/lib/db';

const ReportBodySchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  reason: z.string().min(1, 'reason is required').max(1000, 'reason must be 1000 characters or fewer'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const parsed = ReportBodySchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.') || 'body'] = issue.message;
    }
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields } },
      { status: 400 },
    );
  }

  const { profileId, reason } = parsed.data;

  // 2. Hash the reporter's IP (SHA-256) — raw IP never stored (Req 6.2)
  const rawIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const reporterIpHash = createHash('sha256').update(rawIp).digest('hex');

  // 3. Verify the profile exists
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } },
      { status: 404 },
    );
  }

  // 4. Create the ModerationTicket (status defaults to OPEN — notifies admin dashboard via DB)
  const ticket = await db.moderationTicket.create({
    data: {
      profileId,
      reporterIpHash,
      reason,
      status: 'OPEN',
    },
    select: {
      id: true,
      profileId: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: ticket, error: null }, { status: 201 });
}
