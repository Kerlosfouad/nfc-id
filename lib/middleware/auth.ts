import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Build a Supabase server client from a NextRequest (for middleware / route handlers).
 * Cookies are read from the request; writes are collected into a response.
 */
function buildSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Verify the caller is authenticated.
 *
 * Checks (in order):
 *  1. `Authorization: Bearer <token>` header
 *  2. Supabase session cookie
 *
 * Returns `{ userId: string }` on success, or a 401 NextResponse on failure.
 * Requirement 7.6
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const response = NextResponse.next({ request });
  const supabase = buildSupabaseClient(request, response);

  // 1. Try Bearer token from Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      return { userId: data.user.id };
    }
  }

  // 2. Fall back to session cookie
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  return { userId: user.id };
}

/**
 * Verify the caller is authenticated AND owns the resource.
 *
 * Returns `{ userId: string }` on success, 401 if unauthenticated, 403 if wrong owner.
 * Requirements 7.5, 7.6, 7.7
 */
export async function requireOwner(
  request: NextRequest,
  resourceOwnerId: string
): Promise<{ userId: string } | NextResponse> {
  const authResult = await requireAuth(request);

  // Propagate 401
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // Ownership check — Requirement 7.7
  if (authResult.userId !== resourceOwnerId) {
    return NextResponse.json(
      { data: null, error: { code: "FORBIDDEN", message: "Access denied: you do not own this resource" } },
      { status: 403 }
    );
  }

  return authResult;
}
