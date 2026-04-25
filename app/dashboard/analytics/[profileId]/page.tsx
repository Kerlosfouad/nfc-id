"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface LinkClick {
  linkId: string;
  clicks: number;
}

interface LinkCtr {
  linkId: string;
  ctr: number;
}

interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  linkClicks: LinkClick[];
  ctrPerLink: LinkCtr[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      try {
        const res = await fetch(`/api/v1/analytics/${profileId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "x-user-id": session.user.id,
          },
        });
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        setSummary(json.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    });
  }, [router, profileId]);

  const maxClicks = summary ? Math.max(...summary.linkClicks.map((l) => l.clicks), 1) : 1;
  const engagementRate = summary && summary.totalViews > 0
    ? ((summary.linkClicks.reduce((a, b) => a + b.clicks, 0) / summary.totalViews) * 100).toFixed(1)
    : "0";

  return (
    <div className="bg-[#0b0a0a] min-h-screen text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <nav className="border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 bg-[#0b0a0a]/90 backdrop-blur-md z-10">
        <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium">Analytics</span>
        <span className="ml-auto text-xs text-white/30 bg-white/5 border border-white/10 px-2 py-1 rounded">
          Max 60s staleness
        </span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Profile Analytics</h1>
          <Link
            href={`/api/v1/profiles/${profileId}/leads/export`}
            target="_blank"
            className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <i className="ri-download-line" />
            Export Leads CSV
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
                <div className="h-3 bg-white/10 rounded mb-3 w-1/2" />
                <div className="h-8 bg-white/10 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {summary && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Total Views"
                value={summary.totalViews.toLocaleString()}
                icon="ri-eye-line"
                color="text-white"
                bg="bg-white/5"
              />
              <StatCard
                label="Unique Visitors"
                value={summary.uniqueVisitors.toLocaleString()}
                icon="ri-user-line"
                color="text-[#03A9F4]"
                bg="bg-[#03A9F4]/5"
              />
              <StatCard
                label="Total Clicks"
                value={summary.linkClicks.reduce((a, b) => a + b.clicks, 0).toLocaleString()}
                icon="ri-cursor-line"
                color="text-purple-400"
                bg="bg-purple-400/5"
              />
              <StatCard
                label="Engagement"
                value={`${engagementRate}%`}
                icon="ri-bar-chart-line"
                color="text-green-400"
                bg="bg-green-400/5"
              />
            </div>

            {/* Visitor ratio bar */}
            {summary.totalViews > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Visitor Ratio</p>
                  <p className="text-xs text-white/40">
                    {summary.uniqueVisitors} unique / {summary.totalViews} total
                  </p>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#03A9F4] to-[#8A2BE2] rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((summary.uniqueVisitors / summary.totalViews) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-[#03A9F4]">Unique</span>
                  <span className="text-xs text-white/30">Returning</span>
                </div>
              </div>
            )}

            {/* Link performance */}
            {summary.linkClicks.length > 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-sm">Link Performance</h2>
                <div className="space-y-3">
                  {summary.linkClicks
                    .sort((a, b) => b.clicks - a.clicks)
                    .map((lc) => {
                      const ctr = summary.ctrPerLink.find((c) => c.linkId === lc.linkId);
                      const pct = (lc.clicks / maxClicks) * 100;
                      return (
                        <div key={lc.linkId}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-white/60 font-mono text-xs truncate max-w-[200px]">
                              {lc.linkId.slice(0, 8)}…
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium">{lc.clicks} clicks</span>
                              {ctr && (
                                <span className="text-white/40 text-xs w-16 text-right">
                                  {(ctr.ctr * 100).toFixed(1)}% CTR
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#03A9F4] to-[#8A2BE2] rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
                <i className="ri-cursor-line text-4xl text-white/20 mb-3 block" />
                <p className="text-white/30 text-sm">No link clicks recorded yet.</p>
                <p className="text-white/20 text-xs mt-1">Share your profile to start getting clicks.</p>
              </div>
            )}

            {/* Tips */}
            {summary.totalViews === 0 && (
              <div className="bg-[#03A9F4]/5 border border-[#03A9F4]/20 rounded-xl p-5">
                <p className="text-[#03A9F4] text-sm font-medium mb-1">No data yet</p>
                <p className="text-white/40 text-xs">Share your profile link or NFC tag to start collecting analytics.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg }: {
  label: string; value: string; icon: string; color: string; bg: string;
}) {
  return (
    <div className={`${bg} border border-white/10 rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <i className={`${icon} ${color} text-base`} />
        <p className="text-xs text-white/40">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
