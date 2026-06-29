"use client";

export const dynamic = 'force-dynamic';

/**
 * Claim onboarding page — /claim/[publicId]
 *
 * Shows a login/signup prompt when the user is unauthenticated, preserving
 * the publicId in the redirect URL so the auth flow can return here.
 *
 * After authentication the user is redirected back to this page, which then
 * calls the claim API and redirects to the profile builder on success.
 *
 * Requirements: 2.1
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isOwnerEmail } from "@/lib/config/ownerAccess";

interface ClaimPageProps {
  params: Promise<{ publicId: string }>;
}

export default function ClaimPage({ params }: ClaimPageProps) {
  const router = useRouter();
  const [publicId, setPublicId] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "claiming" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // Resolve params
  useEffect(() => {
    params.then(({ publicId: id }) => setPublicId(id));
  }, [params]);

  // Check real session
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setAuthToken(session.access_token);
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? "");
      }
    });
  }, []);

  async function switchAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setAuthToken(null);
    setUserId(null);
    setUserEmail("");
    router.push(`/signup?redirect=/claim/${publicId}`);
  }

  async function handleClaim(uid: string) {
    if (!publicId || !authToken) return;
    setStatus("claiming");
    setErrorMessage("");

    try {
      const res = await fetch(`/api/v1/tags/${publicId}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "x-user-id": uid,
        },
      });

      const body = await res.json();

      if (res.ok) {
        setStatus("success");
        // Redirect to profile builder after a short delay
        setTimeout(() => router.push(`/dashboard`), 1500);
      } else {
        setStatus("error");
        setErrorMessage(body?.error?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  }

  // For now, show the unauthenticated state (Task 11 will wire real session detection)

  if (!publicId) {
    return (
      <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#03A9F4] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#03A9F4]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#8A2BE2]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/img/logo.png"
              alt="NFC ID"
              width={40}
              height={40}
              className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all"
            />
            <span className="text-white font-bold text-xl tracking-wider">
              NFC <span className="text-[#03A9F4]">ID</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {/* NFC tag icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#03A9F4]/10 border border-[#03A9F4]/20 flex items-center justify-center">
              <i className="ri-nfc-line text-[#03A9F4] text-3xl" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-white text-2xl font-bold mb-2">Claim Your Tag</h2>
            <p className="text-[#555] text-sm">
              Tag ID:{" "}
              <span className="text-[#03A9F4] font-mono font-semibold">{publicId}</span>
            </p>
            <p className="text-[#555] text-sm mt-2">
              Sign in or create an account to claim this tag and build your digital profile.
            </p>
          </div>

          {/* Success state */}
          {status === "success" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <i className="ri-check-line text-green-400 text-2xl" />
              </div>
              <p className="text-green-400 font-semibold">Tag claimed successfully!</p>
              <p className="text-[#555] text-sm">Redirecting to your dashboard…</p>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">{errorMessage}</p>
            </div>
          )}

          {/* Authenticated — show claim button */}
          {isAuthenticated && status !== "success" && isOwnerEmail(userEmail) && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                <p className="text-xs text-white/35">Signed in as</p>
                <p className="mt-1 truncate text-sm font-semibold text-white/70">{userEmail}</p>
              </div>
              <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3">
                <p className="text-sm font-semibold text-yellow-200">This is the admin account.</p>
                <p className="mt-1 text-xs leading-relaxed text-yellow-100/65">
                  Switch to the customer account before claiming this medal.
                </p>
              </div>
              <button
                type="button"
                onClick={switchAccount}
                className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <i className="ri-user-shared-line" />
                Use Customer Account
              </button>
            </div>
          )}

          {isAuthenticated && status !== "success" && !isOwnerEmail(userEmail) && (
            <button
              onClick={() => handleClaim(userId ?? "")}
              disabled={status === "claiming"}
              className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === "claiming" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Claiming…
                </>
              ) : (
                <>
                  <i className="ri-nfc-line" />
                  Claim This Tag
                </>
              )}
            </button>
          )}

          {/* Unauthenticated — show login/signup prompts */}
          {!isAuthenticated && status !== "success" && (
            <div className="space-y-3">
              <Link
                href={`/signup?redirect=/claim/${publicId}`}
                className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <i className="ri-user-add-line" />
                Create Free Account
              </Link>

              <Link
                href={`/login?redirect=/claim/${publicId}`}
                className="w-full py-3 rounded-xl bg-transparent border border-[#1e1e1e] text-[#888] font-bold text-sm uppercase tracking-wider hover:border-[#03A9F4]/40 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
              >
                <i className="ri-login-box-line" />
                Sign In
              </Link>
            </div>
          )}

          <p className="text-[#333] text-xs text-center mt-6">
            By claiming this tag you agree to our{" "}
            <Link href="/terms" className="text-[#03A9F4]/60 hover:text-[#03A9F4] transition-colors">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
