import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { listOrders, ordersToCsv } from '@/lib/services/orders';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const orders = await listOrders();
  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const csv = ordersToCsv(orders);
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nfc-id-orders.csv"',
      },
    });
  }

  return NextResponse.json({ data: orders, meta: { configured: true }, error: null });
}
