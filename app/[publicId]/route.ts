import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as cacheService from '@/lib/services/cacheService';
import { check as checkRateLimit, hashIp } from '@/lib/services/rateLimitService';
import type { TagState } from '@/lib/domain/types';

/** Map a TagState to the redirect destination path. */
function resolveDestination(state: TagState, publicId: string): string {
  if (state === 'MANUFACTURED' || state === 'SOLD') return `/claim/${publicId}`;
  if (state === 'CLAIMED' || state === 'ACTIVE') return `/profile/${publicId}`;
  // SUSPENDED
  return '/suspended';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;

  // ── 1. Extract source IP ──────────────────────────────────────────────────
  const forwarded = request.headers.get('x-forwarded-for');
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : '0.0.0.0';
  const ipHash = hashIp(rawIp);

  // ── 2. Rate limiting: 30 req / 60s per (publicId, sourceIp) ──────────────
  const rateLimit = await checkRateLimit(publicId, ipHash);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
      { status: 429 },
    );
  }

  // ── 3. Cache lookup ───────────────────────────────────────────────────────
  const cacheKey = cacheService.tagCacheKey(publicId);
  const cachedState = await cacheService.get<TagState>(cacheKey);

  if (cachedState) {
    return NextResponse.redirect(
      new URL(resolveDestination(cachedState, publicId), request.url),
    );
  }

  // ── 4. DB lookup ──────────────────────────────────────────────────────────
  const tag = await db.tag.findUnique({ where: { publicId } });

  if (!tag) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Tag '${publicId}' does not exist.` } },
      { status: 404 },
    );
  }

  // ── 5. Populate cache (TTL: 60s) ──────────────────────────────────────────
  await cacheService.set(cacheKey, tag.state, cacheService.TAG_TTL);

  // ── 6. Redirect ───────────────────────────────────────────────────────────
  return NextResponse.redirect(
    new URL(resolveDestination(tag.state as TagState, publicId), request.url),
  );
}
