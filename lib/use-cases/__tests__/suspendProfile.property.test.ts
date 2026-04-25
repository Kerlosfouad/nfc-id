/**
 * Property-based test for cache invalidation consistency.
 *
 * Property 7: Cache invalidation consistency
 *   After any operation that modifies a Tag or Profile (claim, state change,
 *   profile save, suspension), the cache entry for the associated `publicId`
 *   must not return stale data on the next read (i.e., the cache key must be
 *   absent or reflect the updated state).
 *
 *   This test focuses on the `suspendProfile` use case: after suspension, the
 *   cache key for the profile's publicId must be deleted.
 *
 * **Validates: Requirements 2.5, 4.5, 9.3, 10.3**
 *
 * Prisma client and Redis cache are mocked so no real DB/Redis connection is
 * required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/cacheService', () => ({
  del: vi.fn(async () => undefined),
  profileCacheKey: (publicId: string) => `profile:${publicId}`,
}));

vi.mock('../../db', () => ({
  db: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import AFTER mocks are set up
import {
  suspendProfile,
  ProfileNotFoundError,
  ProfileAlreadySuspendedError,
} from '../suspendProfile';
import { del } from '../../services/cacheService';
import { db } from '../../db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupProfile(opts: {
  exists: boolean;
  isSuspended?: boolean;
  profileId?: string;
  publicId?: string;
}) {
  const profileId = opts.profileId ?? 'profile-uuid';
  const publicId = opts.publicId ?? 'pub-abc123';

  if (!opts.exists) {
    vi.mocked(db.profile.findUnique).mockResolvedValue(null);
    return;
  }

  vi.mocked(db.profile.findUnique).mockResolvedValue({
    id: profileId,
    publicId,
    isSuspended: opts.isSuspended ?? false,
  } as never);

  vi.mocked(db.profile.update).mockResolvedValue({
    id: profileId,
    publicId,
    isSuspended: true,
  } as never);
}

// ── Property test ─────────────────────────────────────────────────────────────

/**
 * **Property 7: Cache invalidation consistency**
 * **Validates: Requirements 2.5, 4.5, 9.3, 10.3**
 */
describe('Property 7: Cache invalidation consistency — suspendProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cache key for publicId is always deleted after suspendProfile succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary profileId and publicId strings
        fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
        async (profileId, publicId) => {
          vi.clearAllMocks();

          setupProfile({ exists: true, isSuspended: false, profileId, publicId });

          await suspendProfile({ profileId });

          // The cache key for the profile's publicId must have been deleted
          expect(del).toHaveBeenCalledWith(`profile:${publicId}`);
          expect(vi.mocked(del)).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cache key deleted uses the correct profileCacheKey format for any publicId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate publicIds with various formats (alphanumeric, dashes, etc.)
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,32}$/),
        async (publicId) => {
          vi.clearAllMocks();

          const profileId = `profile-${publicId}`;
          setupProfile({ exists: true, isSuspended: false, profileId, publicId });

          await suspendProfile({ profileId });

          // Must use the exact cache key format: profile:{publicId}
          expect(del).toHaveBeenCalledWith(`profile:${publicId}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cache is NOT deleted when profile does not exist (throws ProfileNotFoundError)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
        async (profileId) => {
          vi.clearAllMocks();

          setupProfile({ exists: false });

          await expect(suspendProfile({ profileId })).rejects.toThrow(ProfileNotFoundError);

          // Cache must NOT be touched when the profile doesn't exist
          expect(del).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });

  it('cache is NOT deleted when profile is already suspended (throws ProfileAlreadySuspendedError)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
        async (profileId, publicId) => {
          vi.clearAllMocks();

          setupProfile({ exists: true, isSuspended: true, profileId, publicId });

          await expect(suspendProfile({ profileId })).rejects.toThrow(ProfileAlreadySuspendedError);

          // Cache must NOT be touched for already-suspended profiles
          expect(del).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });

  it('suspendProfile sets isSuspended=true and returns correct result shape', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
        async (profileId, publicId) => {
          vi.clearAllMocks();

          setupProfile({ exists: true, isSuspended: false, profileId, publicId });

          const result = await suspendProfile({ profileId });

          expect(result.profileId).toBe(profileId);
          expect(result.publicId).toBe(publicId);
          expect(result.isSuspended).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
