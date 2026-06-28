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

// ── Schema ────────────────────────────────────────────────────────────────────

const ReorderLinksSchema = z.object({
  links: z
    .array(
      z.object({
        id: z.string().uuid(),
        displayOrder: z.number().int().nonnegative(),
      })
    )
    .min(1),
});

// ── PUT /api/v1/profiles/:id/links/order ──────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;

  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) return notFound();
  if (profile.ownerId !== userId) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parsed = ReorderLinksSchema.safeParse(body);
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

  const { links } = parsed.data;

  // Verify all link IDs belong to this profile
  const existingLinks = await db.link.findMany({
    where: { profileId: id },
    select: { id: true },
  });
  const ownedIds = new Set(existingLinks.map((l: { id: string }) => l.id));
  const allOwned = links.every((l) => ownedIds.has(l.id));

  if (!allOwned) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'One or more link IDs do not belong to this profile',
        },
      },
      { status: 400 }
    );
  }

  // Atomically update all display orders in a transaction
  await db.$transaction(
    links.map(({ id: linkId, displayOrder }) =>
      db.link.update({
        where: { id: linkId },
        data: { displayOrder },
      })
    )
  );

  void del(profileCacheKey(profile.publicId));

  return NextResponse.json({ data: { updated: links.length }, error: null });
}
