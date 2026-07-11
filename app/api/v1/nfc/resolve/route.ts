import { NextRequest, NextResponse } from 'next/server';
import { resolveNfcUidDestination } from '@/lib/use-cases/resolveNfcUidDestination';

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid') ?? '';
  const destination = await resolveNfcUidDestination(uid);
  return NextResponse.json({ data: destination, error: null });
}

