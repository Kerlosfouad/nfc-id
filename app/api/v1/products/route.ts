import { NextResponse } from 'next/server';
import { listProducts } from '@/lib/services/productCatalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await listProducts({ activeOnly: true });
    return NextResponse.json(
      { data: products, error: null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'PRODUCTS_LOAD_FAILED',
          message: e instanceof Error ? e.message : 'Failed to load products',
        },
      },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
