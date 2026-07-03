import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { db } from '@/lib/db';
import { del, profileCacheKey, tagCacheKey } from '@/lib/services/cacheService';

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
      style: z.enum(['gradient', 'glassmorphism', 'minimal', 'dark', 'purple-haze', 'rose-gold']),
      primaryColor: z.string().min(1),
      fontFamily: z.string().min(1),
      linksLayout: z.enum(['list', 'grid']).optional(),
      profileLayout: z.enum(['classic', 'hero']).optional(),
      coverUrl: z.string().url().nullable().optional(),
    })
    .optional(),
  passwordProtected: z.boolean().optional(),
  pinHash: z.string().nullable().optional(),
  sensitiveContent: z.boolean().optional(),
});

const PRIME_THEME_STYLES = new Set(['minimal', 'purple-haze', 'rose-gold']);

function isFuture(date: Date | null): boolean {
  return !!date && date.getTime() > Date.now();
}

function themeUsesPrimeDesign(theme: { style?: string; linksLayout?: string; profileLayout?: string }) {
  return (
    (theme.style ? PRIME_THEME_STYLES.has(theme.style) : false) ||
    theme.linksLayout === 'grid' ||
    theme.profileLayout === 'hero'
  );
}

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

  if (parsed.data.theme && !isFuture(existing.primeDesignUntil)) {
    const requestedTheme = parsed.data.theme;
    const currentTheme = (existing.theme ?? {}) as { style?: string; linksLayout?: string; profileLayout?: string };
    const usesPrimeDesign = themeUsesPrimeDesign(requestedTheme);
    const changedPrimeDesign =
      requestedTheme.style !== currentTheme.style ||
      requestedTheme.linksLayout !== currentTheme.linksLayout ||
      requestedTheme.profileLayout !== currentTheme.profileLayout;

    if (usesPrimeDesign && changedPrimeDesign) {
      return NextResponse.json(
        { data: null, error: { code: 'PRIME_REQUIRED', message: 'Prime payment is required to use this design feature' } },
        { status: 403 }
      );
    }
  }

  const updated = await db.profile.update({
    where: { id },
    data: parsed.data,
    include: { links: { orderBy: { displayOrder: 'asc' } } },
  });

  // Invalidate Redis cache without delaying the profile update response.
  void del(profileCacheKey(existing.publicId));

  return NextResponse.json({ data: updated, error: null });
}

// DELETE /api/v1/profiles/:id

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;

  const existing = await db.profile.findUnique({ where: { id } });
  if (!existing) return notFound();
  if (existing.ownerId !== userId) return forbidden();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Auth service is not configured.' } },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return NextResponse.json(
      { data: null, error: { code: 'AUTH_DELETE_FAILED', message: authDeleteError.message } },
      { status: 500 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.nfcTag.updateMany({
      where: {
        userId,
        OR: [
          { profileId: id },
          { profileId: null },
          { uid: `PUBLIC:${existing.publicId}` },
        ],
      },
      data: {
        userId: null,
        profileId: null,
        status: 'UNLINKED',
        linkedAt: null,
      },
    });
    await tx.tag.updateMany({
      where: { publicId: existing.publicId, ownerId: userId },
      data: { ownerId: null, state: 'SOLD' },
    });
    await tx.user.deleteMany({ where: { id: userId } });
  });

  void del(profileCacheKey(existing.publicId));
  void del(tagCacheKey(existing.publicId));

  return NextResponse.json({ data: { id, publicId: existing.publicId }, error: null });
}
