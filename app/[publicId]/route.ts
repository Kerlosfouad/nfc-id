import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as cacheService from '@/lib/services/cacheService';
import type { TagState } from '@/lib/domain/types';

const RESERVED_PUBLIC_PATHS = new Set([
  'admin',
  'api',
  'auth',
  'checkout',
  'claim',
  'connect-nfc',
  'dashboard',
  'login',
  'privacy',
  'profile',
  'scan',
  'shop',
  'signup',
  'suspended',
  'terms',
]);

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

  if (RESERVED_PUBLIC_PATHS.has(publicId.toLowerCase())) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Page not found.' } },
      { status: 404 },
    );
  }

  const cacheKey = cacheService.tagCacheKey(publicId);
  const cachedState = await cacheService.get<TagState>(cacheKey);

  if (cachedState) {
    if (cachedState === 'MANUFACTURED' || cachedState === 'SOLD') {
      const profile = await db.profile.findUnique({
        where: { publicId },
        select: { publicId: true, isActive: true, isSuspended: true },
      });

      if (profile?.isSuspended || profile?.isActive === false) {
        return NextResponse.redirect(new URL('/suspended', request.url));
      }

      if (profile) {
        void cacheService.del(cacheKey);
        return NextResponse.redirect(new URL(`/profile/${profile.publicId}`, request.url));
      }
    }

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

  void cacheService.set(cacheKey, tag.state, cacheService.TAG_TTL);

  if (tag.state === 'MANUFACTURED' || tag.state === 'SOLD') {
    const profile = await db.profile.findUnique({
      where: { publicId },
      select: { publicId: true, isActive: true, isSuspended: true },
    });

    if (profile?.isSuspended || profile?.isActive === false) {
      return NextResponse.redirect(new URL('/suspended', request.url));
    }

    if (profile) {
      void cacheService.del(cacheKey);
      return NextResponse.redirect(new URL(`/profile/${profile.publicId}`, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(resolveDestination(tag.state as TagState, publicId), request.url),
  );
}
