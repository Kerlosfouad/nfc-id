/**
 * Property-based test for link scheduling filter correctness.
 *
 * Property 4: Link scheduling filter correctness
 *   For any set of Links with arbitrary `activeFrom`/`activeTo` timestamps
 *   and any evaluation time `t`, the filter function must include exactly
 *   those links where:
 *     (activeFrom == null || activeFrom <= t) &&
 *     (activeTo   == null || activeTo   >  t)
 *
 * **Validates: Requirements 3.3, 3.4**
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ── Mocks (must be declared before importing the module under test) ────────────

vi.mock('../../db', () => ({ db: {} }));
vi.mock('../../services/cacheService', () => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => undefined),
  profileCacheKey: (publicId: string) => `profile:${publicId}`,
  PROFILE_TTL: 60,
}));

import { filterActiveLinks } from '../getProfileWithLinks';
import type { Link } from '../../domain/types';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const uuid = fc.uuid();
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 });
const urlString = fc.webUrl({ validSchemes: ['https'] });

// Constrain dates to a reasonable range to avoid edge cases with extreme timestamps
const dateArb = fc.date({
  min: new Date('2020-01-01T00:00:00.000Z'),
  max: new Date('2030-12-31T23:59:59.999Z'),
  noInvalidDate: true,
});

const linkTypeArb = fc.constantFrom(
  'URL' as const,
  'VCF' as const,
  'WHATSAPP' as const,
  'YOUTUBE' as const,
  'SPOTIFY' as const,
  'TIKTOK' as const,
);

/** Generate a single Link with arbitrary nullable activeFrom/activeTo. */
const linkArb: fc.Arbitrary<Link> = fc.record({
  id: uuid,
  profileId: uuid,
  type: linkTypeArb,
  title: nonEmptyString,
  url: urlString,
  thumbnailUrl: fc.option(urlString, { nil: null }),
  displayOrder: fc.nat(1000),
  activeFrom: fc.option(dateArb, { nil: null }),
  activeTo: fc.option(dateArb, { nil: null }),
  createdAt: dateArb,
  updatedAt: dateArb,
});

/** Generate an array of 0–20 links. */
const linksArb = fc.array(linkArb, { minLength: 0, maxLength: 20 });

// ── Reference implementation ──────────────────────────────────────────────────

/**
 * Pure reference predicate — the ground truth for whether a link is active.
 * This mirrors the spec exactly and is used to verify the implementation.
 */
function isLinkActive(link: Link, now: Date): boolean {
  return (
    (link.activeFrom === null || link.activeFrom <= now) &&
    (link.activeTo === null || link.activeTo > now)
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * **Property 4: Link scheduling filter correctness**
 * **Validates: Requirements 3.3, 3.4**
 */
describe('Property 4: Link scheduling filter correctness', () => {
  it('includes exactly the links where (activeFrom==null||activeFrom<=t) && (activeTo==null||activeTo>t)', () => {
    fc.assert(
      fc.property(linksArb, dateArb, (links, now) => {
        const result = filterActiveLinks(links, now);
        const resultIds = new Set(result.map((l) => l.id));

        // Every link in the result must satisfy the predicate
        for (const link of result) {
          expect(isLinkActive(link, now)).toBe(true);
        }

        // Every link NOT in the result must NOT satisfy the predicate
        for (const link of links) {
          if (!resultIds.has(link.id)) {
            expect(isLinkActive(link, now)).toBe(false);
          }
        }

        // Result count must equal the number of links satisfying the predicate
        const expectedCount = links.filter((l) => isLinkActive(l, now)).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 500 },
    );
  });

  it('returns all links when activeFrom and activeTo are both null', () => {
    fc.assert(
      fc.property(
        fc.array(
          linkArb.map((l) => ({ ...l, activeFrom: null, activeTo: null })),
          { minLength: 1, maxLength: 10 },
        ),
        dateArb,
        (links, now) => {
          const result = filterActiveLinks(links, now);
          expect(result.length).toBe(links.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('excludes links where activeFrom is strictly in the future', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 86_400_000 }), // 1ms to 1 day offset
        (now, offsetMs) => {
          const futureFrom = new Date(now.getTime() + offsetMs);
          const link: Link = {
            id: 'test-id',
            profileId: 'profile-id',
            type: 'URL',
            title: 'Future link',
            url: 'https://example.com',
            thumbnailUrl: null,
            displayOrder: 0,
            activeFrom: futureFrom,
            activeTo: null,
            createdAt: now,
            updatedAt: now,
          };
          const result = filterActiveLinks([link], now);
          expect(result.length).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('excludes links where activeTo is in the past or equal to now', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 0, max: 86_400_000 }), // 0ms (equal) to 1 day in the past
        (now, offsetMs) => {
          const pastTo = new Date(now.getTime() - offsetMs);
          const link: Link = {
            id: 'test-id',
            profileId: 'profile-id',
            type: 'URL',
            title: 'Expired link',
            url: 'https://example.com',
            thumbnailUrl: null,
            displayOrder: 0,
            activeFrom: null,
            activeTo: pastTo,
            createdAt: now,
            updatedAt: now,
          };
          const result = filterActiveLinks([link], now);
          expect(result.length).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('includes links where activeTo is strictly in the future', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 86_400_000 }), // 1ms to 1 day in the future
        (now, offsetMs) => {
          const futureTo = new Date(now.getTime() + offsetMs);
          const link: Link = {
            id: 'test-id',
            profileId: 'profile-id',
            type: 'URL',
            title: 'Active link',
            url: 'https://example.com',
            thumbnailUrl: null,
            displayOrder: 0,
            activeFrom: null,
            activeTo: futureTo,
            createdAt: now,
            updatedAt: now,
          };
          const result = filterActiveLinks([link], now);
          expect(result.length).toBe(1);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('returns empty array for empty input', () => {
    fc.assert(
      fc.property(dateArb, (now) => {
        const result = filterActiveLinks([], now);
        expect(result).toEqual([]);
      }),
      { numRuns: 50 },
    );
  });
});
