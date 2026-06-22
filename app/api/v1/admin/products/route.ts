import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { z } from 'zod';
import { createProduct, listProducts } from '@/lib/services/productCatalog';

const ProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priceLabel: z.string().min(1),
  imageUrl: z.string().min(1),
  badge: z.string().optional().default(''),
  icon: z.string().optional().default('ri-shopping-bag-3-line'),
  category: z.string().optional().default('General'),
  discountLabel: z.string().nullable().optional().default(null),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().optional().default(0),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const products = await listProducts();
  return NextResponse.json({ data: products, error: null });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const parsed = ProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid product data' } },
      { status: 400 },
    );
  }

  const product = await createProduct(parsed.data);
  return NextResponse.json({ data: product, error: null }, { status: 201 });
}
