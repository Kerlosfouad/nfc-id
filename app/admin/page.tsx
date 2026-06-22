"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "./_components/AdminChrome";
import { MetricCard, Panel } from "./_components/AdminUi";

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

function percent(value: number, total: number) {
  if (!total) return 0;
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
      <div className="min-h-screen bg-[#0b0a0a] text-white flex items-center justify-center">
        <span className="text-white/40">Verifying owner access...</span>
      </div>
    );
  }

  const activation = percent((stats?.activeTags ?? 0) + (stats?.claimedTags ?? 0), stats?.totalTags ?? 0);

  return (
    <AdminChrome title="Overview" subtitle="Live project health, customers, scans, and moderation status.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="NFC Medals" value={stats?.totalTags ?? 0} icon="ri-nfc-line" hint="All medals registered in the system" />
        <MetricCard label="Customers" value={stats?.totalUsers ?? 0} icon="ri-user-3-line" hint={`${stats?.totalProfiles ?? 0} public profiles created`} />
        <MetricCard label="Scans Today" value={stats?.totalAnalyticsToday ?? 0} icon="ri-pulse-line" hint="Analytics events since midnight" />
        <MetricCard label="Open Reports" value={stats?.openTickets ?? 0} icon="ri-alarm-warning-line" hint="Moderation tickets waiting for review" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Medal Lifecycle">
          <div className="space-y-4">
            {[
              { label: "Active", value: stats?.activeTags ?? 0, color: "bg-[#03A9F4]" },
              { label: "Claimed", value: stats?.claimedTags ?? 0, color: "bg-yellow-400" },
              { label: "Suspended", value: stats?.suspendedTags ?? 0, color: "bg-red-400" },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-white/60">{row.label}</span>
                  <span className="font-mono text-white/45">{row.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${percent(row.value, stats?.totalTags ?? 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Activation Rate">
          <div className="flex items-center gap-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-[#03A9F4]/25 bg-[#03A9F4]/5">
              <span className="text-3xl font-bold">{activation}%</span>
            </div>
            <div className="text-sm leading-relaxed text-white/45">
              Active and claimed medals compared with all generated records in the database.
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/admin/customers", icon: "ri-user-smile-line", label: "Customers", body: "Customer list and profile ownership." },
          { href: "/admin/products", icon: "ri-shopping-bag-3-line", label: "Products", body: "Product catalog and sections." },
          { href: "/admin/orders", icon: "ri-archive-stack-line", label: "Orders", body: "Incoming customer orders." },
          { href: "/admin/geo", icon: "ri-map-pin-line", label: "Geo Map", body: "Scan distribution by country." },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-xl border border-[#2c2c2c] bg-white/[0.03] p-5 transition-all hover:border-[#03A9F4]/50 hover:bg-[#03A9F4]/5">
            <i className={`${item.icon} text-2xl text-[#03A9F4]`} />
            <h2 className="mt-4 font-bold uppercase">{item.label}</h2>
            <p className="mt-2 text-sm text-white/40">{item.body}</p>
          </Link>
        ))}
      </div>
    </AdminChrome>
  );
}

