import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const grouped = await db.analyticsEvent.groupBy({
    by: ['geoCountry'],
    _count: { _all: true },
    orderBy: { _count: { geoCountry: 'desc' } },
    take: 12,
  });

  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const rows = grouped.map((row) => ({
    country: row.geoCountry ?? 'Unknown',
    scans: row._count._all,
    percentage: total === 0 ? 0 : Math.round((row._count._all / total) * 100),
  }));

  return NextResponse.json({ data: { total, rows }, error: null });
}

