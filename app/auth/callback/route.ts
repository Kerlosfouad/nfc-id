import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isOwnerEmail } from "@/lib/config/ownerAccess";
import { db } from "@/lib/db";

/**
 * OAuth callback handler — exchanges the auth code for a session.
 * Supabase redirects here after Google / Apple OAuth.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const cookieRedirect = cookieStore.get("linkup_auth_redirect")?.value;
  const requestedRedirect = searchParams.get("redirect") ?? (cookieRedirect ? decodeURIComponent(cookieRedirect) : null);
  const redirectTo = requestedRedirect?.startsWith("/") ? requestedRedirect : "/dashboard";

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
