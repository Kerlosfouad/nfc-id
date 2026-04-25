/**
 * Analytics Service
 *
 * Records visitor/click events with anonymized data and provides
 * aggregated profile summaries cached in Redis.
 *
 * Requirements: 3.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { createHash } from 'crypto';
import { db } from '@/lib/db';
import {
  get as cacheGet,
  set as cacheSet,
  analyticsSummaryCacheKey,
  ANALYTICS_TTL,
} from '@/lib/services/cacheService';

// ── Input / Output types ──────────────────────────────────────────────────────

export interface AnalyticsEventInput {
  profileId: string;
  publicId: string;
  eventType: 'VIEW' | 'CLICK';
  linkId?: string | null;
  rawIp: string;
  userAgent: string;
  referralSource: 'NFC' | 'DIRECT' | 'SOCIAL';
  /** Optional: pre-resolved from Vercel edge headers */
  geoCountry?: string | null;
  /** Optional: pre-resolved from Vercel edge headers */
  geoSubdivision?: string | null;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  linkClicks: { linkId: string; clicks: number }[];
  ctrPerLink: { linkId: string; ctr: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Hash a raw IP with SHA-256 so no PII is stored (Req 6.2). */
export function hashIp(rawIp: string): string {
  return createHash('sha256').update(rawIp).digest('hex');
}

/**
 * Parse device type from User-Agent string (Req 6.3).
 * No external library — simple substring checks.
 */
export function parseDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  if (ua.includes('mobile') || ua.includes('android')) return 'mobile';
  return 'desktop';
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Record an analytics event.
 * Hashes the raw IP, parses device type, resolves geo from pre-supplied
 * Vercel edge headers (no heavy geo-IP library), then inserts the row.
 *
 * Requirements: 3.8, 6.2, 6.3, 6.4
 */
export async function recordEvent(input: AnalyticsEventInput): Promise<void> {
  const ipHash = hashIp(input.rawIp);
  const deviceType = parseDeviceType(input.userAgent);

  await db.analyticsEvent.create({
    data: {
      profileId: input.profileId,
      publicId: input.publicId,
      eventType: input.eventType,
      linkId: input.linkId ?? null,
      ipHash,
      deviceType,
      referralSource: input.referralSource,
      geoCountry: input.geoCountry ?? null,
      geoSubdivision: input.geoSubdivision ?? null,
    },
  });
}

/**
 * Return an aggregated analytics summary for a profile.
 * Result is cached in Redis for ANALYTICS_TTL seconds (60s) to satisfy
 * the max-60s-staleness requirement (Req 6.5).
 *
 * Requirements: 6.1, 6.5
 */
export async function getProfileSummary(profileId: string): Promise<AnalyticsSummary> {
  const cacheKey = analyticsSummaryCacheKey(profileId);

  const cached = await cacheGet<AnalyticsSummary>(cacheKey);
  if (cached) return cached;

  // Total views
  const totalViews = await db.analyticsEvent.count({
    where: { profileId, eventType: 'VIEW' },
  });

  // Unique visitors (distinct ipHash across all events)
  const uniqueResult = await db.analyticsEvent.groupBy({
    by: ['ipHash'],
    where: { profileId },
  });
  const uniqueVisitors = uniqueResult.length;

  // Click counts per link
  const clickGroups = await db.analyticsEvent.groupBy({
    by: ['linkId'],
    where: { profileId, eventType: 'CLICK', linkId: { not: null } },
    _count: { linkId: true },
  });

  const linkClicks = clickGroups
    .filter((g: { linkId: string | null; _count: { linkId: number } }) => g.linkId !== null)
    .map((g: { linkId: string | null; _count: { linkId: number } }) => ({
      linkId: g.linkId as string,
      clicks: g._count.linkId,
    }));

  // CTR per link = clicks / totalViews (guard against division by zero)
  const ctrPerLink = linkClicks.map(({ linkId, clicks }: { linkId: string; clicks: number }) => ({
    linkId,
    ctr: totalViews > 0 ? clicks / totalViews : 0,
  }));

  const summary: AnalyticsSummary = {
    totalViews,
    uniqueVisitors,
    linkClicks,
    ctrPerLink,
  };

  await cacheSet(cacheKey, summary, ANALYTICS_TTL);

  return summary;
}
