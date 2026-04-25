/**
 * Property-based test for owner quota enforcement.
 *
 * Property 8: Owner quota enforcement
 *   For any Owner with `n` claimed tags, a claim attempt must succeed if and
 *   only if `n < 50` (or the owner has an elevated quota). The count must be
 *   checked atomically within the claim transaction.
 *
 * **Validates: Requirements 2.6**
 *
 * Prisma client and Redis cache are mocked so no real DB/Redis connection is
 * required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// In-memory state for the mock DB
let mockTagState: string = 'MANUFACTURED';
let mockOwnerTagCount: number = 0;
let mockTagExists: boolean = true;

const mockTx = {
  tag: {
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  profile: {
    create: vi.fn(),
  },
};

vi.mock('../../db', () => ({
  db: {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}));

vi.mock('../../services/cacheService', () => ({
  del: vi.fn(async () => undefined),
  tagCacheKey: (publicId: string) => `tag:${publicId}`,
}));

// Import AFTER mocks are set up
import { claimTag, NotFoundError, ConflictError, QuotaExceededError } from '../claimTag';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(opts: {
  tagExists: boolean;
  tagState: string;
  ownerTagCount: number;
}) {
  mockTagExists = opts.tagExists;
  mockTagState = opts.tagState;
  mockOwnerTagCount = opts.ownerTagCount;

  mockTx.tag.findUnique.mockResolvedValue(
    opts.tagExists
      ? { id: 'tag-id', publicId: 'test-pub-id', state: opts.tagState, ownerId: null }
      : null,
  );

  mockTx.tag.count.mockResolvedValue(opts.ownerTagCount);

  mockTx.tag.update.mockResolvedValue({
    id: 'tag-id',
    publicId: 'test-pub-id',
    state: 'CLAIMED',
    ownerId: 'owner-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  mockTx.profile.create.mockResolvedValue({
    id: 'profile-id',
    publicId: 'test-pub-id',
    ownerId: 'owner-id',
    displayName: 'My Profile',
    bio: null,
    avatarUrl: null,
    theme: { style: 'minimal', primaryColor: '#000000', fontFamily: 'Inter' },
    passwordProtected: false,
    pinHash: null,
    sensitiveContent: false,
    isActive: true,
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ── Property test ─────────────────────────────────────────────────────────────

/**
 * **Property 8: Owner quota enforcement**
 * **Validates: Requirements 2.6**
 */
describe('Property 8: Owner quota enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claim succeeds if and only if owner has fewer than 50 tags', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an owner tag count from 0 to 55 to cover both sides of the limit
        fc.integer({ min: 0, max: 55 }),
        async (ownerTagCount) => {
          setupMocks({
            tagExists: true,
            tagState: 'MANUFACTURED',
            ownerTagCount,
          });

          const ownerId = `owner-${Math.random()}`;
          const publicId = `pub-${Math.random()}`;

          if (ownerTagCount < 50) {
            // Should succeed
            const result = await claimTag(ownerId, publicId);
            expect(result.tag.state).toBe('CLAIMED');
            expect(result.profile.displayName).toBe('My Profile');
          } else {
            // Should throw QuotaExceededError
            await expect(claimTag(ownerId, publicId)).rejects.toThrow(QuotaExceededError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('claim fails with ConflictError when tag is already CLAIMED', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('CLAIMED' as const, 'ACTIVE' as const),
        fc.integer({ min: 0, max: 49 }), // quota is fine
        async (tagState, ownerTagCount) => {
          setupMocks({ tagExists: true, tagState, ownerTagCount });

          await expect(claimTag('owner-id', 'pub-id')).rejects.toThrow(ConflictError);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('claim fails with NotFoundError when tag does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 49 }),
        async (ownerTagCount) => {
          setupMocks({ tagExists: false, tagState: 'MANUFACTURED', ownerTagCount });

          await expect(claimTag('owner-id', 'missing-pub-id')).rejects.toThrow(NotFoundError);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('quota boundary: exactly 49 tags allows claim, exactly 50 tags blocks claim', async () => {
    // At 49 — should succeed
    setupMocks({ tagExists: true, tagState: 'MANUFACTURED', ownerTagCount: 49 });
    const result = await claimTag('owner-id', 'pub-id');
    expect(result.tag.state).toBe('CLAIMED');

    vi.clearAllMocks();

    // At 50 — should be blocked
    setupMocks({ tagExists: true, tagState: 'MANUFACTURED', ownerTagCount: 50 });
    await expect(claimTag('owner-id', 'pub-id')).rejects.toThrow(QuotaExceededError);
  });
});
