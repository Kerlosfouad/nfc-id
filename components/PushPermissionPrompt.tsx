"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPushSupportError, subscribeDeviceToPush } from "@/lib/pushClient";

export function PushPermissionPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (getPushSupportError()) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("linkup:push-prompt-dismissed") === "1") return;
    let alive = true;
    let timer: number | undefined;
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!alive || !session) return;
      timer = window.setTimeout(() => setVisible(true), 900);
    });
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname]);

  function dismiss() {
    localStorage.setItem("linkup:push-prompt-dismissed", "1");
    setVisible(false);
  }

  async function enableNotifications() {
    if (busy) return;
    const supportError = getPushSupportError();
    if (supportError) {
      setMessage(supportError);
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      await subscribeDeviceToPush({ session, endpoint: "/api/v1/push-subscriptions" });

      localStorage.setItem("linkup:push-prompt-dismissed", "1");
      setVisible(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable notifications on this browser.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 top-4 z-[120] mx-auto max-w-md rounded-2xl border border-[#03A9F4]/30 bg-[#071722]/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:top-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
          <img src="/img/linkup-nav-mark.png" alt="" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-wide">Allow LinkUp Notifications?</p>
          <p className="mt-1 text-xs leading-5 text-white/58">Get order alerts on this device, even when the site is closed if your browser supports it.</p>
          {message && <p className="mt-2 text-xs text-red-200">{message}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={enableNotifications}
              disabled={busy}
              className="h-10 flex-1 rounded-xl bg-[#03A9F4] px-4 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
            >
              {busy ? "Enabling..." : "Allow"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="h-10 rounded-xl border border-white/10 px-4 text-xs font-bold uppercase tracking-wide text-white/60"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
