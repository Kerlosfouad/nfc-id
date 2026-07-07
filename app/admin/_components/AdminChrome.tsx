"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppNotificationToast, type AppNotification } from "@/components/AppNotificationToast";

const navItems = [
  { href: "/admin", icon: "ri-dashboard-line", label: "Overview" },
  { href: "/admin/customers", icon: "ri-user-smile-line", label: "Customers" },
  { href: "/admin/products", icon: "ri-shopping-bag-3-line", label: "Products" },
  { href: "/admin/orders", icon: "ri-archive-stack-line", label: "Orders" },
  { href: "/admin/tags", icon: "ri-qr-scan-2-line", label: "NFC" },
  { href: "/admin/moderation", icon: "ri-shield-check-line", label: "Moderation" },
];

type PushStatus = "idle" | "enabled" | "blocked";

export function AdminChrome({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [orderCount, setOrderCount] = useState(0);
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushBusy, setPushBusy] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationIdRef = useRef(0);
  const notificationTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>[]>>({});

  async function signOutAdmin() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  function showAppNotification(title: string, body: string, time = "now") {
    const id = ++notificationIdRef.current;
    const exitDelay = 420;

    function clearNotificationTimers(notificationId: number) {
      notificationTimersRef.current[notificationId]?.forEach(clearTimeout);
      delete notificationTimersRef.current[notificationId];
    }

    setNotifications(current => {
      const next: AppNotification = { id, title, body, time, visible: false };
      const kept = current.slice(0, 1);
      const fading = current.slice(1).map(item => ({ ...item, visible: false }));
      fading.forEach(item => {
        clearNotificationTimers(item.id);
        const removeTimer = setTimeout(() => {
          setNotifications(list => list.filter(notification => notification.id !== item.id));
          clearNotificationTimers(item.id);
        }, exitDelay);
        notificationTimersRef.current[item.id] = [removeTimer];
      });
      return [next, ...kept, ...fading].slice(0, 3);
    });

    const enterTimer = setTimeout(() => {
      setNotifications(current => current.map(item => item.id === id ? { ...item, visible: true } : item));
    }, 40);
    const dismissTimer = setTimeout(() => {
      setNotifications(current => current.map(item => item.id === id ? { ...item, visible: false } : item));
      const removeTimer = setTimeout(() => {
        setNotifications(current => current.filter(item => item.id !== id));
        clearNotificationTimers(id);
      }, exitDelay);
      notificationTimersRef.current[id] = [...(notificationTimersRef.current[id] ?? []), removeTimer];
    }, 5200);

    notificationTimersRef.current[id] = [enterTimer, dismissTimer];
  }

  function urlBase64ToUint8Array(value: string) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
  }

  async function enablePushNotifications() {
    if (pushBusy) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      showAppNotification("Push not supported", "This browser does not support lock-screen web notifications.");
      return;
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      showAppNotification("Push setup missing", "Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to Vercel.");
      return;
    }

    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "blocked" : "idle");
        showAppNotification("Notifications blocked", "Allow notifications from the browser settings to receive order alerts.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { data: { session } } = await createClient().auth.getSession();
      if (!session) return;
      const res = await fetch("/api/v1/admin/push-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-user-id": session.user.id,
        },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Push subscription failed");
      setPushStatus("enabled");
      showAppNotification("Order alerts enabled", "New orders can now appear on this phone lock screen.");
    } catch (error) {
      showAppNotification("Push setup failed", error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setPushBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    async function checkOrders(initial = false) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/v1/admin/stats", {
        headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
      });
      if (!res.ok) return;
      const json = await res.json();
      const nextCount = Number(json.data?.totalOrders ?? 0);
      if (!alive) return;
      const previous = Number(localStorage.getItem("linkup:admin-orders") ?? nextCount);
      const hasBaseline = localStorage.getItem("linkup:admin-orders") !== null;
      localStorage.setItem("linkup:admin-orders", String(nextCount));
      setOrderCount(nextCount);
      if (!initial && hasBaseline && nextCount > previous) return;
    }

    void checkOrders(true);
    const timer = setInterval(() => void checkOrders(false), 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if ("Notification" in window && Notification.permission === "denied") {
      setPushStatus("blocked");
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setPushStatus(Notification.permission === "granted" && !!subscription ? "enabled" : "idle"))
      .catch(() => undefined);
  }, []);

  const pushButtonState = pushStatus === "enabled"
    ? {
        label: "Order notifications enabled",
        icon: "ri-notification-3-fill",
        className: "border-[#03A9F4]/45 bg-[#03A9F4]/15 text-[#03A9F4]",
      }
    : pushStatus === "blocked"
      ? {
          label: "Notifications blocked",
          icon: "ri-notification-off-line",
          className: "border-white/10 bg-white/[0.03] text-white/35",
        }
      : {
          label: "Enable lock-screen order notifications",
          icon: "ri-notification-3-line",
          className: "border-white/10 bg-white/[0.03] text-white/70 hover:border-[#03A9F4]/40 hover:text-[#03A9F4]",
        };

  return (
    <div className="min-h-screen bg-[#0b0a0a] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <AppNotificationToast items={notifications} />
      <div className="fixed inset-0 pointer-events-none hero-grid opacity-50" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] border-r border-white/5 bg-[#0f0f0f] lg:flex lg:flex-col">
        <div className="px-4 py-5">
          <Link href="/" className="inline-flex items-end gap-2 group" aria-label="LinkUp home">
            <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={32} height={32} className="h-8 w-8 object-contain transition-all group-hover:drop-shadow-[0_0_12px_rgba(3,169,244,0.7)]" />
            <span className="pb-0.5 text-lg font-black uppercase leading-none tracking-wide text-white">LINK <span className="text-[#03A9F4]">UP</span></span>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const showOrderBadge = item.href === "/admin/orders" && orderCount > 0 && pathname !== "/admin/orders";
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onMouseEnter={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                <i className={`${item.icon} text-lg`} />
                {item.label}
                {showOrderBadge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#03A9F4] px-1.5 text-[10px] font-bold text-white">
                    {orderCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-[#03A9F4]/20 bg-[#03A9F4]/5 p-3">
          <p className="text-xs uppercase tracking-widest text-white/35">Medal scan link</p>
          <p className="mt-2 truncate font-mono text-xs text-[#03A9F4]">/{"{code}"}</p>
        </div>
      </aside>

      <main className="relative z-10 flex min-h-screen flex-col lg:pl-[220px]">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b0a0a]/90 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" className="inline-flex shrink-0 items-end gap-2 group" aria-label="Back to website">
                <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={28} height={28} className="h-7 w-7 object-contain transition-all group-hover:drop-shadow-[0_0_12px_rgba(3,169,244,0.7)]" />
                <span className="pb-0.5 text-lg font-black uppercase leading-none tracking-wide text-white">LINK <span className="text-[#03A9F4]">UP</span></span>
              </Link>
              <span className="sr-only">{title}: {subtitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={enablePushNotifications}
                aria-label={pushButtonState.label}
                title={pushButtonState.label}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${pushButtonState.className}`}
              >
                <i className={`${pushBusy ? "ri-loader-4-line animate-spin" : pushButtonState.icon} text-lg`} />
              </button>
              <button
                type="button"
                onClick={signOutAdmin}
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition-all hover:border-[#03A9F4]/40 hover:text-[#03A9F4]"
              >
                <i className="ri-logout-box-r-line text-lg" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:pb-6">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/5 bg-[#0f0f0f] lg:hidden">
        {navItems.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          const showOrderBadge = item.href === "/admin/orders" && orderCount > 0 && pathname !== "/admin/orders";
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all ${
                active ? "text-[#03A9F4]" : "text-white/30"
              }`}
            >
              <span className="relative flex h-5 items-center justify-center">
                <i className={`${item.icon} text-lg`} />
                {showOrderBadge && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#03A9F4] px-1 text-[9px] font-bold text-white">
                    {orderCount}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
