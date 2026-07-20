"use client";
import { Suspense } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { decodeNfcRedirect } from "@/lib/auth/nfcRedirect";
import { useLanguage } from "@/components/LanguageProvider";

function readableAuthError(message: unknown) {
  const fallback = "Account could not be created. Please try again.";
  if (typeof message !== "string" || !message.trim()) return fallback;

  const normalized = message.toLowerCase();
  if (
    normalized.includes("testing emails") ||
    normalized.includes("verify a domain") ||
    normalized.includes("resend.com/domains")
  ) {
    return "Account could not be created because the email service is not configured.";
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
  const { isArabic } = useLanguage();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const nfcSession = searchParams.get("nfcSession")?.replace(/[^a-zA-Z0-9_-]/g, "") ?? "";
  const redirectParam = searchParams.get("redirect");
  const redirectTo = nfcSession
    ? `/connect-nfc?nfcSession=${encodeURIComponent(nfcSession)}`
    : redirectParam?.startsWith("/") ? redirectParam : "/connect-nfc";
  const loginHref = redirectParam?.startsWith("/")
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : nfcSession
      ? `/login?nfcSession=${encodeURIComponent(nfcSession)}`
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
          redirectTo,
          ...(nfcSession ? { nfcSession } : {}),
        }),
      });
      const signupBody = await signupRes.json().catch(() => ({}));
      if (!signupRes.ok) {
        setError(readableAuthError(signupBody?.error?.message));
        return;
      }

      setEmail(cleanEmail);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });
      if (signInError) {
        setError(readableAuthError(signInError.message));
        return;
      }
      router.replace(redirectTo);
    } catch (e) {
      setError(readableAuthError(e instanceof Error ? e.message : "An unexpected error occurred. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google") {
    setError(null);
    if (!decodeNfcRedirect(redirectTo)) {
      setError("Scan your NFC medal first, then create your account from the medal setup link.");
      return;
    }
    // Save redirect in both localStorage (client) and server-side cookie (via API)
    // so it survives mobile OAuth browser context switches.
    window.localStorage.setItem("linkup_auth_redirect", redirectTo);
    await fetch("/auth/remember-redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect: redirectTo }),
    }).catch(() => { /* non-blocking */ });
    window.location.assign(`/auth/oauth/start?provider=${provider}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07090c] px-4 py-8 ${isArabic ? "font-[Cairo]" : ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(3,169,244,0.18),transparent_34rem),linear-gradient(180deg,rgba(3,169,244,0.05),transparent_42%)]" />

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-7 flex justify-center">
          <Link href="/" className="group flex items-center justify-center">
            <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={62} height={62} className="h-16 w-16 object-contain transition-all group-hover:drop-shadow-[0_0_16px_rgba(3,169,244,0.75)]" priority />
          </Link>
        </div>
        <div className="rounded-2xl border border-[#03A9F4]/18 bg-[#0d2539] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold leading-tight text-white sm:text-4xl">{isArabic ? "إنشاء حساب" : "Create account"}</h2>
            <p className="text-sm text-white/60">
              {redirectTo.startsWith("/connect-nfc")
                ? (isArabic ? "أنشئ حسابك قبل ربط بطاقة NFC" : "Create your account before linking your NFC card")
                : (isArabic ? "انضم إلى مستخدمي LinkUp" : "Join thousands of LinkUp users")}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="group">
              <label className={`mb-2 block text-xs font-semibold text-white/55 ${isArabic ? "" : "uppercase tracking-wider"}`}>{isArabic ? "البريد الإلكتروني" : "Email"}</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]"
                  placeholder="email@example.com" />
              </div>
            </div>

            <div className="group">
              <label className={`mb-2 block text-xs font-semibold text-white/55 ${isArabic ? "" : "uppercase tracking-wider"}`}>{isArabic ? "الاسم الكامل" : "Full Name"}</label>
              <div className="relative">
                <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/45 transition-colors group-focus-within:text-[#03A9F4]" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="w-full rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#03A9F4]/70 focus:bg-[#061522]"
                  placeholder={isArabic ? "اسمك الكامل" : "Your full name"} />
              </div>
            </div>

            <div className="group">
              <label className={`mb-2 block text-xs font-semibold text-white/55 ${isArabic ? "" : "uppercase tracking-wider"}`}>{isArabic ? "كلمة المرور" : "Password"}</label>
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
              <label className={`mb-2 block text-xs font-semibold text-white/55 ${isArabic ? "" : "uppercase tracking-wider"}`}>{isArabic ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
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
              {loading ? (isArabic ? "جار إنشاء الحساب..." : "Creating account...") : (isArabic ? "إنشاء الحساب" : "Create Account")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-[#8fdfff]/12" />
            <span className="text-xs text-white/45">{isArabic ? "أو" : "OR"}</span>
            <div className="h-px flex-1 bg-[#8fdfff]/12" />
          </div>

          <div className="space-y-3">
            <button type="button" onClick={() => handleOAuth("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#8fdfff]/12 bg-[#071722] py-3.5 text-sm font-semibold text-white transition-all hover:border-[#03A9F4]/50 hover:bg-[#061522]">
              <i className="ri-google-fill text-lg text-[#EA4335]" />
              {isArabic ? "المتابعة باستخدام Google" : "Continue with Google"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-white/60">
            {isArabic ? "لديك حساب بالفعل؟ " : "Already have an account? "}
            <Link href={loginHref} className="font-semibold text-[#48c7ff] transition-colors hover:text-white">{isArabic ? "تسجيل الدخول" : "Sign in"}</Link>
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
