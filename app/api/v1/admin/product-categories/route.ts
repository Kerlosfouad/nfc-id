import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { deleteCategory, ensureCategory, listCategories } from '@/lib/services/productCatalog';

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

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) return authResult;

  const name = request.nextUrl.searchParams.get('name') ?? '';
  const result = await deleteCategory(name);
  if (!result.ok) {
    const message = result.reason === 'NOT_EMPTY'
      ? 'Move or delete products in this section first.'
      : 'This section cannot be deleted.';
    return NextResponse.json(
      { data: null, error: { code: result.reason, message } },
      { status: 409 },
    );
  }

  revalidatePath('/shop');
  revalidatePath('/');
  return NextResponse.json({ data: { deleted: name }, error: null });
}
