/**
 * PATCH /api/v1/admin/tags/[publicId]
 * Requirements: 9.2, 9.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import {
  updateTagState,
  NotFoundError,
  InvalidTransitionError,
} from '@/lib/use-cases/updateTagState';
import type { TagState } from '@/lib/domain/types';

const PatchBodySchema = z.object({
  state: z.enum(['MANUFACTURED', 'SOLD', 'CLAIMED', 'ACTIVE', 'SUSPENDED']),
});

type RouteContext = { params: Promise<{ publicId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try { body = await request.json(); }
  catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'state'] = issue.message;
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields } }, { status: 400 });
  }

  const { publicId } = await context.params;
  const newState = parsed.data.state as TagState;

  try {
    const result = await updateTagState({ publicId, newState, adminId: authResult.userId });
    return NextResponse.json({ data: result, error: null }, { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError)
      return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: (err as Error).message } }, { status: 404 });
    if (err instanceof InvalidTransitionError)
      return NextResponse.json({ data: null, error: { code: 'INVALID_TRANSITION', message: (err as Error).message } }, { status: 422 });
    throw err;
  }
}
