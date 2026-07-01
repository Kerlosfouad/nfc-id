import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { acceptAllOrders, deleteAllOrders, deleteOrder, listOrders, ordersToCsv, ordersToExcel } from '@/lib/services/orders';

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

  if (request.nextUrl.searchParams.get('format') === 'xls') {
    const html = ordersToExcel(orders);
    return new NextResponse(`\uFEFF${html}`, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="nfc-id-accepted-orders-${new Date().toISOString().slice(0, 10)}.xls"`,
      },
    });
  }

  return NextResponse.json({ data: orders, meta: { configured: true }, error: null });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const id = request.nextUrl.searchParams.get('id');
  const all = request.nextUrl.searchParams.get('all') === 'true';
  const accept = request.nextUrl.searchParams.get('accept') === 'true';

  if (all) {
    if (accept) {
      await acceptAllOrders();
      revalidatePath('/shop');
      revalidatePath('/');
    } else {
      await deleteAllOrders();
    }
    return NextResponse.json({ data: { deleted: 'all' }, error: null });
  }

  if (!id) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Order id is required.' } },
      { status: 400 },
    );
  }

  await deleteOrder(id);
  return NextResponse.json({ data: { deleted: id }, error: null });
}
