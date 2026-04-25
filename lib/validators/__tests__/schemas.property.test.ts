/**
 * Property-based tests for round-trip serialization of Profile and Link objects.
 *
 * Property 2: Profile round-trip serialization
 *   Validates: Requirements 11.2
 *
 * Property 3: Link round-trip serialization
 *   Validates: Requirements 11.3
 *
 * serialize   = JSON.stringify
 * deserialize = JSON.parse + Zod parse (with z.coerce.date() handling Date ↔ string)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ProfileSchema, LinkSchema } from '../schemas';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Serialize then deserialize through Zod (mirrors the real API boundary). */
function roundTripProfile(p: unknown) {
  return ProfileSchema.parse(JSON.parse(JSON.stringify(p)));
}

function roundTripLink(l: unknown) {
  return LinkSchema.parse(JSON.parse(JSON.stringify(l)));
}

/**
 * Compare two values that may contain Dates.
 * After a JSON round-trip, Dates become ISO strings; Zod's z.coerce.date()
 * converts them back to Date objects, so we compare via .toISOString().
 */
function datesEqual(a: Date, b: Date) {
  return a.toISOString() === b.toISOString();
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

const uuid = fc.uuid();
const nonEmptyString = fc.string({ minLength: 1, maxLength: 100 });
const urlString = fc.webUrl({ validSchemes: ['https'] });
// Constrain to valid, finite dates to avoid NaN/Invalid Date edge cases
const isoDate = fc.date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2030-12-31T23:59:59.999Z'), noInvalidDate: true });

const hexChar = fc.constantFrom('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f');
const hexColor = fc.array(hexChar, { minLength: 6, maxLength: 6 }).map(chars => `#${chars.join('')}`);

const profileThemeArb = fc.record({
  style: fc.constantFrom('gradient' as const, 'glassmorphism' as const, 'minimal' as const),
  primaryColor: hexColor,
  fontFamily: nonEmptyString,
});

const profileArb = fc.record({
  id: uuid,
  publicId: nonEmptyString,
  ownerId: uuid,
  displayName: nonEmptyString,
  bio: fc.option(nonEmptyString, { nil: null }),
  avatarUrl: fc.option(urlString, { nil: null }),
  theme: profileThemeArb,
  passwordProtected: fc.boolean(),
  pinHash: fc.option(nonEmptyString, { nil: null }),
  sensitiveContent: fc.boolean(),
  isActive: fc.boolean(),
  isSuspended: fc.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const linkTypeArb = fc.constantFrom(
  'URL' as const,
  'VCF' as const,
  'WHATSAPP' as const,
  'YOUTUBE' as const,
  'SPOTIFY' as const,
  'TIKTOK' as const,
);

const linkArb = fc.record({
  id: uuid,
  profileId: uuid,
  type: linkTypeArb,
  title: nonEmptyString,
  url: urlString,
  thumbnailUrl: fc.option(urlString, { nil: null }),
  displayOrder: fc.nat(1000),
  activeFrom: fc.option(isoDate, { nil: null }),
  activeTo: fc.option(isoDate, { nil: null }),
  createdAt: isoDate,
  updatedAt: isoDate,
});

// ── Tests ────────────────────────────────────────────────────────────────────

/**
 * **Property 2: Profile round-trip serialization**
 * **Validates: Requirements 11.2**
 */
describe('Property 2: Profile round-trip serialization', () => {
  it('deserialize(serialize(p)) equals p for all Profile objects', () => {
    fc.assert(
      fc.property(profileArb, (profile) => {
        const result = roundTripProfile(profile);

        // Scalar fields must be identical
        expect(result.id).toBe(profile.id);
        expect(result.publicId).toBe(profile.publicId);
        expect(result.ownerId).toBe(profile.ownerId);
        expect(result.displayName).toBe(profile.displayName);
        expect(result.bio).toBe(profile.bio);
        expect(result.avatarUrl).toBe(profile.avatarUrl);
        expect(result.passwordProtected).toBe(profile.passwordProtected);
        expect(result.pinHash).toBe(profile.pinHash);
        expect(result.sensitiveContent).toBe(profile.sensitiveContent);
        expect(result.isActive).toBe(profile.isActive);
        expect(result.isSuspended).toBe(profile.isSuspended);

        // Theme object must be deeply equal
        expect(result.theme).toEqual(profile.theme);

        // Date fields: compare via ISO string (JSON round-trip converts Date → string → Date)
        expect(datesEqual(result.createdAt, profile.createdAt)).toBe(true);
        expect(datesEqual(result.updatedAt, profile.updatedAt)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * **Property 3: Link round-trip serialization**
 * **Validates: Requirements 11.3**
 */
describe('Property 3: Link round-trip serialization', () => {
  it('deserialize(serialize(l)) equals l for all Link objects', () => {
    fc.assert(
      fc.property(linkArb, (link) => {
        const result = roundTripLink(link);

        // Scalar fields
        expect(result.id).toBe(link.id);
        expect(result.profileId).toBe(link.profileId);
        expect(result.type).toBe(link.type);
        expect(result.title).toBe(link.title);
        expect(result.url).toBe(link.url);
        expect(result.thumbnailUrl).toBe(link.thumbnailUrl);
        expect(result.displayOrder).toBe(link.displayOrder);

        // Nullable date fields
        if (link.activeFrom !== null) {
          expect(result.activeFrom).not.toBeNull();
          expect(datesEqual(result.activeFrom!, link.activeFrom)).toBe(true);
        } else {
          expect(result.activeFrom).toBeNull();
        }

        if (link.activeTo !== null) {
          expect(result.activeTo).not.toBeNull();
          expect(datesEqual(result.activeTo!, link.activeTo)).toBe(true);
        } else {
          expect(result.activeTo).toBeNull();
        }

        // Non-nullable date fields
        expect(datesEqual(result.createdAt, link.createdAt)).toBe(true);
        expect(datesEqual(result.updatedAt, link.updatedAt)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
