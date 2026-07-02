import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/middleware/auth';
import {
  InvalidNfcUidError,
  linkPublicTag,
  linkNfcTag,
  NfcTagLinkedToAnotherUserError,
} from '@/lib/use-cases/linkNfcTag';

const LinkNfcSchema = z.object({
  uid: z.string().min(1).max(128).optional(),
  publicId: z.string().min(1).max(128).optional(),
}).refine((value) => value.uid || value.publicId, {
  message: 'A valid NFC UID or card link is required',
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const parsed = LinkNfcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'A valid NFC UID or card link is required' } },
      { status: 400 },
    );
  }

  try {
    const result = parsed.data.publicId
      ? await linkPublicTag(auth.userId, parsed.data.publicId, parsed.data.uid)
      : await linkNfcTag(auth.userId, parsed.data.uid!);
    return NextResponse.json({ data: result, error: null }, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidNfcUidError) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_UID', message: error.message } },
        { status: 400 },
      );
    }

    if (error instanceof NfcTagLinkedToAnotherUserError) {
      return NextResponse.json(
        { data: null, error: { code: 'NFC_ALREADY_LINKED', message: error.message } },
        { status: 409 },
      );
    }

    console.error('[nfc/link] Unexpected error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Could not link this medal' } },
      { status: 500 },
    );
  }
}
