import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createNfcOAuthFlow } from "@/lib/use-cases/nfcLinkSession";

const ALLOWED_PROVIDERS = new Set(["google"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const provider = searchParams.get("provider") ?? "google";
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const explicitNfcSession = searchParams.get("nfcSession")?.replace(/[^a-zA-Z0-9_-]/g, "") ?? "";

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const safeRedirect = redirect.startsWith("/") ? redirect : "/dashboard";
  const redirectNfcSession = safeRedirect.startsWith("/connect-nfc?")
    ? new URL(safeRedirect, origin).searchParams.get("nfcSession")?.replace(/[^a-zA-Z0-9_-]/g, "") ?? ""
    : "";
  const nfcSession = explicitNfcSession || redirectNfcSession;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const pendingCookies: Parameters<Parameters<typeof createServerClient>[2]["cookies"]["setAll"]>[0] = [];
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const providerState = new URL(data.url).searchParams.get("state") ?? "";
  if (providerState && nfcSession) {
    await createNfcOAuthFlow({ providerState, nfcSessionId: nfcSession });
  }

  const redirectResponse = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options);
  });
  redirectResponse.cookies.set("linkup_auth_redirect", encodeURIComponent(safeRedirect), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
  if (nfcSession) {
    redirectResponse.cookies.set("linkup_nfc_session", nfcSession, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    });
  }
  return redirectResponse;
}
