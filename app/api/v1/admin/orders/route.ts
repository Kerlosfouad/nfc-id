import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  return NextResponse.json({
    data: [],
    meta: {
      configured: false,
      message: 'Order tables are not configured yet.',
    },
    error: null,
  });
}

