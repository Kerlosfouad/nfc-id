import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/middleware/auth';
import {
  InvalidNfcUidError,
  linkPublicTag,
  linkNfcTag,
  MultipleAvailableNfcTagsError,
  NoAvailableNfcTagError,
  NfcTagLinkedToAnotherUserError,
  UserAlreadyHasNfcTagError,
} from '@/lib/use-cases/linkNfcTag';
import { resolveNfcLinkSession } from '@/lib/use-cases/nfcLinkSession';

const LinkNfcSchema = z.object({
  uid: z.string().min(1).max(128).optional(),
  publicId: z.string().min(1).max(128).optional(),
  nfcSession: z.string().min(1).max(128).optional(),
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
    const sessionData = parsed.data.nfcSession
      ? await resolveNfcLinkSession(parsed.data.nfcSession)
      : null;
    if (parsed.data.nfcSession && !sessionData) {
      return NextResponse.json(
        { data: null, error: { code: 'LINK_SESSION_EXPIRED', message: 'This NFC linking session expired. Scan the medal again.' } },
        { status: 410 },
      );
    }

    const publicId = parsed.data.publicId ?? sessionData?.publicId;
    const uid = parsed.data.uid ?? sessionData?.uid;

    if (!publicId && !uid) {
      return NextResponse.json(
        { data: null, error: { code: 'BAD_REQUEST', message: 'Open this page from a valid LinkUp medal scan.' } },
        { status: 400 },
      );
    }

    const result = publicId
      ? await linkPublicTag(auth.userId, publicId, uid)
      : await linkNfcTag(auth.userId, uid!);
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

    if (error instanceof UserAlreadyHasNfcTagError) {
      return NextResponse.json(
        { data: null, error: { code: 'USER_ALREADY_HAS_NFC', message: error.message } },
        { status: 409 },
      );
    }

    if (error instanceof NoAvailableNfcTagError) {
      return NextResponse.json(
        { data: null, error: { code: 'NO_AVAILABLE_NFC', message: error.message } },
        { status: 404 },
      );
    }

    if (error instanceof MultipleAvailableNfcTagsError) {
      return NextResponse.json(
        { data: null, error: { code: 'MULTIPLE_AVAILABLE_NFC', message: error.message } },
        { status: 409 },
      );
    }

    console.error('[nfc/link] Unexpected error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Could not link this NFC card' } },
      { status: 500 },
    );
  }
}
