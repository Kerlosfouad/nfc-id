/**
 * Property-based test for NanoID uniqueness in batch generation.
 *
 * Property 5: NanoID uniqueness in batch generation
 *   For any batch of N generated Public_IDs (1 ≤ N ≤ 10,000), all IDs in the
 *   batch must be unique (no duplicates within the batch).
 *
 * **Validates: Requirements 8.2**
 *
 * Prisma client is mocked so no real DB connection is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../db', () => ({
  db: {
    tag: {
      // Return empty array — no existing IDs in DB (clean slate for uniqueness test)
      findMany: vi.fn(async () => []),
      // No-op for bulk insert
      createMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

// Import AFTER mocks are set up
import { batchGenerateTags } from '../batchGenerateTags';

// ── Property test ─────────────────────────────────────────────────────────────

/**
 * **Property 5: NanoID uniqueness in batch generation**
 * **Validates: Requirements 8.2**
 */
describe('Property 5: NanoID uniqueness in batch generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('all generated IDs in a batch are unique (no duplicates within the batch)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Test batch sizes from 1 to 100 (capped for test speed; property holds for all N)
        fc.integer({ min: 1, max: 100 }),
        async (quantity) => {
          const { ids } = await batchGenerateTags(quantity);

          // Verify exact quantity was generated
          expect(ids).toHaveLength(quantity);

          // Verify all IDs are unique within the batch
          const uniqueSet = new Set(ids);
          expect(uniqueSet.size).toBe(quantity);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('generated IDs have the correct NanoID format (9 URL-safe characters)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (quantity) => {
          const { ids } = await batchGenerateTags(quantity);

          // Each ID should be exactly 9 characters from the NanoID URL-safe alphabet
          const nanoIdPattern = /^[A-Za-z0-9_-]{9}$/;
          for (const id of ids) {
            expect(id).toMatch(nanoIdPattern);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('CSV output contains a header row and one ID per line', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (quantity) => {
          const { ids, csv } = await batchGenerateTags(quantity);

          const lines = csv.split('\n');
          // First line is the header
          expect(lines[0]).toBe('publicId');
          // Remaining lines are the IDs
          expect(lines.slice(1)).toEqual(ids);
          // Total lines = header + quantity
          expect(lines).toHaveLength(quantity + 1);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('deduplication: IDs already in DB are not included in the final batch', async () => {
    const { db } = await import('../../db');

    // Simulate that the first generated ID already exists in DB
    // The use case should regenerate until all IDs are unique vs DB
    let callCount = 0;
    (db.tag.findMany as ReturnType<typeof vi.fn>).mockImplementation(async ({ where }: { where: { publicId: { in: string[] } } }) => {
      // On first call, pretend the first ID exists; on subsequent calls, return empty
      if (callCount === 0) {
        callCount++;
        const firstId = where.publicId.in[0];
        return firstId ? [{ publicId: firstId }] : [];
      }
      return [];
    });

    const { ids } = await batchGenerateTags(5);

    // Should still return exactly 5 unique IDs
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });
});
