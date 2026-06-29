import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';

function badRequest(message: string, status = 400) {
  return NextResponse.json(
    { data: null, error: { code: 'BAD_REQUEST', message } },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Auth service is not configured.' } },
      { status: 500 },
    );
  }

  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  const fullName = body.fullName?.trim() ?? '';

  if (!email || !email.includes('@')) return badRequest('Enter a valid email.');
  if (password.length < 8) return badRequest('Password must be at least 8 characters.');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    const alreadyExists = error.message.toLowerCase().includes('already');
    return NextResponse.json(
      {
        data: null,
        error: {
          code: alreadyExists ? 'USER_EXISTS' : 'SIGNUP_FAILED',
          message: alreadyExists ? 'This email already has an account. Please sign in.' : error.message,
        },
      },
      { status: alreadyExists ? 409 : 400 },
    );
  }

  if (!data.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'SIGNUP_FAILED', message: 'Account could not be created.' } },
      { status: 400 },
    );
  }

  await db.user.upsert({
    where: { id: data.user.id },
    update: { email },
    create: { id: data.user.id, email, role: 'USER' },
  });

  return NextResponse.json({
    data: { id: data.user.id, email },
    error: null,
  });
}
