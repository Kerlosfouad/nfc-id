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

function notFound(resource = 'Resource') {
  return NextResponse.json(
    { data: null, error: { code: 'NOT_FOUND', message: `${resource} not found` } },
    { status: 404 }
  );
}

// ── Update link schema ────────────────────────────────────────────────────────

const UpdateLinkSchema = z.object({
  type: z.enum(['URL', 'VCF', 'WHATSAPP', 'YOUTUBE', 'SPOTIFY', 'TIKTOK']).optional(),
  title: z.string().min(1).max(200).optional(),
  url: z.string().min(1).max(2000).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
  activeFrom: z.coerce.date().nullable().optional(),
  activeTo: z.coerce.date().nullable().optional(),
});

// ── Shared: resolve profile + link, verify ownership ─────────────────────────

async function resolveOwned(
  profileId: string,
  linkId: string,
  userId: string
): Promise<
  | { ok: true; profile: { id: string; publicId: string; ownerId: string }; link: { id: string; profileId: string } }
  | { ok: false; response: NextResponse }
> {
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  if (!profile) return { ok: false, response: notFound('Profile') };
  if (profile.ownerId !== userId) return { ok: false, response: forbidden() };

  const link = await db.link.findUnique({ where: { id: linkId } });
  if (!link || link.profileId !== profileId) return { ok: false, response: notFound('Link') };

  return { ok: true, profile, link };
}

// ── PATCH /api/v1/profiles/:id/links/:linkId ──────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return unauthorized();

  const { id, linkId } = await params;

  const resolved = await resolveOwned(id, linkId, userId);
  if (!resolved.ok) return resolved.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parsed = UpdateLinkSchema.safeParse(body);
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

  const updated = await db.link.update({
    where: { id: linkId },
    data: parsed.data,
  });

  void del(profileCacheKey(resolved.profile.publicId));

  return NextResponse.json({ data: updated, error: null });
}

// ── DELETE /api/v1/profiles/:id/links/:linkId ─────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return unauthorized();

  const { id, linkId } = await params;

  const resolved = await resolveOwned(id, linkId, userId);
  if (!resolved.ok) return resolved.response;

  await db.link.delete({ where: { id: linkId } });
  void del(profileCacheKey(resolved.profile.publicId));

  return NextResponse.json({ data: { id: linkId }, error: null });
}
