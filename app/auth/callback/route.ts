import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isOwnerEmail } from "@/lib/config/ownerAccess";
import { db } from "@/lib/db";
import { resolveNfcOAuthFlow } from "@/lib/use-cases/nfcLinkSession";

/**
 * OAuth callback handler — exchanges the auth code for a session.
 * Supabase redirects here after Google / Apple OAuth.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthState = searchParams.get("state") ?? "";
  const cookieStore = await cookies();
  const cookieRedirect = cookieStore.get("linkup_auth_redirect")?.value;
  const cookieNfcSession = cookieStore.get("linkup_nfc_session")?.value?.replace(/[^a-zA-Z0-9_-]/g, "");
  const dbNfcSession = oauthState ? await resolveNfcOAuthFlow(oauthState) : null;
  const requestedRedirect = searchParams.get("redirect") ?? (cookieRedirect ? decodeURIComponent(cookieRedirect) : null);
  const redirectTo = dbNfcSession
    ? `/connect-nfc?nfcSession=${encodeURIComponent(dbNfcSession)}`
    : requestedRedirect?.startsWith("/")
    ? requestedRedirect
    : cookieNfcSession
      ? `/connect-nfc?nfcSession=${encodeURIComponent(cookieNfcSession)}`
      : "/dashboard";

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user?.id && data.user.email) {
        await db.user.upsert({
          where: { id: data.user.id },
          update: { email: data.user.email.toLowerCase() },
          create: { id: data.user.id, email: data.user.email.toLowerCase(), role: "USER" },
        });
      }

      const finalRedirect = isOwnerEmail(data.user?.email) && redirectTo === "/dashboard"
        ? "/admin"
        : redirectTo;
      const response = NextResponse.redirect(`${origin}${finalRedirect}`);
      response.cookies.set("linkup_auth_redirect", "", { path: "/", maxAge: 0 });
      return response;
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
