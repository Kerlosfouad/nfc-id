/**
 * GET  /api/v1/admin/moderation — list moderation tickets (admin only)
 * PATCH /api/v1/admin/moderation/:id — resolve or dismiss a ticket (admin only)
 *
 * GET query params:
 *   sortBy  — reportCount | createdAt | profileOwner  (default: createdAt)
 *   status  — OPEN | RESOLVED | DISMISSED             (default: OPEN)
 *
 * PATCH body:
 *   { status: 'RESOLVED' | 'DISMISSED' }
 *
 * Requirements: 10.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';

// ── GET ───────────────────────────────────────────────────────────────────────

const GetQuerySchema = z.object({
  sortBy: z.enum(['reportCount', 'createdAt', 'profileOwner']).optional().default('createdAt'),
  status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).optional().default('OPEN'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminResult = await requireAdmin(request);
  if (adminResult instanceof NextResponse) return adminResult;

  const { searchParams } = request.nextUrl;
  const rawQuery = {
    sortBy: searchParams.get('sortBy') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  };

  const parsed = GetQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.') || 'query'] = issue.message;
    }
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', fields } },
      { status: 400 },
    );
  }

  const { sortBy, status } = parsed.data;

  // Build orderBy based on sortBy param
  // reportCount requires aggregation — we fetch tickets with profile+owner info
  // and sort in-memory for reportCount (grouping by profileId)
  const tickets = await db.moderationTicket.findMany({
    where: { status },
    orderBy: sortBy === 'createdAt' ? { createdAt: 'desc' } : undefined,
    select: {
      id: true,
      profileId: true,
      reason: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          publicId: true,
          displayName: true,
          ownerId: true,
          owner: {
            select: { id: true, email: true },
          },
        },
      },
    },
  });

  type TicketRow = (typeof tickets)[number];
  type EnrichedTicket = TicketRow & { reportCount: number };

  // Compute report count per profile (number of tickets for the same profileId)
  const reportCountByProfile = tickets.reduce<Record<string, number>>((acc: Record<string, number>, t: TicketRow) => {
    acc[t.profileId] = (acc[t.profileId] ?? 0) + 1;
    return acc;
  }, {});

  const enriched: EnrichedTicket[] = tickets.map((t: TicketRow) => ({
    ...t,
    reportCount: reportCountByProfile[t.profileId] ?? 1,
  }));

  // Apply in-memory sort for non-createdAt sorts
  if (sortBy === 'reportCount') {
    enriched.sort((a: EnrichedTicket, b: EnrichedTicket) => b.reportCount - a.reportCount);
  } else if (sortBy === 'profileOwner') {
    enriched.sort((a: EnrichedTicket, b: EnrichedTicket) =>
      (a.profile.owner?.email ?? '').localeCompare(b.profile.owner?.email ?? ''),
    );
  }

  return NextResponse.json({ data: enriched, error: null }, { status: 200 });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

const PatchBodySchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const adminResult = await requireAdmin(request);
  if (adminResult instanceof NextResponse) return adminResult;

  // Extract ticket id from URL path: /api/v1/admin/moderation/:id
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const ticketId = segments[segments.length - 1];

  if (!ticketId || ticketId === 'moderation') {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Ticket id is required in the URL path' } },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.') || 'status'] = issue.message;
    }
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields } },
      { status: 400 },
    );
  }

  const existing = await db.moderationTicket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Moderation ticket not found' } },
      { status: 404 },
    );
  }

  const updated = await db.moderationTicket.update({
    where: { id: ticketId },
    data: { status: parsed.data.status },
    select: {
      id: true,
      profileId: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: updated, error: null }, { status: 200 });
}
