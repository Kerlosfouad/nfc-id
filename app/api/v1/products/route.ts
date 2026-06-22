import { NextResponse } from 'next/server';
import { listProducts } from '@/lib/services/productCatalog';

export async function GET() {
  const products = await listProducts({ activeOnly: true });
  return NextResponse.json({ data: products, error: null });
}
