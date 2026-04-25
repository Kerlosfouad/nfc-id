/**
 * Suspend Profile use case.
 *
 * Sets `profile.isSuspended = true` and immediately invalidates the Redis
 * cache entry for the associated `publicId` (within 5 seconds per Req 10.3).
 *
 * Requirements: 10.2, 10.3
 */

import { db } from '../db';
import { del, profileCacheKey } from '../services/cacheService';

// ── Typed errors ──────────────────────────────────────────────────────────────

export class ProfileNotFoundError extends Error {
  constructor(message = 'Profile not found') {
    super(message);
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileAlreadySuspendedError extends Error {
  constructor(message = 'Profile is already suspended') {
    super(message);
    this.name = 'ProfileAlreadySuspendedError';
  }
}

// ── Use case ──────────────────────────────────────────────────────────────────

export interface SuspendProfileInput {
  profileId: string;
}

export interface SuspendProfileResult {
  profileId: string;
  publicId: string;
  isSuspended: true;
}

export async function suspendProfile(
  input: SuspendProfileInput,
): Promise<SuspendProfileResult> {
  const { profileId } = input;

  // 1. Fetch the profile to get its publicId
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true, publicId: true, isSuspended: true },
  });

  if (!profile) {
    throw new ProfileNotFoundError(`Profile with id "${profileId}" not found`);
  }

  if (profile.isSuspended) {
    throw new ProfileAlreadySuspendedError(`Profile "${profileId}" is already suspended`);
  }

  // 2. Set isSuspended = true (Req 10.2)
  await db.profile.update({
    where: { id: profileId },
    data: { isSuspended: true },
  });

  // 3. Invalidate the cache entry for the publicId within 5 seconds (Req 10.3)
  await del(profileCacheKey(profile.publicId));

  return {
    profileId: profile.id,
    publicId: profile.publicId,
    isSuspended: true,
  };
}
