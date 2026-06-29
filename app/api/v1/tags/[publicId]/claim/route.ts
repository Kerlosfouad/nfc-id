/**
 * POST /api/v1/tags/:publicId/claim
 *
 * Claim an unclaimed tag for the authenticated owner.
 *
 * Auth: reads owner ID from the `x-user-id` request header (simplified approach;
 * will be replaced by full Supabase JWT middleware in Task 11).
 *
 * Responses:
 *   200 { data: { tag, profile } }  — claim succeeded
 *   401                             — no authenticated user
 *   404                             — publicId not found
 *   409                             — tag already claimed/active
 *   403                             — owner quota exceeded
 *   500                             — unexpected server error
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { claimTag, NotFoundError, ConflictError, QuotaExceededError } from '@/lib/use-cases/claimTag';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  // Extract authenticated user ID from simplified header (Task 11 will replace this)
  const ownerId = request.headers.get('x-user-id');
  if (!ownerId) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  const { publicId } = await params;

  try {
    const authHeader = request.headers.get('authorization');
    let email = '';
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && anonKey) {
        const supabase = createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data } = await supabase.auth.getUser(authHeader.slice(7));
        email = data.user?.email ?? '';
      }
    }

    await db.user.upsert({
      where: { id: ownerId },
      update: email ? { email } : {},
      create: { id: ownerId, email: email || `${ownerId}@placeholder.local`, role: 'USER' },
    });

    const result = await claimTag(ownerId, publicId);
    return NextResponse.json({ data: result, error: null }, { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 },
      );
    }
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { data: null, error: { code: 'CONFLICT', message: err.message } },
        { status: 409 },
      );
    }
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { data: null, error: { code: 'QUOTA_EXCEEDED', message: err.message } },
        { status: 403 },
      );
    }

    console.error('[claim] Unexpected error:', err);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 },
    );
  }
}
