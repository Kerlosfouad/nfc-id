import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { del, profileCacheKey } from '@/lib/services/cacheService';
import { CreateLinkSchema } from '@/lib/validators/schemas';

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

// ── POST /api/v1/profiles/:id/links ──────────────────────────────────────────

export async function POST(
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

  const parsed = CreateLinkSchema.safeParse(body);
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

  const { displayOrder, ...rest } = parsed.data;

  // Default displayOrder to end of list if not provided
  let order = displayOrder;
  if (order === undefined) {
    const maxOrder = await db.link.aggregate({
      where: { profileId: id },
      _max: { displayOrder: true },
    });
    order = (maxOrder._max.displayOrder ?? -1) + 1;
  }

  const link = await db.link.create({
    data: {
      ...rest,
      thumbnailUrl: rest.thumbnailUrl ?? null,
      activeFrom: rest.activeFrom ?? null,
      activeTo: rest.activeTo ?? null,
      displayOrder: order,
      profileId: id,
    },
  });

  // Invalidate cache
  await del(profileCacheKey(profile.publicId));

  return NextResponse.json({ data: link, error: null }, { status: 201 });
}
