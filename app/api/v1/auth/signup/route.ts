import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';

function badRequest(message: string, status = 400) {
  return NextResponse.json(
    { data: null, error: { code: 'BAD_REQUEST', message } },
    { status },
  );
}

async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < perPage) return null;

    page += 1;
  }
}

function confirmationEmailHtml(token: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#071722;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#071722;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#0d2539;border:1px solid rgba(3,169,244,0.24);border-radius:18px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:34px 28px 20px;">
                <img src="https://link-up-id-alpha.vercel.app/img/linkup-logo.png" width="86" alt="LinkUp" style="display:block;width:86px;height:auto;margin:0 auto 18px;" />
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8fdfff;font-weight:700;">LinkUp</div>
                <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;color:#ffffff;">Verify your email</h1>
                <p style="margin:0;color:rgba(255,255,255,0.68);font-size:15px;line-height:1.7;">Use this code to finish creating your LinkUp account.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px 28px 24px;">
                <div style="display:inline-block;background:#03A9F4;color:#ffffff;border-radius:14px;padding:16px 26px;font-size:34px;letter-spacing:8px;font-weight:800;font-family:'Courier New',monospace;">${token}</div>
                <p style="margin:18px 0 0;color:rgba(255,255,255,0.48);font-size:13px;line-height:1.6;">If you did not create a LinkUp account, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;background:#061522;border-top:1px solid rgba(143,223,255,0.12);">
                <p style="margin:0;text-align:center;color:rgba(255,255,255,0.42);font-size:12px;line-height:1.6;">LinkUp - Smart NFC identity in one tap<br />https://link-up-id-alpha.vercel.app</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendConfirmationEmail(input: { email: string; token: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('Email service is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'LinkUp <onboarding@resend.dev>',
      to: [input.email],
      subject: 'Your LinkUp verification code',
      html: confirmationEmailHtml(input.token),
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'Confirmation email could not be sent.');
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Auth service is not configured.' } },
      { status: 500 },
    );
  }

  let body: { email?: string; password?: string; fullName?: string; emailRedirectTo?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  const fullName = body.fullName?.trim() ?? '';
  const emailRedirectTo = body.emailRedirectTo;

  if (!email || !email.includes('@')) return badRequest('Enter a valid email.');
  if (password.length < 8) return badRequest('Password must be at least 8 characters.');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existingAppUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  const existingAuthUser = await findAuthUserByEmail(supabase, email);
  const existingProfileCount = existingAppUser
    ? await db.profile.count({ where: { ownerId: existingAppUser.id } })
    : 0;

  if (existingAuthUser && existingAppUser?.id === existingAuthUser.id && existingProfileCount > 0) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'USER_EXISTS',
          message: 'This email already has an account. Please sign in.',
        },
      },
      { status: 409 },
    );
  }

  if (existingAuthUser && (existingAppUser?.id !== existingAuthUser.id || existingProfileCount === 0)) {
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(existingAuthUser.id);
    if (deleteAuthError) {
      return NextResponse.json(
        { data: null, error: { code: 'SIGNUP_FAILED', message: deleteAuthError.message } },
        { status: 400 },
      );
    }
  }

  if (existingAppUser && (existingAppUser.id !== existingAuthUser?.id || existingProfileCount === 0)) {
    await db.user.deleteMany({ where: { email } });
  }

  const signupClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo,
    },
  });

  if (error) {
    const alreadyExists = error.message.toLowerCase().includes('already');
    const emailSendFailed = /sending confirmation email|email/i.test(error.message) && error.status === 500;

    if (emailSendFailed) {
      const generated = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: {
          data: { full_name: fullName },
          redirectTo: emailRedirectTo,
        },
      });

      if (generated.error || !generated.data.user?.id || !generated.data.properties?.email_otp) {
        return NextResponse.json(
          { data: null, error: { code: 'SIGNUP_FAILED', message: generated.error?.message ?? error.message } },
          { status: 400 },
        );
      }

      try {
        await sendConfirmationEmail({
          email,
          token: generated.data.properties.email_otp,
        });
      } catch (sendError) {
        await supabase.auth.admin.deleteUser(generated.data.user.id).catch(() => undefined);
        return NextResponse.json(
          { data: null, error: { code: 'EMAIL_SEND_FAILED', message: sendError instanceof Error ? sendError.message : 'Confirmation email could not be sent.' } },
          { status: 500 },
        );
      }

      return NextResponse.json({
        data: { id: generated.data.user.id, email },
        error: null,
      });
    }

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

  return NextResponse.json({
    data: { id: data.user.id, email },
    error: null,
  });
}
