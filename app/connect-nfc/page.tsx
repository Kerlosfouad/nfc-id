"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  message?: {
    records?: Array<{
      recordType?: string;
      data?: DataView;
    }>;
  };
};

type NDEFReaderConstructor = new () => {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  write?: (message: string | { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
  addEventListener: (
    type: "reading" | "readingerror",
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ) => void;
};

const NFC_URI_PREFIXES: Record<number, string> = {
  0x01: "http://www.",
  0x02: "https://www.",
  0x03: "http://",
  0x04: "https://",
};

const RESERVED_PUBLIC_PATHS = new Set([
  "admin",
  "api",
  "auth",
  "checkout",
  "claim",
  "connect-nfc",
  "dashboard",
  "login",
  "privacy",
  "profile",
  "scan",
  "shop",
  "signup",
  "suspended",
  "terms",
]);

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
    title: "Link your NFC card",
    body: "Tap Start, then scan the same NFC card again to link it to this account.",
    icon: "ri-nfc-line",
  },
  unsupported: {
    title: "NFC reading is not available here",
    body: "Use Chrome on an Android phone with NFC enabled, then open this page again.",
    icon: "ri-error-warning-line",
  },
  waiting: {
    title: "Waiting for NFC",
    body: "Keep this page open and move the card slowly around the NFC area of your phone.",
    icon: "ri-rfid-line",
  },
  reading: {
    title: "Reading card",
    body: "The tag was detected. Capturing the hardware serial number now.",
    icon: "ri-scan-2-line",
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
  const [notice, setNotice] = useState("");
  const [profileHref, setProfileHref] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [prefilledUid, setPrefilledUid] = useState("");
  const scanStartedRef = useRef(false);
  const readerRef = useRef<InstanceType<NDEFReaderConstructor> | null>(null);

  const extractPublicIdFromText = useCallback((value: string): string => {
    const trimmed = value.replace(/[\u0000-\u001f]+/g, " ").trim();
    if (!trimmed) return "";

    const directRouteMatch = trimmed.match(/(?:^|[^\w-])(?:claim|scan)\/([a-zA-Z0-9_-]{3,128})(?:[^\w-]|$)/);
    if (directRouteMatch?.[1]) return directRouteMatch[1];

    const embeddedUrl = trimmed.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
    if (embeddedUrl && embeddedUrl !== trimmed) {
      const publicId: string = extractPublicIdFromText(embeddedUrl);
      if (publicId) return publicId;
    }

    try {
      const url = new URL(trimmed, window.location.origin);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "claim" && parts[1]) return parts[1];
      if (parts[0] === "scan" && parts[1]) return parts[1];
      if (parts[0] && !RESERVED_PUBLIC_PATHS.has(parts[0].toLowerCase())) {
        return parts[0];
      }
    } catch {
      const looseCode = trimmed.match(/\b([a-zA-Z0-9][a-zA-Z0-9_-]{2,127})\b/)?.[1] ?? "";
      return looseCode && !RESERVED_PUBLIC_PATHS.has(looseCode.toLowerCase()) ? looseCode : "";
    }

    return "";
  }, []);

  const extractPublicIdFromEvent = useCallback((event: NDEFReadingEventWithSerial) => {
    const records = event.message?.records ?? [];
    for (const record of records) {
      if (!record.data) continue;

      const bytes = new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength);
      const raw = new TextDecoder().decode(bytes);
      const uriPrefix = record.recordType === "url" ? NFC_URI_PREFIXES[bytes[0]] ?? "" : "";
      const uriValue = record.recordType === "url" && uriPrefix ? `${uriPrefix}${new TextDecoder().decode(bytes.slice(1))}` : raw;
      const candidates =
        record.recordType === "url"
          ? [uriValue, raw, raw.replace(/^[\u0000-\u001f]+/, "")]
          : [
              raw,
              new TextDecoder().decode(bytes.slice(1)),
              new TextDecoder().decode(bytes.slice(3)),
            ];

      for (const candidate of candidates) {
        const publicId = extractPublicIdFromText(candidate);
        if (publicId) return publicId;
      }
    }

    return "";
  }, [extractPublicIdFromText]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login?redirect=/connect-nfc");
        return;
      }

      const uidFromRedirect = new URLSearchParams(window.location.search)
        .get("uid")
        ?.trim()
        .toUpperCase()
        .replace(/[^A-Z0-9:_-]/g, "") ?? "";
      setPrefilledUid(uidFromRedirect);
      setToken(data.session.access_token);
      setStatus(uidFromRedirect || (typeof window !== "undefined" && window.NDEFReader) ? "ready" : "unsupported");
    });
  }, [router, supabase]);

  const linkCard = useCallback(async ({ uid, publicId }: { uid?: string; publicId?: string }) => {
    if (!token) return;
    const normalizedUid = uid?.trim();
    const normalizedPublicId = publicId?.trim();
    if (!normalizedUid && !normalizedPublicId) {
      scanStartedRef.current = false;
      setStatus("error");
      setError("The card was detected, but Chrome did not expose a readable UID or LinkUp link. Tap Try Again and hold the card still.");
      return;
    }

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
    const absoluteProfileUrl = `${window.location.origin}${href}`;

    if (readerRef.current?.write) {
      setNotice("Connected. Keep the card still while we save your profile link to it.");
      try {
        await readerRef.current.write({
          records: [{ recordType: "url", data: absoluteProfileUrl }],
        });
        setNotice("Profile link saved to the card.");
      } catch {
        setNotice("Connected. If the card still opens this page, tap Try Again and hold it still until the profile link is saved.");
      }
    }

    setProfileHref(href);
    setStatus(body.data.status === "already-linked" ? "already-linked" : "success");
    window.setTimeout(() => router.push("/dashboard"), 1800);
  }, [router, token]);

  const startScan = useCallback(async () => {
    if (!window.NDEFReader) {
      setStatus("unsupported");
      return;
    }
    if (scanStartedRef.current) return;
    scanStartedRef.current = true;

    try {
      setStatus("waiting");
      setError("");
      setNotice("");
      const controller = new AbortController();
      const reader = new window.NDEFReader();
      readerRef.current = reader;

      reader.addEventListener(
        "reading",
        (event) => {
          setStatus("reading");
          controller.abort();
          const readingEvent = event as NDEFReadingEventWithSerial;
          const uid = readingEvent.serialNumber;
          const publicId = extractPublicIdFromEvent(readingEvent);
          if (!uid && !publicId) {
            scanStartedRef.current = false;
            setStatus("error");
            setError("The card was detected, but Chrome could not read its UID or saved LinkUp URL.");
            return;
          }
          void linkCard({ uid, publicId });
        },
        { once: true },
      );

      reader.addEventListener(
        "readingerror",
        () => {
          scanStartedRef.current = false;
          setStatus("error");
          setError("The card was detected but could not be read. Try holding it still for a moment.");
        },
        { once: true },
      );

      await reader.scan({ signal: controller.signal });
    } catch (scanError) {
      if (scanError instanceof DOMException && scanError.name === "AbortError") return;
      scanStartedRef.current = false;
      setStatus("error");
      setError(scanError instanceof Error ? scanError.message : "Tap Start Scan, allow NFC access, then hold the card still.");
    }
  }, [extractPublicIdFromEvent, linkCard]);

  useEffect(() => {
    if (status === "ready" && token) {
      if (prefilledUid) {
        void linkCard({ uid: prefilledUid });
        return;
      }
      void startScan();
    }
  }, [linkCard, prefilledUid, startScan, status, token]);

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
            : status === "waiting"
              ? "Ready to Scan"
              : isBusy
              ? copy.title
              : "Ready to Scan";
  const statusBody =
    status === "ready" && prefilledUid
      ? "We found the card UID from your first scan. Linking it now."
      : status === "ready"
      ? "Bring your card closer to the back of your phone."
      : status === "unsupported"
        ? "Use Chrome on an Android phone with NFC enabled."
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
              Scan Again
              <span className="block text-[#088cff]">to Link</span>
            </h1>

            <p className="mx-auto mt-3 max-w-[315px] text-[14px] leading-6 text-white/72 sm:mt-6 sm:max-w-[350px] sm:text-[17px] sm:leading-8 lg:mx-0 lg:max-w-[430px] lg:text-[19px]">
              You created your account. Now scan the card once more so we can save the UID to your profile.
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
              onClick={canScan ? startScan : undefined}
              disabled={!canScan}
              className="connect-status grid w-full grid-cols-[58px_1fr_48px] items-center gap-3 rounded-[18px] border border-white/10 bg-[#071725]/86 px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition enabled:hover:border-[#03A9F4]/35 enabled:hover:bg-[#092033] enabled:active:scale-[0.99] disabled:cursor-default sm:gap-4 sm:rounded-[22px] sm:px-5 sm:py-5"
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-[#0a1824] sm:h-[52px] sm:w-[52px]">
                <i className={`${copy.icon} ${status === "connecting" ? "animate-spin" : ""} text-2xl ${isPositive ? "text-green-300" : "text-[#03A9F4]"} sm:text-3xl`} />
              </span>
              <span>
                <span className="block text-[17px] font-extrabold leading-tight text-white sm:text-[20px]">{statusTitle}</span>
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

              {notice && !error && (
                <p className="mt-4 rounded-2xl border border-[#03A9F4]/20 bg-[#03A9F4]/10 px-4 py-3 text-sm leading-6 text-sky-100 lg:mt-0">
                  {notice}
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
