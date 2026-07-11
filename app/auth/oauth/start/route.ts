import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PROVIDERS = new Set(["google"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const provider = searchParams.get("provider") ?? "google";
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const safeRedirect = redirect.startsWith("/") ? redirect : "/dashboard";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", provider);
  authorizeUrl.searchParams.set("redirect_to", `${origin}/auth/callback`);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("linkup_auth_redirect", encodeURIComponent(safeRedirect), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
  return response;
}
