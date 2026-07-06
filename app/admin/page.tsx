"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "./_components/AdminChrome";
import { AdminInlineLoading, AnimatedNumber, MetricCard, Panel } from "./_components/AdminUi";

interface AdminStats {
  totalTags: number;
  activeTags: number;
  claimedTags: number;
  suspendedTags: number;
  totalProfiles: number;
  totalUsers: number;
  openTickets: number;
  totalAnalyticsToday: number;
  manufacturedTags: number;
  soldTags: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  revenueByDay: Array<{ day: string; revenue: number; orders: number }>;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDay(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(value));
}

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        "x-user-id": session.user.id,
      };

      const statsRes = await fetch("/api/v1/admin/stats", { headers });
      if (statsRes.status === 403) {
        router.push("/dashboard");
        return;
      }

      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json.data);
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <AdminChrome title="Owner Dashboard" subtitle="Revenue, customers, NFC usage, and moderation health in one fast view.">
        <AdminInlineLoading />
      </AdminChrome>
    );
  }

  const activation = percent((stats?.activeTags ?? 0) + (stats?.claimedTags ?? 0), stats?.totalTags ?? 0);
  const revenueByDay = stats?.revenueByDay ?? [];
  const maxRevenue = Math.max(1, ...revenueByDay.map((row) => row.revenue));
  const readyTags = (stats?.manufacturedTags ?? 0) + (stats?.soldTags ?? 0);
  const liveTags = (stats?.activeTags ?? 0) + (stats?.claimedTags ?? 0);
  const pausedTags = stats?.suspendedTags ?? 0;

  return (
    <AdminChrome title="Owner Dashboard" subtitle="Revenue, customers, NFC usage, and moderation health in one fast view.">
      <section className="mb-4 overflow-hidden rounded-2xl border border-[#03A9F4]/18 bg-[#071722] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8fdfff]/60">Live owner pulse</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              <AnimatedNumber value={stats?.totalOrders ?? 0} /> orders tracked
            </h2>
            <p className="mt-1 text-sm text-white/48">
              {money(stats?.totalRevenue ?? 0)} revenue with {activation}% NFC activation.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
            {[
              { label: "Ready", value: readyTags },
              { label: "Live", value: liveTags },
              { label: "Scans", value: stats?.totalAnalyticsToday ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
                <p className="text-lg font-bold text-white"><AnimatedNumber value={item.value} /></p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/38">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue" value={stats?.totalRevenue ?? 0} formatter={money} icon="ri-money-dollar-circle-line" hint={`${stats?.totalOrders ?? 0} orders · avg ${money(stats?.averageOrderValue ?? 0)}`} />
        <MetricCard label="NFC" value={stats?.totalTags ?? 0} icon="ri-qr-scan-2-line" hint={`${readyTags.toLocaleString()} ready · ${liveTags.toLocaleString()} in use`} />
        <MetricCard label="Customers" value={stats?.totalUsers ?? 0} icon="ri-user-3-line" hint={`${stats?.totalProfiles ?? 0} public profiles created`} />
        <MetricCard label="Scans Today" value={stats?.totalAnalyticsToday ?? 0} icon="ri-pulse-line" hint={`${stats?.openTickets ?? 0} open moderation reports`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Order Money">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="rounded-xl border border-[#03A9F4]/20 bg-[#03A9F4]/10 p-4">
              <p className="text-xs uppercase tracking-widest text-[#8ddfff]">Total sales</p>
              <p className="mt-3 text-3xl font-bold text-white">
                <AnimatedNumber value={stats?.totalRevenue ?? 0} formatter={money} />
              </p>
              <p className="mt-2 text-sm text-white/55">
                <AnimatedNumber value={stats?.totalOrders ?? 0} /> orders with an average value of {money(stats?.averageOrderValue ?? 0)}.
              </p>
            </div>

            <div className="flex min-h-[190px] items-end gap-2 rounded-xl border border-white/10 bg-black/20 px-3 pb-3 pt-6">
              {revenueByDay.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/40">No order revenue yet</div>
              ) : (
                revenueByDay.map((row) => (
                  <div key={row.day} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="flex flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg bg-[#03A9F4] shadow-[0_0_18px_rgba(3,169,244,0.28)] transition-[height] duration-300"
                        style={{ height: `${Math.max(8, Math.round((row.revenue / maxRevenue) * 100))}%` }}
                        title={`${money(row.revenue)} · ${row.orders} orders`}
                      />
                    </div>
                    <div className="text-center text-[10px] font-medium text-white/45">{shortDay(row.day)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>

        <Panel title="NFC Usage">
          <div className="space-y-5">
            <div className="flex items-center gap-5">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-[#03A9F4]/25 bg-[#03A9F4]/5">
                <span className="text-2xl font-bold">
                  <AnimatedNumber value={activation} formatter={(value) => `${value}%`} />
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Activation rate</p>
                <p className="mt-1 text-sm leading-relaxed text-white/50">
                  Live and claimed NFC medals compared with all generated records.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Ready", value: readyTags, color: "bg-white/55", hint: "manufactured or sold" },
                { label: "In use", value: liveTags, color: "bg-[#03A9F4]", hint: "claimed or active" },
                { label: "Paused", value: pausedTags, color: "bg-red-400", hint: "suspended" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-white/70">{row.label} <span className="text-white/35">· {row.hint}</span></span>
                    <AnimatedNumber value={row.value} className="font-mono text-white/55" />
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${percent(row.value, stats?.totalTags ?? 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/admin/customers", icon: "ri-user-smile-line", label: "Customers", body: "Customer list and profile ownership." },
          { href: "/admin/products", icon: "ri-shopping-bag-3-line", label: "Products", body: "Product catalog and sections." },
          { href: "/admin/orders", icon: "ri-archive-stack-line", label: "Orders", body: "Incoming customer orders." },
          { href: "/admin/tags", icon: "ri-qr-scan-2-line", label: "NFC", body: "Generate NFC codes and manage medal states.", image: "/img/logo.png" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="group overflow-hidden rounded-xl border border-[#2c2c2c] bg-white/[0.03] transition-all hover:border-[#03A9F4]/50 hover:bg-[#03A9F4]/5">
            {"image" in item ? (
              <div className="flex h-28 items-center justify-center border-b border-white/10 bg-[#03A9F4]/10">
                <Image src={item.image!} alt="" width={104} height={104} className="h-24 w-24 object-contain transition-transform duration-300 group-hover:scale-105" />
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center border-b border-white/10 bg-black/20">
                <i className={`${item.icon} text-4xl text-[#03A9F4]`} />
              </div>
            )}
            <div className="p-5">
              <h2 className="font-bold uppercase">{item.label}</h2>
              <p className="mt-2 text-sm text-white/45">{item.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </AdminChrome>
  );
}
