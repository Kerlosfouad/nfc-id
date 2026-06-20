import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js Middleware — protects /dashboard and /api/v1/ routes.
 * Refreshes the Supabase session on every request (handles token rotation).
 * Requirements: 7.1, 7.4, 7.6
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not add logic between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /dashboard routes — redirect unauthenticated users to login
  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /api/v1/ routes return 401 JSON for unauthenticated requests
  // (individual route handlers also call requireAuth for fine-grained checks)
  if (pathname.startsWith("/api/v1/") && !user) {
    // Allow public endpoints: tag resolver, profile view, lead form POST, reports
    const publicApiPatterns = [
      /^\/api\/v1\/profiles\/[^/]+\/leads$/,   // POST lead form
      /^\/api\/v1\/reports$/,                   // POST report
    ];
    const isPublic = publicApiPatterns.some((p) => p.test(pathname));
    if (!isPublic) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/v1/:path*",
  ],
};
