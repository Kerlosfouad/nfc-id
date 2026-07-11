import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as cacheService from '@/lib/services/cacheService';
import type { TagState } from '@/lib/domain/types';
import { createNfcLinkSession } from '@/lib/use-cases/nfcLinkSession';

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

async function resolveDestination(state: TagState, publicId: string): Promise<string> {
  if (state === 'MANUFACTURED' || state === 'SOLD') {
    const sessionId = await createNfcLinkSession({ publicId });
    return `/signup?nfcSession=${encodeURIComponent(sessionId)}`;
  }
  if (state === 'CLAIMED' || state === 'ACTIVE') return `/profile/${publicId}`;
  return '/suspended';
}

function redirectWithNfcSession(url: URL, sessionId?: string) {
  const response = NextResponse.redirect(url);
  if (sessionId) {
    response.cookies.set('linkup_nfc_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60,
    });
    response.cookies.set('linkup_auth_redirect', encodeURIComponent(`/connect-nfc?nfcSession=${encodeURIComponent(sessionId)}`), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60,
    });
  }
  return response;
}

function getNfcSessionFromHref(href: string) {
  const session = new URL(href, 'https://linkup.local').searchParams.get('nfcSession');
  return session?.replace(/[^a-zA-Z0-9_-]/g, '') || undefined;
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

    const href = await resolveDestination(cachedState, publicId);
    return redirectWithNfcSession(new URL(href, request.url), getNfcSessionFromHref(href));
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

  const href = await resolveDestination(tag.state as TagState, publicId);
  return redirectWithNfcSession(new URL(href, request.url), getNfcSessionFromHref(href));
}
