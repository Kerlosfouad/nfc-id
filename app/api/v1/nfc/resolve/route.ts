import { NextRequest, NextResponse } from 'next/server';
import { resolveNfcUidDestination } from '@/lib/use-cases/resolveNfcUidDestination';

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid') ?? '';
  const destination = await resolveNfcUidDestination(uid);
  const response = NextResponse.json({ data: destination, error: null });
  if (destination.kind === 'register') {
    const session = new URL(destination.href, request.url).searchParams.get('nfcSession');
    if (session) {
      response.cookies.set('linkup_nfc_session', session, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 15 * 60,
      });
      response.cookies.set('linkup_auth_redirect', encodeURIComponent(`/connect-nfc?nfcSession=${encodeURIComponent(session)}`), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 15 * 60,
      });
    }
  }
  return response;
}
