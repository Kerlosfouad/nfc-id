import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const [
    totalTags,
    activeTags,
    claimedTags,
    suspendedTags,
    totalProfiles,
    totalUsers,
    openTickets,
    totalAnalyticsToday,
  ] = await Promise.all([
    db.tag.count(),
    db.tag.count({ where: { state: 'ACTIVE' } }),
    db.tag.count({ where: { state: 'CLAIMED' } }),
    db.tag.count({ where: { state: 'SUSPENDED' } }),
    db.profile.count(),
    db.user.count(),
    db.moderationTicket.count({ where: { status: 'OPEN' } }),
    db.analyticsEvent.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      totalTags,
      activeTags,
      claimedTags,
      suspendedTags,
      totalProfiles,
      totalUsers,
      openTickets,
      totalAnalyticsToday,
    },
  });
}
