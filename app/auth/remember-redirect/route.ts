import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const redirect = typeof body.redirect === "string" && body.redirect.startsWith("/")
    ? body.redirect
    : "/dashboard";

  const response = NextResponse.json({ data: { redirect }, error: null });
  response.cookies.set("linkup_auth_redirect", encodeURIComponent(redirect), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });

  if (redirect.startsWith("/connect-nfc?")) {
    response.cookies.set("linkup_nfc_redirect", encodeURIComponent(redirect), {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  return response;
}
