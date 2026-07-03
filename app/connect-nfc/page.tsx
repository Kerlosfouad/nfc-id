"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NfcStatus =
  | "checking-auth"
  | "ready"
  | "unsupported"
  | "connecting"
  | "success"
  | "already-linked"
  | "error";

const statusCopy: Record<NfcStatus, { title: string; body: string; icon: string }> = {
  "checking-auth": {
    title: "Checking your account",
    body: "One moment while we confirm your session.",
    icon: "ri-shield-check-line",
  },
  ready: {
    title: "Link your NFC card",
    body: "Press the button to link the NFC card detected from your first scan.",
    icon: "ri-nfc-line",
  },
  unsupported: {
    title: "Ready to link",
    body: "Press the button to link the available NFC card to this account.",
    icon: "ri-error-warning-line",
  },
  connecting: {
    title: "Linking card",
    body: "We are securely saving this NFC card to your account.",
    icon: "ri-loader-4-line",
  },
  success: {
    title: "Card linked successfully",
    body: "Your NFC card has been successfully linked to your account.",
    icon: "ri-checkbox-circle-line",
  },
  "already-linked": {
    title: "Already connected",
    body: "This NFC card is already linked to your account. Future scans will open your profile.",
    icon: "ri-checkbox-multiple-line",
  },
  error: {
    title: "Could not connect",
    body: "Try again, or use a supported phone with NFC enabled.",
    icon: "ri-close-circle-line",
  },
};

export default function ConnectNfcPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<NfcStatus>("checking-auth");
  const [error, setError] = useState("");
  const [profileHref, setProfileHref] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [prefilledUid, setPrefilledUid] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function prepareNfcFlow() {
      const { data } = await supabase.auth.getSession();
      const uidFromRedirect = new URLSearchParams(window.location.search)
        .get("uid")
        ?.trim()
        .toUpperCase()
        .replace(/[^A-Z0-9:_-]/g, "") ?? "";

      if (cancelled) return;
      setPrefilledUid(uidFromRedirect);

      if (uidFromRedirect) {
        try {
          const response = await fetch(`/api/v1/nfc/resolve?uid=${encodeURIComponent(uidFromRedirect)}`);
          const body = await response.json();
          const destination = body?.data;

          if (cancelled) return;

          if ((destination?.kind === "profile" || destination?.kind === "suspended") && destination.href) {
            router.replace(destination.href);
            return;
          }

          if (!data.session && destination?.kind === "register" && destination.href) {
            router.replace(destination.href);
            return;
          }
        } catch {
          if (cancelled) return;
        }
      }

      if (!data.session) {
        router.replace("/login?redirect=/connect-nfc");
        return;
      }

      setToken(data.session.access_token);
      setStatus("ready");
    }

    void prepareNfcFlow();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const linkCard = useCallback(async ({ uid, publicId }: { uid?: string; publicId?: string }) => {
    if (!token) return;
    const normalizedUid = uid?.trim();
    const normalizedPublicId = publicId?.trim();
    setStatus("connecting");
    setError("");

    const response = await fetch("/api/v1/nfc/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...(normalizedUid ? { uid: normalizedUid } : {}),
        ...(normalizedPublicId ? { publicId: normalizedPublicId } : {}),
      }),
    });
    const body = await response.json();

    if (!response.ok) {
      setStatus("error");
      setError(body?.error?.message ?? "This NFC card could not be linked.");
      return;
    }

    const href = `/profile/${body.data.profile.publicId}`;

    setProfileHref(href);
    setStatus(body.data.status === "already-linked" ? "already-linked" : "success");
    window.setTimeout(() => router.push("/dashboard"), 1800);
  }, [router, token]);

  const copy = statusCopy[status];
  const isBusy = ["checking-auth", "connecting"].includes(status);
  const isPositive = status === "success" || status === "already-linked";
  const canLinkCard = status === "ready" || status === "error" || status === "unsupported";
  const handlePrimaryAction = canLinkCard
    ? () => void linkCard(prefilledUid ? { uid: prefilledUid } : {})
    : undefined;
  const statusTitle =
    status === "unsupported"
      ? "Ready to Link"
      : status === "success"
        ? "Connected"
        : status === "already-linked"
          ? "Already Linked"
          : status === "error"
            ? "Try Again"
            : isBusy
              ? copy.title
              : "Ready to Link";
  const statusBody =
    status === "ready" && prefilledUid
      ? "We found the card UID from your first scan. Press once to finish linking."
      : status === "ready"
      ? "Press once to link the available NFC card to this account."
      : status === "unsupported"
        ? "No scan is needed here. The button will link the available unlinked card."
        : copy.body;

  return (
    <main className="min-h-[100svh] overflow-hidden bg-[#02080c] text-white">
      <style>{`
        .connect-shell {
          position: relative;
          min-height: 100svh;
          background:
            radial-gradient(circle at 50% 44%, rgba(3, 169, 244, 0.22), transparent 24rem),
            radial-gradient(circle at 50% -8%, rgba(3, 169, 244, 0.08), transparent 18rem),
            linear-gradient(180deg, #061018 0%, #02070b 55%, #020608 100%);
        }

        .connect-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.03), transparent 20%, transparent 80%, rgba(255,255,255,0.025)),
            radial-gradient(circle at 50% 42%, transparent 0 34%, rgba(0,0,0,0.28) 78%);
        }

        .connect-layout,
        .connect-shell > header,
        .connect-shell > footer {
          position: relative;
          z-index: 1;
        }

        .connect-visual {
          filter: drop-shadow(0 24px 42px rgba(0, 0, 0, 0.6));
        }

        .connect-artwork {
          position: absolute;
          inset: 0;
          transform: translate3d(0, 0, 0);
        }

        .connect-reference-artwork {
          inset: -8% -16%;
        }

        .connect-reference-artwork img {
          filter: saturate(1.08) contrast(1.04);
          -webkit-mask-image: radial-gradient(ellipse at 54% 58%, #000 0 54%, rgba(0,0,0,0.82) 64%, transparent 80%);
          mask-image: radial-gradient(ellipse at 54% 58%, #000 0 54%, rgba(0,0,0,0.82) 64%, transparent 80%);
        }

        .connect-artwork::after {
          content: "";
          position: absolute;
          inset: auto 6% 0 6%;
          height: 34%;
          background: linear-gradient(180deg, transparent, #02070b 86%);
          pointer-events: none;
        }

        .connect-artwork-active {
          animation: connectArtworkFloat 2.6s ease-in-out infinite;
        }

        .connect-progress {
          width: 45px;
          height: 45px;
          border-radius: 999px;
          background:
            radial-gradient(circle, #071725 0 54%, transparent 56%),
            conic-gradient(from 10deg, #03A9F4 0 82deg, rgba(3,169,244,0.16) 84deg 360deg);
          box-shadow: 0 0 20px rgba(3,169,244,0.35);
          animation: connectProgressSpin 1.8s linear infinite;
        }

        .connect-progress-done {
          background:
            radial-gradient(circle, #071725 0 54%, transparent 56%),
            conic-gradient(#4ade80 0 360deg);
        }

        @media (max-width: 767px) {
          .connect-shell {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-top: max(14px, env(safe-area-inset-top));
            padding-bottom: max(12px, env(safe-area-inset-bottom));
          }

          .connect-reference-artwork {
            inset: -9% -10% -5%;
          }

          .connect-status {
            grid-template-columns: 42px 1fr 38px;
          }
        }

        @keyframes connectProgressSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes connectArtworkFloat {
          0%, 100% { transform: translate3d(0, 2px, 0) scale(1); }
          50% { transform: translate3d(-3px, -5px, 0) scale(1.01); }
        }

        @media (prefers-reduced-motion: reduce) {
          .connect-artwork-active,
          .connect-progress {
            animation: none !important;
          }
        }
      `}</style>
      <div className="connect-shell mx-auto w-full max-w-6xl px-5 py-8 [font-family:Inter,system-ui,sans-serif] sm:px-8 lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:py-12">
        <header className="mb-5 flex items-center justify-center sm:mb-8 lg:mb-14">
          <Link href="/" className="flex w-fit items-center justify-center">
            <Image src="/assets/linkup/linkup-logo-compact.png" alt="LinkUp" width={260} height={304} className="h-auto w-[94px] sm:w-[126px] lg:w-[148px]" priority />
          </Link>
        </header>

        <div className="connect-layout mx-auto grid w-full max-w-[430px] flex-1 items-center gap-4 sm:gap-7 lg:max-w-none lg:grid-cols-[0.9fr_1.1fr] lg:gap-x-12 lg:gap-y-8">
          <section className="text-center lg:text-left">
            <div className="inline-flex rounded-[13px] border border-[#03A9F4]/35 bg-[#03A9F4]/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#03A9F4] sm:px-6 sm:py-2 sm:text-[13px]">
              Link your NFC card
            </div>

            <h1 className="mt-4 text-[31px] font-black leading-[1.08] tracking-[-0.02em] text-white sm:mt-8 sm:text-[46px] lg:text-[64px]">
              Link Card
              <span className="block text-[#088cff]">Now</span>
            </h1>

            <p className="mx-auto mt-3 max-w-[315px] text-[14px] leading-6 text-white/72 sm:mt-6 sm:max-w-[350px] sm:text-[17px] sm:leading-8 lg:mx-0 lg:max-w-[430px] lg:text-[19px]">
              Press the button below to link the card detected from your first scan. No second scan is needed.
            </p>
          </section>

          <section className="connect-visual relative h-[245px] overflow-visible sm:h-[330px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[500px]" aria-label="LinkUp card approaching the back of a phone">
            <div className={`connect-artwork connect-reference-artwork ${isBusy ? "connect-artwork-active" : ""}`}>
              <Image
                src="/assets/linkup/connect-nfc-phone-card-v2.png"
                alt="LinkUp card approaching the back of a phone"
                width={720}
                height={475}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </section>

          <section className="lg:col-start-1 lg:row-start-2">
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!handlePrimaryAction}
              className="connect-status grid w-full grid-cols-[58px_1fr_48px] items-center gap-3 rounded-[18px] border border-white/10 bg-[#071725]/86 px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition enabled:hover:border-[#03A9F4]/35 enabled:hover:bg-[#092033] enabled:active:scale-[0.99] disabled:cursor-default sm:gap-4 sm:rounded-[22px] sm:px-5 sm:py-5"
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-[#0a1824] sm:h-[52px] sm:w-[52px]">
                <i className={`${copy.icon} ${status === "connecting" ? "animate-spin" : ""} text-2xl ${isPositive ? "text-green-300" : "text-[#03A9F4]"} sm:text-3xl`} />
              </span>
              <span>
                <span className="block text-[17px] font-extrabold leading-tight text-white sm:text-[20px]">{canLinkCard ? "Link NFC Card" : statusTitle}</span>
                <span className="mt-1.5 block text-[13px] leading-5 text-white/65 sm:mt-2 sm:text-[15px] sm:leading-6">{statusBody}</span>
              </span>
              <span className={`connect-progress ${isPositive ? "connect-progress-done" : ""}`} aria-hidden="true" />
            </button>

            <div className="lg:mt-7">
              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100 lg:mt-0">
                  {error}
                </p>
              )}

              {profileHref && (
                <Link href={profileHref} className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 text-sm font-semibold text-white/78 transition hover:border-[#03A9F4]/40 hover:text-white">
                  <i className="ri-external-link-line" />
                  View public profile
                </Link>
              )}

              <section className="mt-5 px-2 sm:mt-8 sm:px-5 lg:mt-0 lg:px-0">
                <h2 className="text-[16px] font-bold text-[#03A9F4]">Tips</h2>
                <div className="mt-3 space-y-3 text-[13px] leading-5 text-white/70 sm:mt-5 sm:space-y-4 sm:text-[15px] sm:leading-6">
                  <p className="flex items-center gap-4">
                    <i className="ri-smartphone-line text-xl text-white/45" />
                    Make sure NFC is enabled on your device.
                  </p>
                  <p className="flex items-center gap-4">
                    <i className="ri-timer-flash-line text-xl text-white/45" />
                    Hold the card still for the best results.
                  </p>
                </div>
              </section>
            </div>
          </section>
        </div>

        <footer className="mx-auto mt-5 w-full max-w-4xl border-t border-white/10 px-5 pb-2 pt-4 sm:mt-8 sm:pb-8 sm:pt-7">
          <p className="flex items-center justify-center gap-3 text-center text-[13px] text-white/55 sm:text-[15px]">
            <i className="ri-lock-line text-xl text-white/45" />
            Your connection is <span className="text-[#03A9F4]">secure</span> and encrypted.
          </p>
          <Link href="/dashboard" className="sr-only">Dashboard</Link>
        </footer>
      </div>
    </main>
  );
}
