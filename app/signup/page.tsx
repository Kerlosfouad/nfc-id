"use client";
import { Suspense } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function readableAuthError(message: unknown) {
  const fallback = "Account could not be created. Please try again.";
  if (typeof message !== "string" || !message.trim()) return fallback;

  const normalized = message.toLowerCase();
  if (
    normalized.includes("testing emails") ||
    normalized.includes("verify a domain") ||
    normalized.includes("resend.com/domains")
  ) {
    return "Confirmation email could not be sent because the email service is still in test mode. Please use the configured test email or verify the sending domain.";
  }

  if (message.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(message);
      return readableAuthError(parsed?.message);
    } catch {
      return fallback;
    }
  }

  return message;
}

function SignupContent() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam?.startsWith("/") ? redirectParam : "/connect-nfc";
  const loginHref = redirectParam?.startsWith("/")
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/login";
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (cleanPassword !== cleanConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (cleanPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    setLoading(true);
    try {
      const signupRes = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          fullName: fullName.trim(),
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        }),
      });
      const signupBody = await signupRes.json().catch(() => ({}));
      if (!signupRes.ok) {
        setError(readableAuthError(signupBody?.error?.message));
        return;
      }

      setEmail(cleanEmail);
      setVerificationCode("");
      setVerificationSent(true);
      setError(null);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function completeVerifiedSignup(accessToken?: string | null) {
    const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
    const completeRes = await fetch("/api/v1/auth/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const completeBody = await completeRes.json().catch(() => ({}));
    if (!completeRes.ok) {
      throw new Error(readableAuthError(completeBody?.error?.message ?? "Could not finish account setup."));
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = verificationCode.replace(/\D/g, "");
    if (token.length < 6 || token.length > 8) {
      setError("Enter the verification code sent to your email.");
      return;
    }

    setError(null);
    setVerifying(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "signup",
      });
      if (verifyError) {
        setError(readableAuthError(verifyError.message));
        return;
      }
      await completeVerifiedSignup(data.session?.access_token);
      router.replace(redirectTo);
    } catch (e) {
      setError(readableAuthError(e instanceof Error ? e.message : "Verification failed."));
    } finally {
      setVerifying(false);
    }
  }

  async function resendVerificationCode() {
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    setError(resendError ? readableAuthError(resendError.message) : "We sent a new verification code.");
  }

  async function handleOAuth(provider: "google") {
    setError(null);
    await fetch("/auth/remember-redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect: redirectTo }),
    }).catch(() => undefined);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` },
    });
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
            <h2 className="mb-2 text-3xl font-bold leading-tight text-white sm:text-4xl">Create account</h2>
            <p className="text-sm text-white/60">
              {redirectTo.startsWith("/connect-nfc") ? "Create your account before linking your NFC card" : "Join thousands of LinkUp users"}
            </p>
          </div>

          {verificationSent ? (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="rounded-xl border border-[#03A9F4]/20 bg-[#071722] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#03A9F4]/12 text-[#48c7ff]">
                    <i className="ri-mail-check-line text-xl" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Check your email</p>
                    <p className="truncate text-xs text-white/50">{email.trim().toLowerCase()}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-white/60">
                  Enter the code we sent so we can confirm the email before linking your NFC card.
                </p>
              </div>

              <div className="group">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">Verification Code</label>
                <div className="relative">
                  <i className="ri-shield-keyhole-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-4 text-center font-mono text-lg tracking-[0.34em] text-white outline-none transition-all placeholder:text-white/25 focus:border-[#03A9F4]/70 focus:bg-[#061522]"
                    placeholder="000000"
                  />
                </div>
              </div>

              {error && (
                <p className={`rounded-xl border px-3 py-2 text-xs leading-5 ${error.toLowerCase().includes("sent") ? "border-[#03A9F4]/20 bg-[#03A9F4]/10 text-[#8fdfff]" : "border-red-400/20 bg-red-400/10 text-red-100"}`}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={verifying || verificationCode.length < 6}
                className="mt-2 w-full rounded-xl bg-[#03A9F4] py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-[#20bfff] hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                {verifying ? "Verifying..." : "Verify Email"}
              </button>

              <div className="flex items-center justify-between gap-3 text-xs">
                <button type="button" onClick={() => setVerificationSent(false)} className="font-semibold text-white/45 transition hover:text-white">
                  Change email
                </button>
                <button type="button" onClick={resendVerificationCode} className="font-semibold text-[#48c7ff] transition hover:text-white">
                  Resend code
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="group">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">Email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]"
                  placeholder="email@example.com" />
              </div>
            </div>

            <div className="group">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">Full Name</label>
              <div className="relative">
                <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]"
                  placeholder="Your full name" />
              </div>
            </div>

            <div className="group">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">Password</label>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-11 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white/80" aria-label={showPass ? "Hide password" : "Show password"}>
                  <i className={showPass ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                </button>
              </div>
            </div>

            <div className="group">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">Confirm Password</label>
              <div className="relative">
                <i className="ri-lock-password-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-11 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white/80" aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}>
                  <i className={showConfirm ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#03A9F4] py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-[#20bfff] hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          )}

          {!verificationSent && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-[#8fdfff]/12" />
                <span className="text-xs text-white/45">OR</span>
                <div className="h-px flex-1 bg-[#8fdfff]/12" />
              </div>

              <div className="space-y-3">
                <button type="button" onClick={() => handleOAuth("google")}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 text-sm font-semibold text-white transition-all hover:border-[#03A9F4]/50 hover:bg-[#061522]">
                  <i className="ri-google-fill text-lg text-[#EA4335]" />
                  Continue with Google
                </button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-[#48c7ff] transition-colors hover:text-white">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="bg-[#0b0a0a] min-h-screen" />}>
      <SignupContent />
    </Suspense>
  );
}
