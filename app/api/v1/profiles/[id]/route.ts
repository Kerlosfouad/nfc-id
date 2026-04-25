import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { del, profileCacheKey } from '@/lib/services/cacheService';

// ── Auth helper ───────────────────────────────────────────────────────────────

function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    { status: 401 }
  );
}

function forbidden() {
  return NextResponse.json(
    { data: null, error: { code: 'FORBIDDEN', message: 'Access denied' } },
    { status: 403 }
  );
}

function notFound() {
  return NextResponse.json(
    { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } },
    { status: 404 }
  );
}

// ── PATCH schema ──────────────────────────────────────────────────────────────

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  theme: z
    .object({
      style: z.enum(['gradient', 'glassmorphism', 'minimal']),
      primaryColor: z.string().min(1),
      fontFamily: z.string().min(1),
    })
    .optional(),
  passwordProtected: z.boolean().optional(),
  pinHash: z.string().nullable().optional(),
  sensitiveContent: z.boolean().optional(),
});

// ── GET /api/v1/profiles/:id ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;

  const profile = await db.profile.findUnique({
    where: { id },
    include: { links: { orderBy: { displayOrder: 'asc' } } },
  });

  if (!profile) return notFound();
  if (profile.ownerId !== userId) return forbidden();

  return NextResponse.json({ data: profile, error: null });
}

// ── PATCH /api/v1/profiles/:id ────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;

  // Fetch profile first to verify ownership and get publicId for cache invalidation
  const existing = await db.profile.findUnique({ where: { id } });
  if (!existing) return notFound();
  if (existing.ownerId !== userId) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.')] = issue.message;
    }
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields } },
      { status: 400 }
    );
  }

  const updated = await db.profile.update({
    where: { id },
    data: parsed.data,
    include: { links: { orderBy: { displayOrder: 'asc' } } },
  });

  // Invalidate Redis cache for this profile's publicId
  await del(profileCacheKey(existing.publicId));

  return NextResponse.json({ data: updated, error: null });
}
