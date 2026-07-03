"use client";
import { Suspense } from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isOwnerEmail } from "@/lib/config/ownerAccess";

function LoginContent() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam?.startsWith("/") && !redirectParam.startsWith("/connect-nfc") ? redirectParam : "/dashboard";
  const resolveRedirect = useCallback((userEmail?: string | null) => {
    if (isOwnerEmail(userEmail) && !redirectParam) return "/admin";
    return redirectTo;
  }, [redirectParam, redirectTo]);
  const callbackError = searchParams.get("error");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (callbackError === "auth_callback_failed") {
      setError("Sign in could not be completed. Please try again.");
    }
  }, [callbackError]);
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) { setError(signInError.message); return; }
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const totpFactor = mfaData?.totp?.find((f) => f.status === "verified");
      if (totpFactor) { setFactorId(totpFactor.id); setMfaRequired(true); return; }
      const { data } = await supabase.auth.getUser();
      router.replace(resolveRedirect(data.user?.email));
    } catch { setError("An unexpected error occurred."); }
    finally { setLoading(false); }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setMfaError(null); setMfaLoading(true);
    try {
      const { error: mfaErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: totpCode });
      if (mfaErr) { setMfaError(mfaErr.message); return; }
      const { data } = await supabase.auth.getUser();
      router.replace(resolveRedirect(data.user?.email));
    } catch { setMfaError("An unexpected error occurred."); }
    finally { setMfaLoading(false); }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function handlePasswordReset() {
    const cleanEmail = email.trim();
    setError(null);

    if (!cleanEmail) {
      setError("Enter your email first, then request a password reset.");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
    });

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setError("Password reset email sent. Check your inbox.");
  }
  if (mfaRequired) {
    return (
      <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#03A9F4]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full max-w-[440px]">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/img/logo.png" alt="LinkUp" width={40} height={40} className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all" />
              <span className="text-white font-bold text-xl tracking-wider">Link<span className="text-[#03A9F4]">Up</span></span>
            </Link>
          </div>
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.42)]">
            <div className="mb-8">
              <h2 className="text-white text-3xl font-bold mb-1">Two-Factor Auth</h2>
              <p className="text-white/65 text-sm">Enter the 6-digit code from your authenticator app</p>
            </div>
            <form onSubmit={handleMfaVerify} className="space-y-5">
              <div className="group">
                <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">TOTP Code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 text-white rounded-xl px-4 py-3 outline-none transition-all text-sm tracking-widest" placeholder="000000" />
              </div>
              {mfaError && <p className="text-red-400 text-xs">{mfaError}</p>}
              <button type="submit" disabled={mfaLoading || totpCode.length !== 6}
                className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 transition-all disabled:opacity-50">
                {mfaLoading ? "Verifying..." : "Verify"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#03A9F4]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#03A9F4]/3 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/img/logo.png" alt="LinkUp" width={40} height={40} className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all" />
            <span className="text-white font-bold text-xl tracking-wider">Link<span className="text-[#03A9F4]">Up</span></span>
          </Link>
        </div>
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.42)]">
          <div className="mb-8">
            <h2 className="text-white text-3xl font-bold mb-1">Welcome back</h2>
            <p className="text-white/65 text-sm">
              Sign in to your LinkUp account
            </p>
          </div>
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="group">
              <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">Email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-white/45 group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 text-white rounded-xl pl-11 pr-4 py-3 outline-none transition-all text-sm" placeholder="email@example.com" />
              </div>
            </div>
            <div className="group">
              <div className="flex justify-between mb-2">
                <label className="text-[#888] text-xs font-semibold uppercase tracking-wider">Password</label>
                <button type="button" onClick={handlePasswordReset} className="text-[#03A9F4]/70 text-xs hover:text-[#03A9F4] transition-colors">Forgot password?</button>
              </div>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-white/45 group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 text-white rounded-xl pl-11 pr-11 py-3 outline-none transition-all text-sm" placeholder="********" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors" aria-label={showPass ? "Hide password" : "Show password"}>
                  <i className={showPass ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] transition-all mt-2 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#1e1e1e]" /><span className="text-white/50 text-xs">OR</span><div className="flex-1 h-px bg-[#1e1e1e]" />
          </div>
          <div className="space-y-3">
            <button type="button" onClick={() => handleOAuth("google")}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm font-semibold hover:border-[#03A9F4]/40 hover:bg-[#111] transition-all">
              <i className="ri-google-fill text-lg text-[#EA4335]" /> Continue with Google
            </button>
            <button type="button" onClick={() => handleOAuth("apple")}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm font-semibold hover:border-[#03A9F4]/40 hover:bg-[#111] transition-all">
              <i className="ri-apple-fill text-lg" /> Continue with Apple
            </button>
          </div>
          <p className="text-white/65 text-sm text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link href={redirectParam?.startsWith("/connect-nfc") ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"} className="text-[#03A9F4] font-semibold hover:text-white transition-colors">Create one free</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bg-[#0b0a0a] min-h-screen" />}>
      <LoginContent />
    </Suspense>
  );
}
