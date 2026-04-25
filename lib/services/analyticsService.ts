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
  linkClickDetails: { title: string; clicks: number }[];
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
}

/**
 * Return an aggregated analytics summary for a profile.
 */
export async function getProfileSummary(profileId: string): Promise<AnalyticsSummary> {
  const cacheKey = analyticsSummaryCacheKey(profileId);

  const cached = await cacheGet<AnalyticsSummary>(cacheKey);
  if (cached) return cached;

  const totalViews = await db.analyticsEvent.count({
    where: { profileId, eventType: 'VIEW' },
  });

  const uniqueResult = await db.analyticsEvent.groupBy({
    by: ['ipHash'],
    where: { profileId },
  });
  const uniqueVisitors = uniqueResult.length;

  const clickGroups = await db.analyticsEvent.groupBy({
    by: ['linkId'],
    where: { profileId, eventType: 'CLICK', linkId: { not: null } },
    _count: { linkId: true },
  });

  const profileLinks = await db.link.findMany({ where: { profileId } });

  let totalLinkClicks = 0;
  let contactSaves = 0;
  const linkClickDetails: { title: string; clicks: number }[] = [];
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
    linkClickDetails.push({ title: link.title, clicks });
    linkClickDistribution.push({ 
      title: link.title, 
      clicks, 
      fill: COLORS[linkClickDistribution.length % COLORS.length] 
    });
  }

  const linkClickRate = totalViews > 0 ? Math.round((totalLinkClicks / totalViews) * 100) : 0;

  const recentEvents = await db.analyticsEvent.findMany({
    where: { profileId, eventType: 'VIEW' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  
  const recentScans = recentEvents.map(e => ({
    date: e.createdAt.toISOString().split('T')[0],
    country: e.geoCountry || 'Unknown',
    os: e.os || 'Unknown',
    browser: e.browser || 'Unknown'
  }));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0,0,0,0);
  
  const recentWeekEvents = await db.analyticsEvent.findMany({
    where: { profileId, createdAt: { gte: sevenDaysAgo } },
    select: { eventType: true, createdAt: true }
  });

  const timelineMap: Record<string, { views: number; clicks: number }> = {};
  for(let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    timelineMap[d.toISOString().split('T')[0]] = { views: 0, clicks: 0 };
  }

  recentWeekEvents.forEach(e => {
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
