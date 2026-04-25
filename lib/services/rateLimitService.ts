import { createHash } from 'crypto';
import redis from './cacheService';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 30;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
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
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    const allowed = count <= RATE_LIMIT_MAX;
    const remaining = Math.max(0, RATE_LIMIT_MAX - count);
    return { allowed, remaining };
  } catch {
    // Redis error — allow request rather than blocking users
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }
}
