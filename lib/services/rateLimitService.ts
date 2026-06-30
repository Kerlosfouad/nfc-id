import { createHash } from 'crypto';
import redis from './cacheService';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_TIMEOUT_MS = 150;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

async function withRateLimitTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Rate limit request timed out')), RATE_LIMIT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function check(
  publicId: string,
  ipHash: string,
): Promise<RateLimitResult> {
  // If Redis is unavailable, allow all requests (graceful degradation)
  if (!redis) {
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }

  try {
    const key = `ratelimit:${publicId}:${ipHash}`;
    const count = await withRateLimitTimeout(redis.incr(key));
    if (count === 1) {
      void withRateLimitTimeout(redis.expire(key, RATE_LIMIT_WINDOW)).catch(() => undefined);
    }
    const allowed = count <= RATE_LIMIT_MAX;
    const remaining = Math.max(0, RATE_LIMIT_MAX - count);
    return { allowed, remaining };
  } catch {
    // Redis error — allow request rather than blocking users
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }
}
