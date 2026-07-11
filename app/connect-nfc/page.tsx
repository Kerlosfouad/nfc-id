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
  | "connecting"
  | "writing"
  | "success"
  | "already-linked"
  | "error";

type NDEFReaderConstructor = new () => {
  write: (message: string | { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
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
    title: "Link your NFC card",
    body: "Hold the card near your phone. We will write your profile link automatically.",
    icon: "ri-nfc-line",
  },
  unsupported: {
    title: "Ready to link",
    body: "This step needs NFC writing support on Android Chrome.",
    icon: "ri-error-warning-line",
  },
  connecting: {
    title: "Linking card",
    body: "We are securely saving this NFC card to your account.",
    icon: "ri-loader-4-line",
  },
  writing: {
    title: "Writing profile link",
    body: "Keep the card near your phone while we write the new profile link to it.",
    icon: "ri-rfid-line",
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
  const [token, setToken] = useState<string | null>(null);
  const [prefilledUid, setPrefilledUid] = useState("");
  const [prefilledPublicId, setPrefilledPublicId] = useState("");
  const [nfcSession, setNfcSession] = useState("");
  const writeStartedRef = useRef(false);
  const writeActiveRef = useRef(true);

  useEffect(() => {
    writeActiveRef.current = true;
    return () => {
      writeActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function prepareNfcFlow() {
      // 1. Read URL params FIRST before any async call
      const searchParams = new URLSearchParams(window.location.search);
      const uidFromRedirect = searchParams
        .get("uid")
        ?.trim()
        .toUpperCase()
        .replace(/[^A-Z0-9:_-]/g, "") ?? "";
      const publicIdFromRedirect = searchParams
        .get("publicId")
        ?.trim()
        .replace(/[^a-zA-Z0-9_-]/g, "") ?? "";
      const sessionFromRedirect = searchParams
        .get("nfcSession")
        ?.trim()
        .replace(/[^a-zA-Z0-9_-]/g, "") ?? "";

      // 2. If no params in URL, check localStorage BEFORE getSession()
      //    (important: on mobile, OAuth can lose context so we restore via localStorage)
      if (!uidFromRedirect && !publicIdFromRedirect && !sessionFromRedirect) {
        const savedRedirect = window.localStorage.getItem("linkup_auth_redirect");
        if (savedRedirect?.startsWith("/connect-nfc?")) {
          window.localStorage.removeItem("linkup_auth_redirect");
          // Full reload so the new URL params are read correctly on next mount
          window.location.replace(savedRedirect);
          return;
        }
      }

      // 3. Now get session (async)
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      setPrefilledUid(uidFromRedirect);
      setPrefilledPublicId(publicIdFromRedirect);
      setNfcSession(sessionFromRedirect);

      if (!data.session) {
        const redirect = `/connect-nfc${window.location.search || ""}`;
        router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      setToken(data.session.access_token);
      setStatus(typeof window !== "undefined" && window.NDEFReader ? "ready" : "unsupported");
    }

    void prepareNfcFlow();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const isTransientWriteError = useCallback((error: unknown) => {
    if (!(error instanceof DOMException)) return true;
    return !["NotAllowedError", "SecurityError", "NotSupportedError"].includes(error.name);
  }, []);

  const writeProfileLink = useCallback(async (href: string) => {
    if (!window.NDEFReader) {
      throw new Error("NFC writing is not available here. Use Chrome on an Android phone with NFC enabled.");
    }

    setStatus("writing");
    const writer = new window.NDEFReader();
    const message = {
      records: [{ recordType: "url", data: `${window.location.origin}${href}` }],
    };

    while (writeActiveRef.current) {
      try {
        await writer.write(message);
        return;
      } catch (writeError) {
        if (!writeActiveRef.current) return;
        if (!isTransientWriteError(writeError)) throw writeError;
        await new Promise((resolve) => window.setTimeout(resolve, 900));
      }
    }
  }, [isTransientWriteError]);

  const linkCard = useCallback(async ({ uid, publicId, session }: { uid?: string; publicId?: string; session?: string }) => {
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
        ...(session ? { nfcSession: session } : {}),
      }),
    });
    const body = await response.json();

    if (!response.ok) {
      setStatus("error");
      setError(body?.error?.message ?? "This NFC card could not be linked.");
      return;
    }

    const href = `/profile/${body.data.profile.publicId}`;

    try {
      await writeProfileLink(href);
    } catch (writeError) {
      setStatus("error");
      setError(writeError instanceof Error ? writeError.message : "The card was linked, but the profile link could not be written to it.");
      return;
    }

    setStatus(body.data.status === "already-linked" ? "already-linked" : "success");
    window.setTimeout(() => router.push("/dashboard"), 1800);
  }, [router, token, writeProfileLink]);

  const startWriting = useCallback(async () => {
    if (!token) return;
    setError("");

    if (prefilledPublicId) {
      await linkCard({ publicId: prefilledPublicId, ...(prefilledUid ? { uid: prefilledUid } : {}) });
      return;
    }

    if (prefilledUid) {
      await linkCard({ uid: prefilledUid });
      return;
    }

    if (nfcSession) {
      await linkCard({ session: nfcSession });
      return;
    }

    setStatus("error");
    setError("Open this page from an unlinked LinkUp medal scan link. This protects already-linked medals from being overwritten.");
  }, [linkCard, nfcSession, prefilledPublicId, prefilledUid, token]);

  useEffect(() => {
    if (!token || status !== "ready" || writeStartedRef.current) return;
    writeStartedRef.current = true;
    void startWriting();
  }, [startWriting, status, token]);

  const copy = statusCopy[status];
  const isBusy = ["checking-auth", "connecting", "writing"].includes(status);
  const isPositive = status === "success" || status === "already-linked";
  const canRetry = status === "error";
  const handlePrimaryAction = canRetry
    ? () => {
        writeStartedRef.current = false;
        void startWriting();
      }
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
    status === "ready" && prefilledPublicId
        ? "We found the card link from your first scan. Hold the card near your phone."
      : status === "ready" && prefilledUid
        ? "We found the card from your first scan. Hold the card near your phone."
      : status === "ready" && nfcSession
        ? "We found the medal session from your first scan. Hold the card near your phone."
      : status === "ready"
      ? "Open this page from an unlinked LinkUp medal scan link before writing."
      : status === "writing"
        ? "Waiting for the card. Keep this page open and hold the card near your phone."
      : status === "unsupported"
        ? "This step needs NFC writing. Use Chrome on an Android phone with NFC enabled."
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
            radial-gradient(circle, #07090c 0 54%, transparent 56%),
            conic-gradient(from 10deg, #03A9F4 0 82deg, rgba(3,169,244,0.16) 84deg 360deg);
          box-shadow: 0 0 20px rgba(3,169,244,0.35);
          animation: connectProgressSpin 1.8s linear infinite;
        }

        .connect-progress-done {
          background:
            radial-gradient(circle, #07090c 0 54%, transparent 56%),
            conic-gradient(#4ade80 0 360deg);
        }

        @media (max-width: 767px) {
          .connect-shell {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding-top: max(14px, env(safe-area-inset-top));
            padding-bottom: max(12px, env(safe-area-inset-bottom));
          }

          .connect-reference-artwork {
            inset: -8% -10% -5%;
          }

          .connect-artwork::after {
            content: none;
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
        <header className="mb-3 flex items-center justify-center sm:mb-5 lg:mb-14">
          <Link href="/" className="flex w-fit items-center justify-center">
            <Image src="/assets/linkup/linkup-logo-compact.png" alt="LinkUp" width={260} height={304} className="h-auto w-[94px] sm:w-[126px] lg:w-[148px]" priority />
          </Link>
        </header>

        <div className="connect-layout mx-auto grid w-full max-w-[430px] flex-1 items-center gap-3 sm:gap-7 lg:max-w-none lg:grid-cols-[0.9fr_1.1fr] lg:gap-x-12 lg:gap-y-8">
          <section className="text-center lg:text-left">
            <div className="inline-flex max-w-full rounded-[13px] border border-[#03A9F4]/35 bg-[#03A9F4]/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#03A9F4] sm:px-6 sm:py-2 sm:text-[13px]">
              Link your NFC card
            </div>

            <h1 className="mx-auto mt-4 flex max-w-full flex-row flex-nowrap items-baseline justify-center gap-2 text-[clamp(28px,7.2vw,42px)] font-black leading-[1.08] tracking-[0] text-white sm:mt-8 sm:block sm:text-[clamp(42px,5.8vw,64px)] sm:leading-[1.05] lg:mx-0 lg:text-left">
              <span className="block whitespace-nowrap sm:inline">Link Your</span>
              <span className="block whitespace-nowrap text-[#088cff] sm:inline sm:pl-3">Card</span>
            </h1>

            <p className="mx-auto mt-4 flex max-w-full flex-col items-center gap-1.5 text-[clamp(13px,3.65vw,15px)] leading-[1.45] text-white/76 sm:mt-6 sm:block sm:max-w-[38rem] sm:text-[clamp(17px,1.65vw,19px)] sm:leading-8 lg:mx-0 lg:text-left">
              <span className="block sm:inline">Hold the card near your phone.</span>
              <span className="block sm:inline sm:pl-1">Your profile link will be written automatically.</span>
            </p>
          </section>

          <section className="connect-visual relative mt-8 h-[245px] overflow-visible sm:mt-10 sm:h-[330px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-[500px]" aria-label="LinkUp card approaching the back of a phone">
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
            <div
              role={handlePrimaryAction ? "button" : "status"}
              tabIndex={handlePrimaryAction ? 0 : -1}
              onClick={handlePrimaryAction}
              onKeyDown={(event) => {
                if (handlePrimaryAction && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  handlePrimaryAction();
                }
              }}
              className={`connect-status grid w-full grid-cols-[58px_1fr_48px] items-center gap-3 rounded-[18px] border border-white/10 bg-[#071725]/86 px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition sm:gap-4 sm:rounded-[22px] sm:px-5 sm:py-5 ${handlePrimaryAction ? "cursor-pointer hover:border-[#03A9F4]/35 hover:bg-[#092033] active:scale-[0.99]" : "cursor-default"}`}
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-[#0b0d10] sm:h-[52px] sm:w-[52px]">
                <i className={`${copy.icon} ${status === "connecting" ? "animate-spin" : ""} text-2xl ${isPositive ? "text-green-300" : "text-[#03A9F4]"} sm:text-3xl`} />
              </span>
              <span>
                <span className="block text-[17px] font-extrabold leading-tight text-white sm:text-[20px]">{canRetry ? "Try Again" : statusTitle}</span>
                <span className="mt-1.5 block text-[13px] leading-5 text-white/65 sm:mt-2 sm:text-[15px] sm:leading-6">{statusBody}</span>
              </span>
              <span className={`connect-progress ${isPositive ? "connect-progress-done" : ""}`} aria-hidden="true" />
            </div>

            <div className="lg:mt-7">
              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100 lg:mt-0">
                  {error}
                </p>
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

        <footer className="mx-auto mt-5 w-full max-w-4xl border-t border-white/15 px-5 pb-2 pt-4 sm:mt-8 sm:pb-8 sm:pt-7">
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
