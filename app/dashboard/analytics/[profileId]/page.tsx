"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface LinkClick { linkId: string; clicks: number; }
interface LinkCtr   { linkId: string; ctr: number; }
interface ScanEvent { scannedAt: string; country?: string; os?: string; browser?: string; }

interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  totalLinkClicks: number;
  linkClickRate: number;
  contactSaves: number;
  activityTimeline: { date: string; views: number; clicks: number }[];
  linkClickDistribution: { title: string; clicks: number; fill: string }[];
  recentScans: { date: string; country: string; os: string; browser: string }[];
  linkClickDetails: { title: string; clicks: number }[];
}

const COLORS = ["#4ade80","#60a5fa","#f59e0b","#a78bfa","#f87171","#34d399"];

// ── tiny SVG pie chart ──────────────────────────────────────────────────────
function PieChart({ slices }: { slices: { value: number; color: string; label: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-white/30 text-sm">No data</p>
    </div>
  );
  let cumAngle = -Math.PI / 2;
  const cx = 80, cy = 80, r = 70;
  const paths: { d: string; color: string; label: string; pct: number }[] = [];
  slices.forEach((s) => {
    const angle = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle);
    const y2 = cy + r * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const midA = cumAngle + angle / 2;
    const lx = cx + (r + 18) * Math.cos(midA);
    const ly = cy + (r + 18) * Math.sin(midA);
    paths.push({ d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: s.color, label: s.label, pct: Math.round((s.value / total) * 100) });
    cumAngle += angle;
  });
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} stroke="#111" strokeWidth="1.5" />
      ))}
      {paths.map((p, i) => {
        const angle = -Math.PI / 2 + slices.slice(0, i).reduce((s, x) => s + (x.value / total) * 2 * Math.PI, 0) + (slices[i].value / total) * Math.PI;
        const lx = cx + (r + 18) * Math.cos(angle);
        const ly = cy + (r + 18) * Math.sin(angle);
        return p.pct > 5 ? (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontWeight="bold">{p.pct}%</text>
        ) : null;
      })}
    </svg>
  );
}

// ── tiny SVG line/area chart ────────────────────────────────────────────────
function ActivityChart({ points }: { points: number[] }) {
  if (points.length < 2) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-white/30 text-sm">No data available</p>
    </div>
  );
  const max = Math.max(...points, 1);
  const W = 500, H = 120, pad = 10;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
  const ys = points.map((v) => H - pad - ((v / max) * (H - pad * 2)));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = line + ` L${xs[xs.length - 1]},${H - pad} L${xs[0]},${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#03A9F4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#03A9F4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ag)" />
      <path d={line} fill="none" stroke="#03A9F4" strokeWidth="2" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3" fill="#03A9F4" />
      ))}
    </svg>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("Last 7 days");
  const [profileName, setProfileName] = useState("Profile");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      try {
        const [analyticsRes, profilesRes] = await Promise.all([
          fetch(`/api/v1/analytics/${profileId}`, {
            headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
          }),
          fetch("/api/v1/profiles", {
            headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
          }),
        ]);
        if (!analyticsRes.ok) throw new Error("Failed to load analytics");
        const json = await analyticsRes.json();
        setSummary(json.data);
        if (profilesRes.ok) {
          const pj = await profilesRes.json();
          const found = (pj.data ?? []).find((p: { id: string; displayName: string }) => p.id === profileId);
          if (found) setProfileName(found.displayName);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    });
  }, [router, profileId]);

  const totalClicks = summary?.totalLinkClicks ?? 0;
  const contactSaves = summary?.contactSaves ?? 0;
  const clickRate = summary ? summary.linkClickRate + "%" : "0%";

  const activityPoints = summary?.activityTimeline
    ? summary.activityTimeline.map((t) => t.views)
    : [];

  const pieSlices = summary?.linkClickDistribution
    ? summary.linkClickDistribution.map((d) => ({
        value: d.clicks,
        color: d.fill,
        label: d.title,
      }))
    : [];

  const scans = summary?.recentScans ?? [];
  const linkClickDetails = summary?.linkClickDetails ?? [];

  return (
    <div className="flex h-screen bg-[#111] text-white overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Sidebar */}
      <aside className="hidden md:flex w-[200px] flex-shrink-0 bg-[#0f0f0f] border-r border-white/5 flex-col">
        <div className="px-4 py-4 border-b border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center">
            <i className="ri-nfc-line text-sm text-white/60" />
          </div>
          <span className="font-bold text-sm">Link<span className="text-[#03A9F4]">Up</span></span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {[
            { id: "home",      icon: "ri-home-5-line",      label: "Home" },
            { id: "analytics", icon: "ri-bar-chart-2-line", label: "Analytics" },
            { id: "share",     icon: "ri-share-line",       label: "Share" },
            { id: "design",    icon: "ri-palette-line",     label: "Design" },
            { id: "settings",  icon: "ri-settings-3-line",  label: "Settings" },
          ].map((n) => (
            <Link
              key={n.id}
              href={n.id === "analytics" ? "#" : `/dashboard`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                n.id === "analytics"
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <i className={`${n.icon} text-base`} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="px-2 pb-2 border-t border-white/5 pt-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider px-3 mb-1.5">Your Profiles</p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-xs text-white">
            <div className="w-5 h-5 rounded-full bg-[#03A9F4]/20 flex items-center justify-center text-[10px] font-bold text-[#03A9F4] flex-shrink-0">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{profileName}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-[#111]">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#111]/90 backdrop-blur border-b border-white/5 px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              <i className="ri-arrow-left-line md:hidden mr-1"></i>
              <span className="hidden md:inline">← Dashboard</span>
            </Link>
            <span className="hidden md:inline text-white/20">/</span>
            <span className="text-white font-medium md:font-normal">Analytics Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 text-xs text-white/50 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors">
              <i className="ri-calendar-line" />
              {range}
              <i className="ri-arrow-down-s-line" />
            </button>
            <Link
              href={`/api/v1/profiles/${profileId}/leads/export`}
              target="_blank"
              className="flex items-center gap-2 text-xs text-white/50 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <i className="ri-download-line" />
              Download CSV
            </Link>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5 max-w-6xl mx-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Views",           value: loading ? "—" : (summary?.totalViews ?? 0).toLocaleString(),  icon: "ri-eye-line",        badge: null },
              { label: "Link Clicks",     value: loading ? "—" : totalClicks.toLocaleString(),                 icon: "ri-links-line",      badge: "New" },
              { label: "Link Click Rate", value: loading ? "—" : clickRate,                                    icon: "ri-percent-line",    badge: "New" },
              { label: "Contact Saves",   value: loading ? "—" : contactSaves.toLocaleString(),                icon: "ri-contacts-line",   badge: "New" },
            ].map((s, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 relative">
                {s.badge && (
                  <span className="absolute top-3 right-3 text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full">{s.badge}</span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <i className={`${s.icon} text-white/40 text-sm`} />
                  <p className="text-xs text-white/40">{s.label}</p>
                </div>
                <p className="text-3xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Activity + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Activity */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Activity</h3>
              <div className="h-36">
                {loading ? (
                  <div className="h-full bg-white/5 rounded animate-pulse" />
                ) : (
                  <ActivityChart points={activityPoints} />
                )}
              </div>
            </div>

            {/* Pie */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Link Click Distribution</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                  {loading ? (
                    <div className="w-full h-full rounded-full bg-white/5 animate-pulse" />
                  ) : (
                    <PieChart slices={pieSlices.length > 0 ? pieSlices : [{ value: 1, color: "#333", label: "No data" }]} />
                  )}
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {pieSlices.length > 0 ? pieSlices.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-white/50 truncate flex-1">{s.label}</span>
                      <span className="text-white font-medium">{s.value}</span>
                    </div>
                  )) : (
                    <p className="text-white/30 text-xs">No link clicks yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scan Details + Link Click Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Scan Details */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Scan Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[300px]">
                <thead>
                  <tr className="text-white/30 border-b border-white/5">
                    {["Date", "Country", "OS", "Browser"].map((h) => (
                      <th key={h} className="text-left pb-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}><td colSpan={4} className="py-2"><div className="h-3 bg-white/5 rounded animate-pulse" /></td></tr>
                    ))
                  ) : scans.length > 0 ? scans.slice(0, 8).map((s, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-2 text-white/50">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="py-2 text-white/50">{s.country ?? "—"}</td>
                      <td className="py-2 text-white/50">{s.os ?? "—"}</td>
                      <td className="py-2 text-white/50">{s.browser ?? "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-8 text-center text-white/30">No data available</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* Link Click Details */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Link Click Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[300px]">
                <thead>
                  <tr className="text-white/30 border-b border-white/5">
                    {["Link", "Clicks", "CTR"].map((h) => (
                      <th key={h} className="text-left pb-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}><td colSpan={3} className="py-2"><div className="h-3 bg-white/5 rounded animate-pulse" /></td></tr>
                    ))
                  ) : linkClickDetails.length > 0 ? linkClickDetails.sort((a, b) => b.clicks - a.clicks).map((lc, i) => {
                    const ctr = summary && summary.totalViews > 0 ? ((lc.clicks / summary.totalViews) * 100).toFixed(1) + "%" : "0%";
                    return (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="py-2 text-white/50 truncate max-w-[120px]">{lc.title}</td>
                        <td className="py-2 text-white font-medium">{lc.clicks}</td>
                        <td className="py-2 text-white/50">{ctr}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={3} className="py-8 text-center text-white/30">No data available</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
