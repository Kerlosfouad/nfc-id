/**
 * GET /api/v1/admin/tags
 *
 * Admin-only endpoint to search and list Tags.
 * Supports filtering by publicId, state, ownerId, and createdAt date range.
 *
 * Query params:
 *   publicId      — exact match
 *   state         — one of MANUFACTURED | SOLD | CLAIMED | ACTIVE | SUSPENDED
 *   ownerId       — exact match
 *   createdAtFrom — ISO 8601 date string (inclusive lower bound)
 *   createdAtTo   — ISO 8601 date string (inclusive upper bound)
 *
 * Requirements: 9.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';

const QuerySchema = z.object({
  publicId: z.string().optional(),
  state: z
    .enum(['MANUFACTURED', 'SOLD', 'CLAIMED', 'ACTIVE', 'SUSPENDED'])
    .optional(),
  ownerId: z.string().optional(),
  createdAtFrom: z.string().datetime({ offset: true }).optional(),
  createdAtTo: z.string().datetime({ offset: true }).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Require admin
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  // 2. Parse query params
  const { searchParams } = request.nextUrl;
  const rawQuery = {
    publicId: searchParams.get('publicId') ?? undefined,
    state: searchParams.get('state') ?? undefined,
    ownerId: searchParams.get('ownerId') ?? undefined,
    createdAtFrom: searchParams.get('createdAtFrom') ?? undefined,
    createdAtTo: searchParams.get('createdAtTo') ?? undefined,
  };

  const parsed = QuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.') || 'query'] = issue.message;
    }
    return NextResponse.json(
      {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', fields },
      },
      { status: 400 },
    );
  }

  const { publicId, state, ownerId, createdAtFrom, createdAtTo } = parsed.data;

  // 4. Build Prisma where clause
  const where: Record<string, unknown> = {};

  if (publicId !== undefined) where.publicId = publicId;
  if (state !== undefined) where.state = state;
  if (ownerId !== undefined) where.ownerId = ownerId;

  if (createdAtFrom !== undefined || createdAtTo !== undefined) {
    const createdAt: Record<string, Date> = {};
    if (createdAtFrom !== undefined) createdAt.gte = new Date(createdAtFrom);
    if (createdAtTo !== undefined) createdAt.lte = new Date(createdAtTo);
    where.createdAt = createdAt;
  }

  // 5. Query DB
  const tags = await db.tag.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      publicId: true,
      state: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: tags, error: null }, { status: 200 });
}
