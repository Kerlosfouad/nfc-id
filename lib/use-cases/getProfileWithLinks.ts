/**
 * Get Profile With Links Use Case
 *
 * Fetches a Profile and its associated Links by publicId, using Redis cache
 * for low-latency reads. Returns the profile with all links (unfiltered) so
 * the caller can apply scheduling filters at render time.
 *
 * Also exports `filterActiveLinks` for isolated testing (Property 4).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { db } from '../db';
import { get, set, profileCacheKey, PROFILE_TTL } from '../services/cacheService';
import type { Profile, Link } from '../domain/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProfileWithLinks = Profile & { links: Link[] };

// ── Link scheduling filter ────────────────────────────────────────────────────

/**
 * Filter links to only those active at the given evaluation time `now`.
 *
 * A link is active when:
 *   (activeFrom == null || activeFrom <= now) &&
 *   (activeTo   == null || activeTo   >  now)
 *
 * Requirements: 3.3, 3.4
 */
export function filterActiveLinks(links: Link[], now: Date): Link[] {
  return links.filter(
    (link) =>
      (link.activeFrom === null || link.activeFrom <= now) &&
      (link.activeTo === null || link.activeTo > now),
  );
}

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Fetch a Profile and its Links by publicId.
 *
 * Cache strategy:
 *  - Check Redis first (key: `profile:{publicId}`, TTL: 60s)
 *  - On cache miss: query DB, sort links by displayOrder, populate cache
 *
 * Returns null if no profile exists for the given publicId.
 */
export async function getProfileWithLinks(
  publicId: string,
): Promise<ProfileWithLinks | null> {
  const cacheKey = profileCacheKey(publicId);

  // ── 1. Cache lookup ─────────────────────────────────────────────────────────
  const cached = await get<ProfileWithLinks>(cacheKey);
  if (cached) {
    // Rehydrate Date fields that JSON serialization converts to strings
    return rehydrateDates(cached);
  }

  // ── 2. DB lookup ────────────────────────────────────────────────────────────
  const row = await db.profile.findUnique({
    where: { publicId },
    include: {
      links: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!row) return null;

  const profile = row as unknown as ProfileWithLinks;

  // ── 3. Populate cache ───────────────────────────────────────────────────────
  await set(cacheKey, profile, PROFILE_TTL);

  return profile;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * After a Redis round-trip, Date fields arrive as ISO strings.
 * Convert them back to Date objects so callers always receive proper Dates.
 */
function rehydrateDates(profile: ProfileWithLinks): ProfileWithLinks {
  return {
    ...profile,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
    links: profile.links.map((link) => ({
      ...link,
      activeFrom: link.activeFrom ? new Date(link.activeFrom) : null,
      activeTo: link.activeTo ? new Date(link.activeTo) : null,
      createdAt: new Date(link.createdAt),
      updatedAt: new Date(link.updatedAt),
    })),
  };
}
