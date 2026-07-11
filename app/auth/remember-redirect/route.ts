import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookieRedirect = request.cookies.get("linkup_auth_redirect")?.value;
  const cookieNfcSession = request.cookies.get("linkup_nfc_session")?.value?.replace(/[^a-zA-Z0-9_-]/g, "");
  const redirect = cookieRedirect
    ? decodeURIComponent(cookieRedirect)
    : cookieNfcSession
      ? `/connect-nfc?nfcSession=${encodeURIComponent(cookieNfcSession)}`
      : null;

  return NextResponse.json({
    data: { redirect: redirect?.startsWith("/") ? redirect : null },
    error: null,
  });
}

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
  return response;
}
