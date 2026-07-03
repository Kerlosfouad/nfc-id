"use client";
import { Suspense } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignupContent() {
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
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam?.startsWith("/") ? redirectParam : "/connect-nfc";
  const loginHref = redirectParam?.startsWith("/")
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/login";
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const signupRes = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });

      const signupBody = await signupRes.json();
      if (!signupRes.ok) {
        setError(signupBody?.error?.message ?? "Could not create account.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace(redirectTo);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` },
    });
  }

  return (
    <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#03A9F4]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[#8A2BE2]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/img/logo.png" alt="LinkUp" width={40} height={40} className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all" />
            <span className="text-white font-bold text-xl tracking-wider">Link<span className="text-[#03A9F4]">Up</span></span>
          </Link>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.42)]">
          <div className="mb-8">
            <h2 className="text-white text-3xl font-bold mb-1">Create account</h2>
            <p className="text-white/65 text-sm">
              {redirectTo.startsWith("/connect-nfc") ? "Create your account before linking your NFC card" : "Join thousands of LinkUp users"}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="group">
              <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">Email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-white/45 group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 focus:shadow-[0_0_0_3px_rgba(3,169,244,0.08)] text-white rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 placeholder:text-white/50 text-sm"
                  placeholder="email@example.com" />
              </div>
            </div>

            <div className="group">
              <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">Full Name</label>
              <div className="relative">
                <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-white/45 group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 focus:shadow-[0_0_0_3px_rgba(3,169,244,0.08)] text-white rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 placeholder:text-white/50 text-sm"
                  placeholder="Your full name" />
              </div>
            </div>

            <div className="group">
              <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">Password</label>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-white/45 group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 focus:shadow-[0_0_0_3px_rgba(3,169,244,0.08)] text-white rounded-xl pl-11 pr-11 py-3 outline-none transition-all duration-200 placeholder:text-white/50 text-sm"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors" aria-label={showPass ? "Hide password" : "Show password"}>
                  <i className={showPass ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                </button>
              </div>
            </div>

            <div className="group">
              <label className="text-[#888] text-xs font-semibold uppercase tracking-wider block mb-2">Confirm Password</label>
              <div className="relative">
                <i className="ri-lock-password-line absolute left-4 top-1/2 -translate-y-1/2 text-white/45 group-focus-within:text-[#03A9F4] transition-colors text-lg" />
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] focus:border-[#03A9F4]/50 focus:shadow-[0_0_0_3px_rgba(3,169,244,0.08)] text-white rounded-xl pl-11 pr-11 py-3 outline-none transition-all duration-200 placeholder:text-white/50 text-sm"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors" aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}>
                  <i className={showConfirm ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"} />
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#03A9F4] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_25px_rgba(3,169,244,0.35)] active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#1e1e1e]" />
            <span className="text-white/50 text-xs">OR</span>
            <div className="flex-1 h-px bg-[#1e1e1e]" />
          </div>

          {/* OAuth buttons */}
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

          <p className="text-white/65 text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href={loginHref} className="text-[#03A9F4] font-semibold hover:text-white transition-colors">Sign in</Link>
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
