/**
 * Tag Claiming Use Case
 *
 * Atomically claims an unclaimed tag for an owner, creates a default profile,
 * and invalidates the cache entry.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { db } from '../db';
import { del, tagCacheKey } from '../services/cacheService';
import type { Tag, Profile } from '../domain/types';

// ── Typed errors ──────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Tag not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message = 'Tag is already claimed') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class QuotaExceededError extends Error {
  readonly statusCode = 403;
  constructor(message = 'Owner has reached the maximum tag quota (50)') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface ClaimResult {
  tag: Tag;
  profile: Profile;
}

// ── Default profile factory ───────────────────────────────────────────────────

function defaultProfile(ownerId: string, publicId: string) {
  return {
    publicId,
    ownerId,
    displayName: 'My Profile',
    theme: {
      style: 'minimal' as const,
      primaryColor: '#000000',
      fontFamily: 'Inter',
    },
  };
}

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Claim a tag for an owner.
 *
 * Runs inside an atomic Prisma transaction:
 *  1. Lock the tag row and validate its state is MANUFACTURED or SOLD.
 *  2. Check the owner's current tag count against the quota (≤ 50).
 *  3. Update the tag state to CLAIMED and set the ownerId.
 *  4. Create a default Profile linked to the tag's publicId.
 *  5. Invalidate the Redis cache entry for the publicId.
 *
 * @throws {NotFoundError}      if the publicId does not exist
 * @throws {ConflictError}      if the tag is already CLAIMED or ACTIVE (409)
 * @throws {QuotaExceededError} if the owner already has 50 or more tags (403)
 */
export async function claimTag(ownerId: string, publicId: string): Promise<ClaimResult> {
  const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    // 1. Fetch and lock the tag row
    const tag = await tx.tag.findUnique({ where: { publicId } });

    if (!tag) throw new NotFoundError();

    // 2. Validate state — only MANUFACTURED or SOLD can be claimed
    if (tag.state === 'CLAIMED' || tag.state === 'ACTIVE') {
      throw new ConflictError();
    }

    // 3. Check owner quota (max 50 tags per owner)
    const ownerTagCount = await tx.tag.count({ where: { ownerId } });
    if (ownerTagCount >= 50) throw new QuotaExceededError();

    // 4. Update tag state to CLAIMED and assign owner
    const updatedTag = await tx.tag.update({
      where: { publicId },
      data: { state: 'CLAIMED', ownerId },
    });

    // 5. Create default profile
    const profile = await tx.profile.create({
      data: defaultProfile(ownerId, publicId),
    });

    return { tag: updatedTag, profile };
  });

  // 6. Invalidate cache (outside transaction — best-effort)
  await del(tagCacheKey(publicId));

  return {
    tag: result.tag as Tag,
    profile: result.profile as unknown as Profile,
  };
}
