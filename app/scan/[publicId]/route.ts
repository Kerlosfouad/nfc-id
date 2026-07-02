import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as cacheService from '@/lib/services/cacheService';
import { check as checkRateLimit, hashIp } from '@/lib/services/rateLimitService';
import type { TagState } from '@/lib/domain/types';
import { resolveTagScanDestination } from '@/lib/use-cases/resolveTagScanDestination';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;

  const forwarded = request.headers.get('x-forwarded-for');
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : '0.0.0.0';
  const ipHash = hashIp(rawIp);

  const rateLimit = await checkRateLimit(publicId, ipHash);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
      { status: 429 },
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
      new URL(resolveTagScanDestination({ publicId, state: cachedState }), request.url),
    );
  }

  const tag = await db.tag.findUnique({ where: { publicId } });

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
    new URL(resolveTagScanDestination({ publicId, state: tag.state as TagState }), request.url),
  );
}
