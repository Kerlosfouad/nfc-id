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
  const nfcSession = searchParams.get("nfcSession")?.replace(/[^a-zA-Z0-9_-]/g, "") ?? "";
  const redirectParam = searchParams.get("redirect");
  const redirectTo = nfcSession
    ? `/connect-nfc?nfcSession=${encodeURIComponent(nfcSession)}`
    : redirectParam?.startsWith("/") ? redirectParam : "/dashboard";
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
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

  async function handleOAuth(provider: "google") {
    setError(null);
    window.localStorage.setItem("linkup_auth_redirect", redirectTo);
    window.location.assign(`/auth/oauth/start?provider=${provider}&redirect=${encodeURIComponent(redirectTo)}`);
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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07090c] px-4 py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(3,169,244,0.18),transparent_34rem)]" />
        <div className="relative z-10 w-full max-w-[440px]">
          <div className="mb-7 flex justify-center">
            <Link href="/" className="group flex items-center justify-center">
              <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={58} height={58} className="h-14 w-14 object-contain transition-all group-hover:drop-shadow-[0_0_14px_rgba(3,169,244,0.7)]" priority />
            </Link>
          </div>
          <div className="rounded-2xl border border-[#03A9F4]/18 bg-[#0d2539] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="mb-8">
              <h2 className="mb-1 text-3xl font-bold text-white">Two-Factor Auth</h2>
              <p className="text-sm text-white/60">Enter the 6-digit code from your authenticator app</p>
            </div>
            <form onSubmit={handleMfaVerify} className="space-y-5">
              <div className="group">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">TOTP Code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] px-4 py-3 text-sm tracking-widest text-white outline-none transition-all focus:border-[#03A9F4]/70 focus:bg-[#061522]" placeholder="000000" />
              </div>
              {mfaError && <p className="text-red-400 text-xs">{mfaError}</p>}
              <button type="submit" disabled={mfaLoading || totpCode.length !== 6}
                className="w-full rounded-xl bg-[#03A9F4] py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-[#20bfff] disabled:opacity-50">
                {mfaLoading ? "Verifying..." : "Verify"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07090c] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(3,169,244,0.18),transparent_34rem),linear-gradient(180deg,rgba(3,169,244,0.05),transparent_42%)]" />
      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-7 flex justify-center">
          <Link href="/" className="group flex items-center justify-center">
            <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={62} height={62} className="h-16 w-16 object-contain transition-all group-hover:drop-shadow-[0_0_16px_rgba(3,169,244,0.75)]" priority />
          </Link>
        </div>
        <div className="rounded-2xl border border-[#03A9F4]/18 bg-[#0d2539] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold leading-tight text-white sm:text-4xl">Welcome back</h2>
            <p className="text-sm text-white/60">
              Sign in to your LinkUp account
            </p>
          </div>
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="group">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">Email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]" placeholder="email@example.com" />
              </div>
            </div>
            <div className="group">
              <div className="flex justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/55">Password</label>
                <button type="button" onClick={handlePasswordReset} className="text-xs font-semibold text-[#48c7ff] transition-colors hover:text-white">Forgot password?</button>
              </div>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-11 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]" placeholder="********" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white/80" aria-label={showPass ? "Hide password" : "Show password"}>
                  <i className={showPass ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#03A9F4] py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-[#20bfff] hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-[#8fdfff]/12" /><span className="text-xs text-white/45">OR</span><div className="h-px flex-1 bg-[#8fdfff]/12" />
          </div>
          <div className="space-y-3">
            <button type="button" onClick={() => handleOAuth("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 text-sm font-semibold text-white transition-all hover:border-[#03A9F4]/50 hover:bg-[#061522]">
              <i className="ri-google-fill text-lg text-[#EA4335]" /> Continue with Google
            </button>
          </div>
          <p className="mt-6 text-center text-sm text-white/60">
            Don&apos;t have an account?{" "}
            <Link href={nfcSession ? `/signup?nfcSession=${encodeURIComponent(nfcSession)}` : redirectParam?.startsWith("/connect-nfc") ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : "/signup"} className="font-semibold text-[#48c7ff] transition-colors hover:text-white">Create one free</Link>
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
