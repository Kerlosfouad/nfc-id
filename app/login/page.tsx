"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const supabase = createClient();

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(redirectTo);
    });
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); return; }

      // Check if MFA is required (Requirement 7.2)
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const totpFactor = mfaData?.totp?.find((f) => f.status === "verified");
      if (totpFactor) {
        setFactorId(totpFactor.id);
        setMfaRequired(true);
        return;
      }

      router.replace(redirectTo);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setMfaError(null);
    setMfaLoading(true);
    try {
      const { error: mfaErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: totpCode,
      });
      if (mfaErr) { setMfaError(mfaErr.message); return; }
      router.replace(redirectTo);
    } catch {
      setMfaError("An unexpected error occurred.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` },
    });
  }

  // MFA verification screen
  if (mfaRequired) {
    return (
      <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#03A9F4]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full max-w-[440px]">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/img/logo.png" alt="NFC ID" width={40} height={40} className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all" />
              <span className="text-white font-bold text-xl tracking-wider">NFC <span className="text-[#03A9F4]">ID</span></span>
            </Link>
          </div>
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="mb-8">
              <h2 className="text-white text-3xl font-bold mb-1">Two-Factor Auth</h2>
              <p className="text-[#555] text-sm">Enter the 6-digit code from your authenticator app</p>
            </div>
            <form onSubmit={handleMfaVerify} className="space-y-5">
              <div className="group">
                <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">TOTP Code</label>
                <div className="relative">
                  <i className="ri-shield-keyhole-line absolute left-4 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 focus:shadow-[0_0_0_3px_rgba(3,169,244,0.08)] text-white rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 placeholder:text-[#333] text-sm tracking-widest"
                    placeholder="000000"
                  />
                </div>
              </div>
              {mfaError && <p className="text-red-400 text-xs">{mfaError}</p>}
              <button type="submit" disabled={mfaLoading || totpCode.length !== 6}
                className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                {mfaLoading ? "Verifying…" : "Verify"}
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
            <Image src="/img/logo.png" alt="NFC ID" width={40} height={40} className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all" />
            <span className="text-white font-bold text-xl tracking-wider">NFC <span className="text-[#03A9F4]">ID</span></span>
          </Link>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="mb-8">
            <h2 className="text-white text-3xl font-bold mb-1">Welcome back</h2>
            <p className="text-[#555] text-sm">Sign in to your NFC ID account</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="group">
              <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">Email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 focus:shadow-[0_0_0_3px_rgba(3,169,244,0.08)] text-white rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 placeholder:text-[#333] text-sm"
                  placeholder="email@example.com" />
              </div>
            </div>

            <div className="group">
              <div className="flex justify-between mb-2">
                <label className="text-[#888] text-xs font-semibold uppercase tracking-wider">Password</label>
                <a href="#" className="text-[#03A9F4]/70 text-xs hover:text-[#03A9F4] transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 focus:shadow-[0_0_0_3px_rgba(3,169,244,0.08)] text-white rounded-xl pl-11 pr-11 py-3 outline-none transition-all duration-200 placeholder:text-[#333] text-sm"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] transition-colors">
                  <i className={showPass ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#1e1e1e]" />
            <span className="text-[#333] text-xs">OR</span>
            <div className="flex-1 h-px bg-[#1e1e1e]" />
          </div>

          {/* OAuth buttons — Requirement 7.3 */}
          <div className="space-y-3">
            <button type="button" onClick={() => handleOAuth("google")}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm font-semibold hover:border-[#03A9F4]/40 hover:bg-[#111] transition-all duration-200">
              <i className="ri-google-fill text-lg text-[#EA4335]" />
              Continue with Google
            </button>
            <button type="button" onClick={() => handleOAuth("apple")}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm font-semibold hover:border-[#03A9F4]/40 hover:bg-[#111] transition-all duration-200">
              <i className="ri-apple-fill text-lg" />
              Continue with Apple
            </button>
          </div>

          <p className="text-[#555] text-sm text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#03A9F4] font-semibold hover:text-white transition-colors">Create one free</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
