/**
 * POST /api/v1/admin/tags/batch
 *
 * Admin-only endpoint for batch generating NFC Tag Public_IDs.
 * Validates quantity (1–10,000), checks ADMIN role, generates tags,
 * and streams the result as a UTF-8 CSV file.
 *
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { BatchGenerateSchema } from '@/lib/validators/schemas';
import { batchGenerateTags } from '@/lib/use-cases/batchGenerateTags';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid JSON body',
        },
      },
      { status: 400 },
    );
  }

  const parsed = BatchGenerateSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'quantity';
      fields[key] = issue.message;
    }
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request: quantity must be between 1 and 10,000',
          fields,
        },
      },
      { status: 400 },
    );
  }

  const { quantity } = parsed.data;

  // 4. Generate tags and return CSV (Req 8.1, 8.3)
  const { csv } = await batchGenerateTags(quantity);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tags-batch.csv"',
    },
  });
}
