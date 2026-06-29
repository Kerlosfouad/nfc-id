import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as cacheService from '@/lib/services/cacheService';
import type { TagState } from '@/lib/domain/types';

function resolveDestination(state: TagState, publicId: string): string {
  if (state === 'MANUFACTURED' || state === 'SOLD') return `/claim/${publicId}`;
  if (state === 'CLAIMED' || state === 'ACTIVE') return `/profile/${publicId}`;
  return '/suspended';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const cacheKey = cacheService.tagCacheKey(publicId);
  const cachedState = await cacheService.get<TagState>(cacheKey);

  if (cachedState) {
    return NextResponse.redirect(
      new URL(resolveDestination(cachedState, publicId), request.url),
    );
  }

  const tag = await db.tag.findUnique({
    where: { publicId },
    select: { state: true },
  });

  if (!tag) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Tag '${publicId}' does not exist.` } },
      { status: 404 },
    );
  }

  await cacheService.set(cacheKey, tag.state, cacheService.TAG_TTL);

  return NextResponse.redirect(
    new URL(resolveDestination(tag.state as TagState, publicId), request.url),
  );
}
