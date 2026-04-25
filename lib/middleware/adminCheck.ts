/**
 * Admin check helper.
 * Checks if the authenticated user is an admin via:
 * 1. ADMIN_EMAILS env var (comma-separated list)
 * 2. Prisma User.role === 'ADMIN' (fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './auth';
import { createServerClient } from '@supabase/ssr';
import { db } from '@/lib/db';

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  // 1. Must be authenticated
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  // 2. Get user email from Supabase
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const authHeader = request.headers.get('authorization');
  let email = '';

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    email = data.user?.email ?? '';
  } else {
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? '';
  }

  // 3. Check ADMIN_EMAILS env var first (fast path)
  const adminEmails = getAdminEmails();
  if (email && adminEmails.includes(email.toLowerCase())) {
    return { userId: authResult.userId, email };
  }

  // 4. Fallback: check Prisma User.role
  try {
    const user = await db.user.findUnique({
      where: { id: authResult.userId },
      select: { role: true },
    });
    if (user?.role === 'ADMIN') {
      return { userId: authResult.userId, email };
    }
  } catch {
    // DB might not have the user yet — that's fine, env check already failed
  }

  return NextResponse.json(
    { data: null, error: { code: 'FORBIDDEN', message: 'Access denied: ADMIN role required' } },
    { status: 403 }
  );
}
