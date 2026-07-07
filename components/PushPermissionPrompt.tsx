"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("linkup:push-prompt-dismissed") === "1") return;
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem("linkup:push-prompt-dismissed", "1");
    setVisible(false);
  }

  async function enableNotifications() {
    if (busy) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setMessage("Notifications are not configured yet.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      if (Notification.permission === "denied") {
        setMessage("Notifications are blocked. Open browser site settings and allow notifications for LinkUp.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notifications were not allowed. Tap Allow in the browser permission message.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { data: { session } } = await createClient().auth.getSession();
      if (session) {
        await fetch("/api/v1/admin/push-subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            "x-user-id": session.user.id,
          },
          body: JSON.stringify(subscription.toJSON()),
        });
      }

      localStorage.setItem("linkup:push-prompt-dismissed", "1");
      setVisible(false);
    } catch {
      setMessage("Could not enable notifications on this browser.");
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
