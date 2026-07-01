import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';
import { ensureOrderTables } from '@/lib/services/orders';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const [
    totalTags,
    manufacturedTags,
    soldTags,
    activeTags,
    claimedTags,
    suspendedTags,
    totalProfiles,
    totalUsers,
    openTickets,
    totalAnalyticsToday,
  ] = await Promise.all([
    db.tag.count(),
    db.tag.count({ where: { state: 'MANUFACTURED' } }),
    db.tag.count({ where: { state: 'SOLD' } }),
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

  await ensureOrderTables();

  const orderSummaryRows = await db.$queryRaw<Array<{
    total_orders: bigint;
    total_revenue: unknown;
    average_order_value: unknown;
  }>>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'NEW')::bigint AS total_orders,
      COALESCE(SUM(total), 0) AS total_revenue,
      COALESCE(AVG(total), 0) AS average_order_value
    FROM shop_orders
  `;

  const revenueRows = await db.$queryRaw<Array<{
    day: Date;
    revenue: unknown;
    orders: bigint;
  }>>`
    SELECT
      DATE_TRUNC('day', created_at) AS day,
      COALESCE(SUM(total), 0) AS revenue,
      COUNT(*)::bigint AS orders
    FROM shop_orders
    WHERE created_at >= NOW() - INTERVAL '6 days'
    GROUP BY day
    ORDER BY day ASC
  `;

  const revenueByDay = revenueRows.map((row) => ({
    day: row.day.toISOString(),
    revenue: Number(row.revenue),
    orders: Number(row.orders),
  }));

  const orderSummary = orderSummaryRows[0] ?? {
    total_orders: BigInt(0),
    total_revenue: 0,
    average_order_value: 0,
  };

  return NextResponse.json({
    data: {
      totalTags,
      manufacturedTags,
      soldTags,
      activeTags,
      claimedTags,
      suspendedTags,
      totalProfiles,
      totalUsers,
      openTickets,
      totalAnalyticsToday,
      totalOrders: Number(orderSummary.total_orders),
      totalRevenue: Number(orderSummary.total_revenue),
      averageOrderValue: Number(orderSummary.average_order_value),
      revenueByDay,
    },
  });
}
