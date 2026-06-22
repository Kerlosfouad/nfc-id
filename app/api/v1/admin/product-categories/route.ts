import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { ensureCategory, listCategories } from '@/lib/services/productCatalog';

const CategorySchema = z.object({
  name: z.string().min(1),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const categories = await listCategories();
  return NextResponse.json({ data: categories, error: null });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const parsed = CategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Category name is required' } },
      { status: 400 },
    );
  }

  const name = await ensureCategory(parsed.data.name);
  return NextResponse.json({ data: { name }, error: null }, { status: 201 });
}

