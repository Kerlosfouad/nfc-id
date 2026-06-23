"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", icon: "ri-dashboard-line", label: "Overview" },
  { href: "/admin/customers", icon: "ri-user-smile-line", label: "Customers" },
  { href: "/admin/products", icon: "ri-shopping-bag-3-line", label: "Products" },
  { href: "/admin/orders", icon: "ri-archive-stack-line", label: "Orders" },
  { href: "/admin/geo", icon: "ri-map-pin-line", label: "Geo Map" },
  { href: "/admin/tags", icon: "ri-nfc-line", label: "NFC Tags" },
  { href: "/admin/moderation", icon: "ri-shield-check-line", label: "Moderation" },
];

export function AdminChrome({ children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const res = await fetch("/api/v1/admin/orders", {
        headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (alive) setOrderCount(Array.isArray(json.data) ? json.data.length : 0);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0a0a] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none hero-grid opacity-50" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] border-r border-white/5 bg-[#0f0f0f] lg:flex lg:flex-col">
        <div className="px-4 py-5">
          <Link href="/" className="inline-flex group" aria-label="NFC ID home">
            <Image src="/img/logo.png" alt="NFC ID" width={36} height={36} className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all" />
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
          <p className="mt-2 truncate font-mono text-xs text-[#03A9F4]">/scan/{"{medalId}"}</p>
        </div>
      </aside>

      <main className="relative z-10 flex min-h-screen flex-col lg:pl-[220px]">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b0a0a]/90 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="inline-flex group" aria-label="NFC ID admin">
              <Image src="/img/logo.png" alt="NFC ID" width={38} height={38} className="transition-all group-hover:drop-shadow-[0_0_10px_#03A9F4]" />
            </Link>
            <Link
              href="/"
              aria-label="Back to website"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition-all hover:border-[#03A9F4]/40 hover:text-[#03A9F4]"
            >
              <i className="ri-home-5-line text-lg" />
            </Link>
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
