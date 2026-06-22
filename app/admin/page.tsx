"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface AdminStats {
  totalTags: number;
  activeTags: number;
  claimedTags: number;
  suspendedTags: number;
  totalProfiles: number;
  totalUsers: number;
  openTickets: number;
  totalAnalyticsToday: number;
}

const navItems = [
  { href: "/admin", icon: "ri-dashboard-line", label: "Overview" },
  { href: "/admin/tags", icon: "ri-nfc-line", label: "NFC Tags" },
  { href: "#customers", icon: "ri-user-smile-line", label: "Customers" },
  { href: "#products", icon: "ri-shopping-bag-3-line", label: "Products" },
  { href: "#orders", icon: "ri-archive-stack-line", label: "Orders" },
  { href: "#geo", icon: "ri-map-pin-line", label: "Map" },
  { href: "/admin/moderation", icon: "ri-shield-check-line", label: "Moderation" },
];

const demoOrders = [
  { id: "#NF-1048", customer: "Ahmed Fouad", product: "NFC Medal", status: "Paid", total: "EGP 650", date: "Today" },
  { id: "#NF-1047", customer: "Mariam Ali", product: "Business Card", status: "Preparing", total: "EGP 420", date: "Today" },
  { id: "#NF-1046", customer: "Omar Samy", product: "Keychain", status: "Shipping", total: "EGP 350", date: "Yesterday" },
  { id: "#NF-1045", customer: "Nour Adel", product: "NFC Medal", status: "Delivered", total: "EGP 650", date: "Jun 20" },
];

const demoProducts = [
  { name: "NFC Medal", category: "Medals", stock: 128, sold: 42 },
  { name: "Smart Business Card", category: "Cards", stock: 76, sold: 31 },
  { name: "NFC Keychain", category: "Accessories", stock: 94, sold: 18 },
];

const geoRows = [
  { city: "Cairo", value: 46 },
  { city: "Alexandria", value: 24 },
  { city: "Giza", value: 18 },
  { city: "Other", value: 12 },
];

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
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

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`,
        "x-user-id": session.user.id,
      };

      const res = await fetch("/api/v1/admin/tags?state=MANUFACTURED", {
        headers: authHeaders,
      });
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }

      setChecking(false);

      const statsRes = await fetch("/api/v1/admin/stats", { headers: authHeaders });
      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json.data);
      }
    });
  }, [router]);

  const activationRate = useMemo(
    () => pct((stats?.activeTags ?? 0) + (stats?.claimedTags ?? 0), stats?.totalTags ?? 0),
    [stats],
  );

  const healthCards = stats
    ? [
        { label: "Total NFC Tags", value: stats.totalTags, delta: "+ live inventory", icon: "ri-nfc-line", tone: "text-sky-300" },
        { label: "Customers", value: stats.totalUsers, delta: `${stats.totalProfiles} profiles`, icon: "ri-user-3-line", tone: "text-violet-300" },
        { label: "Scans Today", value: stats.totalAnalyticsToday, delta: "public traffic", icon: "ri-pulse-line", tone: "text-emerald-300" },
        { label: "Open Tickets", value: stats.openTickets, delta: "needs review", icon: "ri-alarm-warning-line", tone: "text-amber-300" },
      ]
    : [];

  const activityBars = [24, 38, 31, 56, 44, 68, 61, 78, 71, 92, 84, 100];

  if (checking) {
    return (
      <div className="min-h-screen bg-[#05070f] text-white flex items-center justify-center">
        <span className="text-white/45">Verifying owner access...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070f] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#070b16]/95 px-4 py-6 lg:block">
        <Link href="/" className="flex items-center gap-3 px-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#03A9F4]/15 text-[#03A9F4]">
            <i className="ri-flashlight-line text-xl" />
          </span>
          <span className="font-bold tracking-wide">NFC ID</span>
        </Link>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/55 transition-colors hover:bg-[#111a33] hover:text-white"
            >
              <i className={`${item.icon} text-lg text-[#5f7cff]`} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4 rounded-lg border border-[#23345f] bg-[#0a1021] p-4">
          <p className="text-xs text-white/45">Production link</p>
          <p className="mt-1 truncate font-mono text-xs text-[#03A9F4]">/scan/{"{publicId}"}</p>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#05070f]/90 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#5f7cff]">Owner Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold">Project Control Center</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/admin/tags" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white">
                Generate Tags
              </Link>
              <Link href="/dashboard" className="rounded-lg bg-[#03A9F4] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0288d1]">
                User Dashboard
              </Link>
            </div>
          </div>
        </header>

        <div className="px-5 py-6 md:px-8">
          {stats ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {healthCards.map((card) => (
                <div key={card.label} className="rounded-lg border border-white/10 bg-[#081022] p-5 shadow-[0_0_30px_rgba(27,57,134,0.18)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-white/45">{card.label}</p>
                      <p className="mt-2 text-3xl font-bold">{card.value.toLocaleString()}</p>
                    </div>
                    <i className={`${card.icon} ${card.tone} text-2xl`} />
                  </div>
                  <p className="mt-4 text-xs text-[#6f86ff]">{card.delta}</p>
                </div>
              ))}
            </section>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-lg border border-white/10 bg-white/5" />
              ))}
            </section>
          )}

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-[#081022] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Scan & Claim Activity</h2>
                  <p className="mt-1 text-xs text-white/45">Daily movement across NFC scans, claims, and profiles.</p>
                </div>
                <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/45">This month</span>
              </div>

              <div className="mt-8 flex h-64 items-end gap-3 border-b border-l border-white/10 px-3 pb-3">
                {activityBars.map((height, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#15337f] to-[#4867ff] shadow-[0_0_18px_rgba(72,103,255,0.55)]"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-white/30">{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-lg border border-white/10 bg-[#081022] p-5">
                <h2 className="font-semibold">Activation Funnel</h2>
                <div className="mt-6 flex items-center justify-center">
                  <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-[12px] border-[#18305f]">
                    <div
                      className="absolute inset-[-12px] rounded-full border-[12px] border-[#4867ff]"
                      style={{ clipPath: `inset(${100 - activationRate}% 0 0 0)` }}
                    />
                    <div className="text-center">
                      <p className="text-4xl font-bold">{activationRate}%</p>
                      <p className="text-xs text-white/45">claimed/active</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#081022] p-5">
                <h2 className="font-semibold">Quick Actions</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Link href="/admin/tags" className="rounded-lg bg-white/5 p-3 text-sm hover:bg-white/10">
                    <i className="ri-add-box-line mr-2 text-[#03A9F4]" />
                    Batch Tags
                  </Link>
                  <Link href="/admin/moderation" className="rounded-lg bg-white/5 p-3 text-sm hover:bg-white/10">
                    <i className="ri-shield-line mr-2 text-[#03A9F4]" />
                    Reports
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" id="orders">
            <div className="rounded-lg border border-white/10 bg-[#081022] p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Incoming Orders</h2>
                <button className="rounded-md bg-[#03A9F4] px-3 py-2 text-xs font-semibold text-white">Add Order</button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-xs text-white/40">
                    <tr className="border-b border-white/10">
                      <th className="py-3 font-medium">Order</th>
                      <th className="py-3 font-medium">Customer</th>
                      <th className="py-3 font-medium">Product</th>
                      <th className="py-3 font-medium">Status</th>
                      <th className="py-3 font-medium">Total</th>
                      <th className="py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/5 text-white/70">
                        <td className="py-3 font-mono text-xs text-[#8ea2ff]">{order.id}</td>
                        <td className="py-3">{order.customer}</td>
                        <td className="py-3">{order.product}</td>
                        <td className="py-3">
                          <span className="rounded bg-[#4867ff]/15 px-2 py-1 text-xs text-[#9cafff]">{order.status}</span>
                        </td>
                        <td className="py-3">{order.total}</td>
                        <td className="py-3 text-white/40">{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#081022] p-5" id="products">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Products & Categories</h2>
                <button className="rounded-md border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white">Add Product</button>
              </div>
              <div className="mt-4 space-y-3">
                {demoProducts.map((product) => (
                  <div key={product.name} className="rounded-lg bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-white/40">{product.category}</p>
                      </div>
                      <p className="text-sm text-[#03A9F4]">{product.sold} sold</p>
                    </div>
                    <div className="mt-3 h-2 rounded bg-white/10">
                      <div className="h-2 rounded bg-[#4867ff]" style={{ width: `${Math.min(product.stock, 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-white/35">{product.stock} pieces in stock</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3" id="customers">
            <div className="rounded-lg border border-white/10 bg-[#081022] p-5 xl:col-span-2">
              <h2 className="font-semibold">Customer Analysis</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="text-xs text-white/40">Registered users</p>
                  <p className="mt-2 text-2xl font-bold">{stats?.totalUsers.toLocaleString() ?? "--"}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="text-xs text-white/40">Profiles created</p>
                  <p className="mt-2 text-2xl font-bold">{stats?.totalProfiles.toLocaleString() ?? "--"}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="text-xs text-white/40">Suspended tags</p>
                  <p className="mt-2 text-2xl font-bold">{stats?.suspendedTags.toLocaleString() ?? "--"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#081022] p-5" id="geo">
              <h2 className="font-semibold">Geo Map</h2>
              <div className="mt-5 rounded-lg border border-[#243969] bg-[#07142a] p-4">
                <div className="relative h-32 rounded bg-[radial-gradient(circle_at_30%_35%,rgba(72,103,255,0.55),transparent_18%),radial-gradient(circle_at_65%_55%,rgba(3,169,244,0.5),transparent_16%),linear-gradient(135deg,rgba(15,31,71,0.9),rgba(6,12,28,0.9))]" />
              </div>
              <div className="mt-4 space-y-3">
                {geoRows.map((row) => (
                  <div key={row.city}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-white/55">{row.city}</span>
                      <span className="text-white/35">{row.value}%</span>
                    </div>
                    <div className="h-1.5 rounded bg-white/10">
                      <div className="h-1.5 rounded bg-[#03A9F4]" style={{ width: `${row.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
