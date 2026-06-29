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
import { UAParser } from 'ua-parser-js';
import {
  get as cacheGet,
  set as cacheSet,
  del as cacheDel,
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
  totalLinkClicks: number;
  linkClickRate: number;
  contactSaves: number;
  activityTimeline: { date: string; views: number; clicks: number }[];
  linkClickDistribution: { title: string; clicks: number; fill: string }[];
  recentScans: { date: string; country: string; os: string; browser: string }[];
  linkClickDetails: { title: string; url: string; type: string; thumbnailUrl: string | null; clicks: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Hash a raw IP with SHA-256 so no PII is stored (Req 6.2). */
export function hashIp(rawIp: string): string {
  return createHash('sha256').update(rawIp).digest('hex');
}

/**
 * Parse device type from User-Agent string (Req 6.3).
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
 */
export async function recordEvent(input: AnalyticsEventInput): Promise<void> {
  const ipHash = hashIp(input.rawIp);
  const deviceType = parseDeviceType(input.userAgent);

  const parser = new UAParser(input.userAgent);
  const os = parser.getOS().name ?? 'Unknown';
  const browser = parser.getBrowser().name ?? 'Unknown';

  await db.analyticsEvent.create({
    data: {
      profileId: input.profileId,
      publicId: input.publicId,
      eventType: input.eventType,
      linkId: input.linkId ?? null,
      ipHash,
      deviceType,
      referralSource: input.referralSource,
      geoCountry: input.geoCountry ?? 'Unknown',
      geoSubdivision: input.geoSubdivision ?? 'Unknown',
      os,
      browser,
    },
  });

  void Promise.all([7, 14, 30].map(days => cacheDel(`${analyticsSummaryCacheKey(input.profileId)}:${days}`)));
}

/**
 * Return an aggregated analytics summary for a profile.
 */
export async function getProfileSummary(profileId: string, days = 7): Promise<AnalyticsSummary> {
  const safeDays = [7, 14, 30].includes(days) ? days : 7;
  const cacheKey = `${analyticsSummaryCacheKey(profileId)}:${safeDays}`;

  const cached = await cacheGet<AnalyticsSummary>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (safeDays - 1));
  startDate.setHours(0, 0, 0, 0);
  const whereBase = { profileId, createdAt: { gte: startDate } };

  const [totalViews, uniqueResult, clickGroups, profileLinks, recentEvents, rangeEvents] = await Promise.all([
    db.analyticsEvent.count({
      where: { ...whereBase, eventType: 'VIEW' },
    }),
    db.analyticsEvent.groupBy({
      by: ['ipHash'],
      where: whereBase,
    }),
    db.analyticsEvent.groupBy({
      by: ['linkId'],
      where: { ...whereBase, eventType: 'CLICK', linkId: { not: null } },
      _count: { linkId: true },
    }),
    db.link.findMany({
      where: { profileId },
      select: { id: true, title: true, type: true, url: true, thumbnailUrl: true },
    }),
    db.analyticsEvent.findMany({
      where: { ...whereBase, eventType: 'VIEW' },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { createdAt: true, geoCountry: true, os: true, browser: true },
    }),
    db.analyticsEvent.findMany({
      where: whereBase,
      select: { eventType: true, createdAt: true },
    }),
  ]);
  const uniqueVisitors = uniqueResult.length;

  let totalLinkClicks = 0;
  let contactSaves = 0;
  const linkClickDetails: { title: string; url: string; type: string; thumbnailUrl: string | null; clicks: number }[] = [];
  const linkClickDistribution: { title: string; clicks: number; fill: string }[] = [];
  
  const COLORS = ['#03A9F4', '#8A2BE2', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  for (const group of clickGroups) {
    if (!group.linkId) continue;
    const clicks = group._count.linkId;
    totalLinkClicks += clicks;
    const link = profileLinks.find(l => l.id === group.linkId);
    if (!link) continue;
    
    if (link.type === 'VCF') {
      contactSaves += clicks;
    }
    linkClickDetails.push({ title: link.title, url: link.url, type: link.type, thumbnailUrl: link.thumbnailUrl, clicks });
    linkClickDistribution.push({ 
      title: link.title, 
      clicks, 
      fill: COLORS[linkClickDistribution.length % COLORS.length] 
    });
  }

  const linkClickRate = totalViews > 0 ? Math.round((totalLinkClicks / totalViews) * 100) : 0;

  const recentScans = recentEvents.map(e => ({
    date: e.createdAt.toISOString(),
    country: e.geoCountry || 'Unknown',
    os: e.os || 'Unknown',
    browser: e.browser || 'Unknown'
  }));

  const timelineMap: Record<string, { views: number; clicks: number }> = {};
  for(let i = safeDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    timelineMap[d.toISOString().split('T')[0]] = { views: 0, clicks: 0 };
  }

  rangeEvents.forEach(e => {
    const dateKey = e.createdAt.toISOString().split('T')[0];
    if (timelineMap[dateKey]) {
      if (e.eventType === 'VIEW') timelineMap[dateKey].views++;
      else if (e.eventType === 'CLICK') timelineMap[dateKey].clicks++;
    }
  });

  const activityTimeline = Object.entries(timelineMap).map(([date, data]) => ({
    date: date.substring(5), // mm-dd
    views: data.views,
    clicks: data.clicks
  }));

  const summary: AnalyticsSummary = {
    totalViews,
    uniqueVisitors,
    totalLinkClicks,
    linkClickRate,
    contactSaves,
    activityTimeline,
    linkClickDistribution,
    recentScans,
    linkClickDetails
  };

  await cacheSet(cacheKey, summary, ANALYTICS_TTL);

  return summary;
}
