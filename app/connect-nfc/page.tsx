"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NfcStatus =
  | "checking-auth"
  | "ready"
  | "unsupported"
  | "waiting"
  | "reading"
  | "connecting"
  | "success"
  | "already-linked"
  | "error";

type NDEFReadingEventWithSerial = Event & {
  serialNumber?: string;
};

type NDEFReaderConstructor = new () => {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  addEventListener: (
    type: "reading" | "readingerror",
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ) => void;
};

declare global {
  interface Window {
    NDEFReader?: NDEFReaderConstructor;
  }
}

const statusCopy: Record<NfcStatus, { title: string; body: string; icon: string }> = {
  "checking-auth": {
    title: "Checking your account",
    body: "One moment while we confirm your session.",
    icon: "ri-shield-check-line",
  },
  ready: {
    title: "Connect your NFC medal",
    body: "Tap Start, then hold the medal near the back of your phone until it is detected.",
    icon: "ri-nfc-line",
  },
  unsupported: {
    title: "NFC reading is not available here",
    body: "Use Chrome on an Android phone with NFC enabled, then open this page again.",
    icon: "ri-error-warning-line",
  },
  waiting: {
    title: "Waiting for NFC",
    body: "Keep this page open and move the medal slowly around the NFC area of your phone.",
    icon: "ri-rfid-line",
  },
  reading: {
    title: "Reading medal",
    body: "The tag was detected. Capturing the hardware serial number now.",
    icon: "ri-scan-2-line",
  },
  connecting: {
    title: "Connecting",
    body: "We are securely linking this medal to your NFC ID account.",
    icon: "ri-loader-4-line",
  },
  success: {
    title: "Connected successfully",
    body: "This physical medal is now permanently linked to your account.",
    icon: "ri-checkbox-circle-line",
  },
  "already-linked": {
    title: "Already connected",
    body: "This medal is already linked to your account. You can manage it from your dashboard.",
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login?redirect=/connect-nfc");
        return;
      }

      setToken(data.session.access_token);
      setStatus(typeof window !== "undefined" && window.NDEFReader ? "ready" : "unsupported");
    });
  }, [router, supabase]);

  async function linkUid(uid: string) {
    if (!token) return;
    setStatus("connecting");
    setError("");

    const response = await fetch("/api/v1/nfc/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid }),
    });
    const body = await response.json();

    if (!response.ok) {
      setStatus("error");
      setError(body?.error?.message ?? "This medal could not be linked.");
      return;
    }

    const href = `/profile/${body.data.profile.publicId}`;
    setProfileHref(href);
    setStatus(body.data.status === "already-linked" ? "already-linked" : "success");
    window.setTimeout(() => router.push("/dashboard"), 1800);
  }

  async function startScan() {
    if (!window.NDEFReader) {
      setStatus("unsupported");
      return;
    }

    try {
      setStatus("waiting");
      setError("");
      const controller = new AbortController();
      const reader = new window.NDEFReader();

      reader.addEventListener(
        "reading",
        (event) => {
          setStatus("reading");
          controller.abort();
          const uid = (event as NDEFReadingEventWithSerial).serialNumber;
          if (!uid) {
            setStatus("error");
            setError("Your browser detected the medal, but did not expose a hardware serial number.");
            return;
          }
          void linkUid(uid);
        },
        { once: true },
      );

      reader.addEventListener(
        "readingerror",
        () => {
          setStatus("error");
          setError("The medal was detected but could not be read. Try holding it still for a moment.");
        },
        { once: true },
      );

      await reader.scan({ signal: controller.signal });
    } catch (scanError) {
      if (scanError instanceof DOMException && scanError.name === "AbortError") return;
      setStatus("error");
      setError(scanError instanceof Error ? scanError.message : "NFC permission was not granted.");
    }
  }

  const copy = statusCopy[status];
  const isBusy = ["checking-auth", "waiting", "reading", "connecting"].includes(status);
  const isPositive = status === "success" || status === "already-linked";
  const canScan = status === "ready" || status === "error";
  const statusTitle =
    status === "unsupported"
      ? "Open on Android"
      : status === "success"
        ? "Connected"
        : status === "already-linked"
          ? "Already Linked"
          : status === "error"
            ? "Try Again"
            : isBusy
              ? copy.title
              : "Ready to Scan";
  const statusBody =
    status === "ready"
      ? "Bring your card closer to the back of your phone."
      : status === "unsupported"
        ? "Use Chrome on an Android phone with NFC enabled."
        : copy.body;

  return (
    <main className="min-h-screen overflow-hidden bg-[#02080c] text-white">
      <style>{`
        .connect-shell {
          position: relative;
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
      <div className="connect-shell mx-auto min-h-screen w-full max-w-6xl px-5 py-8 [font-family:Inter,system-ui,sans-serif] sm:px-8 lg:flex lg:flex-col lg:justify-center lg:py-12">
        <header className="mb-10 flex items-center justify-center lg:mb-14">
          <Link href="/" className="flex w-fit items-center justify-center">
            <Image src="/assets/linkup/linkup-logo-compact.png" alt="LinkUp" width={260} height={304} className="h-auto w-[126px] lg:w-[148px]" priority />
          </Link>
        </header>

        <div className="connect-layout mx-auto grid w-full max-w-[430px] items-center gap-7 lg:max-w-none lg:grid-cols-[0.9fr_1.1fr] lg:gap-x-12 lg:gap-y-8">
          <section className="text-center lg:text-left">
            <div className="inline-flex rounded-[13px] border border-[#03A9F4]/35 bg-[#03A9F4]/5 px-6 py-2 text-[13px] font-bold uppercase tracking-[0.08em] text-[#03A9F4]">
              Connect your card
            </div>

            <h1 className="mt-8 text-[40px] font-black leading-[1.12] tracking-[-0.02em] text-white sm:text-[46px] lg:text-[64px]">
              Tap Your Card
              <span className="block text-[#088cff]">to Connect</span>
            </h1>

            <p className="mx-auto mt-6 max-w-[350px] text-[17px] leading-8 text-white/72 lg:mx-0 lg:max-w-[430px] lg:text-[19px]">
              Hold your LinkUp card near the back of your phone to link it to your account.
            </p>
          </section>

          <section className="connect-visual relative h-[330px] overflow-visible lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[500px]" aria-label="LinkUp card approaching the back of a phone">
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
              onClick={canScan ? startScan : undefined}
              disabled={!canScan}
              className="connect-status grid w-full grid-cols-[58px_1fr_48px] items-center gap-4 rounded-[22px] border border-white/10 bg-[#071725]/86 px-5 py-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_45px_rgba(0,0,0,0.32)] transition enabled:hover:border-[#03A9F4]/35 enabled:hover:bg-[#092033] enabled:active:scale-[0.99] disabled:cursor-default"
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/10 bg-[#0a1824]">
                <i className={`${copy.icon} ${status === "connecting" ? "animate-spin" : ""} text-3xl ${isPositive ? "text-green-300" : "text-[#03A9F4]"}`} />
              </span>
              <span>
                <span className="block text-[20px] font-extrabold leading-tight text-white">{statusTitle}</span>
                <span className="mt-2 block text-[15px] leading-6 text-white/65">{statusBody}</span>
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

              <section className="mt-8 px-5 lg:mt-0 lg:px-0">
                <h2 className="text-[16px] font-bold text-[#03A9F4]">Tips</h2>
                <div className="mt-5 space-y-4 text-[15px] leading-6 text-white/70">
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

        <footer className="mx-auto mt-8 w-full max-w-4xl border-t border-white/10 px-5 pb-8 pt-7">
          <p className="flex items-center justify-center gap-3 text-center text-[15px] text-white/55">
            <i className="ri-lock-line text-xl text-white/45" />
            Your connection is <span className="text-[#03A9F4]">secure</span> and encrypted.
          </p>
          <Link href="/dashboard" className="sr-only">Dashboard</Link>
        </footer>
      </div>
    </main>
  );
}
