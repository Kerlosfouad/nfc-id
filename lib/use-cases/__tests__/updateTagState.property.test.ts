/**
 * Property-based test for tag state transition validity.
 *
 * Property 1: Tag state transition validity
 *   For any Tag, the state must only transition through the valid sequence:
 *   MANUFACTURED → SOLD → CLAIMED → ACTIVE.
 *   A SUSPENDED state may be reached from any state.
 *   No other transitions are valid.
 *
 * **Validates: Requirements 9.1**
 *
 * Prisma client and Redis cache are mocked so no real DB/Redis connection is
 * required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockTx = {
  tag: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  tagAuditLog: {
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
import {
  updateTagState,
  VALID_TRANSITIONS,
  NotFoundError,
  InvalidTransitionError,
} from '../updateTagState';
import type { TagState } from '../../domain/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_STATES: TagState[] = ['MANUFACTURED', 'SOLD', 'CLAIMED', 'ACTIVE', 'SUSPENDED'];

function setupTag(publicId: string, state: TagState) {
  mockTx.tag.findUnique.mockResolvedValue({
    id: 'tag-uuid',
    publicId,
    state,
    ownerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockTx.tag.update.mockResolvedValue({
    id: 'tag-uuid',
    publicId,
    state,
    ownerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockTx.tagAuditLog.create.mockResolvedValue({ id: 'audit-uuid' });
}

// ── Property test ─────────────────────────────────────────────────────────────

/**
 * **Property 1: Tag state transition validity**
 * **Validates: Requirements 9.1**
 */
describe('Property 1: Tag state transition validity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid transitions succeed and invalid transitions throw InvalidTransitionError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ALL_STATES),
        fc.constantFrom(...ALL_STATES),
        async (fromState, toState) => {
          vi.clearAllMocks();

          const publicId = `pub-${fromState}-${toState}`;
          setupTag(publicId, fromState);

          const isValid = VALID_TRANSITIONS[fromState].includes(toState);

          if (isValid) {
            // Valid transition — should succeed
            const result = await updateTagState({
              publicId,
              newState: toState,
              adminId: 'admin-id',
            });
            expect(result.previousState).toBe(fromState);
            expect(result.newState).toBe(toState);
          } else {
            // Invalid transition — must throw InvalidTransitionError
            await expect(
              updateTagState({ publicId, newState: toState, adminId: 'admin-id' }),
            ).rejects.toThrow(InvalidTransitionError);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('SUSPENDED can be reached from every non-terminal state', async () => {
    const nonTerminalStates: TagState[] = ['MANUFACTURED', 'SOLD', 'CLAIMED', 'ACTIVE'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonTerminalStates),
        async (fromState) => {
          vi.clearAllMocks();

          const publicId = `pub-${fromState}`;
          setupTag(publicId, fromState);

          const result = await updateTagState({
            publicId,
            newState: 'SUSPENDED',
            adminId: 'admin-id',
          });

          expect(result.newState).toBe('SUSPENDED');
          expect(result.previousState).toBe(fromState);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('SUSPENDED is a terminal state — no transitions out of it are valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ALL_STATES),
        async (toState) => {
          vi.clearAllMocks();

          const publicId = `pub-suspended-to-${toState}`;
          setupTag(publicId, 'SUSPENDED');

          // No transition out of SUSPENDED is valid
          await expect(
            updateTagState({ publicId, newState: toState, adminId: 'admin-id' }),
          ).rejects.toThrow(InvalidTransitionError);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('the linear sequence MANUFACTURED → SOLD → CLAIMED → ACTIVE is fully valid', async () => {
    const sequence: TagState[] = ['MANUFACTURED', 'SOLD', 'CLAIMED', 'ACTIVE'];

    for (let i = 0; i < sequence.length - 1; i++) {
      vi.clearAllMocks();

      const from = sequence[i];
      const to = sequence[i + 1];
      const publicId = `pub-seq-${from}`;

      setupTag(publicId, from);

      const result = await updateTagState({
        publicId,
        newState: to,
        adminId: 'admin-id',
      });

      expect(result.previousState).toBe(from);
      expect(result.newState).toBe(to);
    }
  });

  it('skipping steps in the sequence is invalid (e.g. MANUFACTURED → CLAIMED)', async () => {
    const invalidSkips: [TagState, TagState][] = [
      ['MANUFACTURED', 'CLAIMED'],
      ['MANUFACTURED', 'ACTIVE'],
      ['SOLD', 'ACTIVE'],
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...invalidSkips),
        async ([fromState, toState]) => {
          vi.clearAllMocks();

          const publicId = `pub-skip-${fromState}-${toState}`;
          setupTag(publicId, fromState);

          await expect(
            updateTagState({ publicId, newState: toState, adminId: 'admin-id' }),
          ).rejects.toThrow(InvalidTransitionError);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('throws NotFoundError when tag does not exist', async () => {
    mockTx.tag.findUnique.mockResolvedValue(null);

    await expect(
      updateTagState({ publicId: 'nonexistent', newState: 'SOLD', adminId: 'admin-id' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('cache is invalidated when transitioning to SUSPENDED', async () => {
    const { del } = await import('../../services/cacheService');

    setupTag('pub-suspend', 'ACTIVE');

    await updateTagState({ publicId: 'pub-suspend', newState: 'SUSPENDED', adminId: 'admin-id' });

    expect(del).toHaveBeenCalledWith('tag:pub-suspend');
  });

  it('cache is NOT invalidated for non-SUSPENDED transitions', async () => {
    const { del } = await import('../../services/cacheService');

    setupTag('pub-sold', 'MANUFACTURED');

    await updateTagState({ publicId: 'pub-sold', newState: 'SOLD', adminId: 'admin-id' });

    expect(del).not.toHaveBeenCalled();
  });
});
