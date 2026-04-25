import { Redis } from '@upstash/redis';

export const TAG_TTL = 60;
export const PROFILE_TTL = 60;
export const ANALYTICS_TTL = 60;

export const tagCacheKey = (publicId: string) => `tag:${publicId}`;
export const profileCacheKey = (publicId: string) => `profile:${publicId}`;
export const analyticsSummaryCacheKey = (profileId: string) => `analytics:summary:${profileId}`;

// Singleton Redis client — returns null if not configured
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: Redis | null | undefined;
}

const redis: Redis | null =
  globalThis._redisClient !== undefined
    ? globalThis._redisClient
    : createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis._redisClient = redis;
}

// Typed cache wrappers — silently no-op if Redis unavailable
export async function get<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch {
    return null;
  }
}

export async function set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (!redis) return;
  try {
    if (ttlSeconds !== undefined) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch {
    // ignore cache write failures
  }
}

export async function del(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // ignore cache delete failures
  }
}

export default redis;
