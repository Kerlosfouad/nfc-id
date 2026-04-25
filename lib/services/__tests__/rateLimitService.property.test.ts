/**
 * Property-based test for rate limit counter monotonicity.
 *
 * Property 6: Rate limit counter monotonicity
 *   For any sequence of requests for the same (publicId, sourceIp) pair within
 *   a 60-second window, the request counter must be monotonically non-decreasing
 *   and must never exceed 30 before triggering a 429 response.
 *
 * **Validates: Requirements 1.5**
 *
 * Redis is mocked with a simple in-memory implementation so no real Redis
 * connection is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── In-memory Redis mock ──────────────────────────────────────────────────────

const store = new Map<string, number>();

vi.mock('../cacheService', () => ({
  default: {
    incr: vi.fn(async (key: string) => {
      const next = (store.get(key) ?? 0) + 1;
      store.set(key, next);
      return next;
    }),
    expire: vi.fn(async () => 1),
  },
}));

// Import AFTER mock is set up
import { check } from '../rateLimitService';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reset the in-memory store before each test run. */
function resetStore() {
  store.clear();
}

// ── Property test ─────────────────────────────────────────────────────────────

/**
 * **Property 6: Rate limit counter monotonicity**
 * **Validates: Requirements 1.5**
 */
describe('Property 6: Rate limit counter monotonicity', () => {
  beforeEach(() => {
    resetStore();
  });

  it('counter is monotonically non-decreasing and 429 triggers at exactly request 31+', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a publicId and ipHash pair
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        // Number of requests to simulate (1–50 to cover both sides of the limit)
        fc.integer({ min: 1, max: 50 }),
        async (publicId, ipHash, numRequests) => {
          // Isolate each property run with a unique key prefix
          const uniquePublicId = `${publicId}-${Math.random()}`;
          const results: Array<{ allowed: boolean; remaining: number }> = [];

          for (let i = 0; i < numRequests; i++) {
            results.push(await check(uniquePublicId, ipHash));
          }

          // 1. `remaining` must be monotonically non-increasing (counter goes up, remaining goes down)
          for (let i = 1; i < results.length; i++) {
            expect(results[i].remaining).toBeLessThanOrEqual(results[i - 1].remaining);
          }

          // 2. First 30 requests must be allowed
          const allowedCount = Math.min(numRequests, 30);
          for (let i = 0; i < allowedCount; i++) {
            expect(results[i].allowed).toBe(true);
          }

          // 3. Requests 31+ must be blocked
          for (let i = 30; i < numRequests; i++) {
            expect(results[i].allowed).toBe(false);
          }

          // 4. `remaining` must never go below 0
          for (const r of results) {
            expect(r.remaining).toBeGreaterThanOrEqual(0);
          }

          // 5. After exactly 30 allowed requests, remaining must be 0
          if (numRequests >= 30) {
            expect(results[29].remaining).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
