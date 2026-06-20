"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic';

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

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }

      const res = await fetch("/api/v1/admin/tags?state=MANUFACTURED", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-user-id": session.user.id,
        },
      });
      if (res.status === 403) { router.push("/dashboard"); return; }

      setAuthToken(session.access_token);
      setUserId(session.user.id);
      setChecking(false);

      // Load stats
      const statsRes = await fetch("/api/v1/admin/stats", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-user-id": session.user.id,
        },
      });
      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json.data);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="bg-[#0b0a0a] min-h-screen text-white flex items-center justify-center">
        <span className="text-white/40">Verifying access…</span>
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Total Tags", value: stats.totalTags, color: "text-white" },
    { label: "Active Tags", value: stats.activeTags, color: "text-green-400" },
    { label: "Claimed Tags", value: stats.claimedTags, color: "text-yellow-400" },
    { label: "Suspended Tags", value: stats.suspendedTags, color: "text-red-400" },
    { label: "Total Profiles", value: stats.totalProfiles, color: "text-blue-400" },
    { label: "Total Users", value: stats.totalUsers, color: "text-purple-400" },
    { label: "Open Tickets", value: stats.openTickets, color: "text-orange-400" },
    { label: "Scans Today", value: stats.totalAnalyticsToday, color: "text-cyan-400" },
  ] : [];

  return (
    <div className="bg-[#0b0a0a] min-h-screen text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <nav className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <span className="font-semibold text-sm">Admin Panel</span>
        <Link href="/dashboard" className="ml-auto text-xs text-white/40 hover:text-white transition-colors">
          ← Back to Dashboard
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Manage tags, lifecycle states, and content moderation.</p>
        </div>

        {/* Live Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-white/40 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {!stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-white/10 rounded mb-2 w-2/3" />
                <div className="h-7 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/tags"
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors group"
          >
            <div className="text-2xl mb-3">🏷️</div>
            <h2 className="font-semibold text-base mb-1">Tag Management</h2>
            <p className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              Search tags, update lifecycle states, batch generate new tags.
            </p>
            {stats && (
              <p className="text-xs text-white/30 mt-2">
                {stats.totalTags} total · {stats.activeTags} active
              </p>
            )}
          </Link>

          <Link
            href="/admin/moderation"
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors group"
          >
            <div className="text-2xl mb-3">🛡️</div>
            <h2 className="font-semibold text-base mb-1">Moderation Queue</h2>
            <p className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              Review reports, suspend profiles, resolve or dismiss tickets.
            </p>
            {stats && stats.openTickets > 0 && (
              <p className="text-xs text-orange-400 mt-2">
                {stats.openTickets} open ticket{stats.openTickets !== 1 ? "s" : ""}
              </p>
            )}
          </Link>
        </div>
      </main>
    </div>
  );
}
