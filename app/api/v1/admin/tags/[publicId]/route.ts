import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { updateTagState, NotFoundError, InvalidTransitionError } from '@/lib/use-cases/updateTagState';
import type { TagState } from '@/lib/domain/types';

const PatchBodySchema = z.object({
  state: z.enum(['MANUFACTURED', 'SOLD', 'CLAIMED', 'ACTIVE', 'SUSPENDED']),
});

export async function PATCH(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const { publicId } = await context.params;

  let body: unknown;
  try { body = await request.json(); }
  catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'state'] = issue.message;
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid body', fields } }, { status: 400 });
  }

  const newState = parsed.data.state as TagState;

  try {
    const result = await updateTagState({ publicId, newState, adminId: authResult.userId });
    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    if (err instanceof NotFoundError)
      return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: (err as Error).message } }, { status: 404 });
    if (err instanceof InvalidTransitionError)
      return NextResponse.json({ data: null, error: { code: 'INVALID_TRANSITION', message: (err as Error).message } }, { status: 422 });
    throw err;
  }
}
