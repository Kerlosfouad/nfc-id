"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "../_components/AdminChrome";
import { EmptyState, Panel } from "../_components/AdminUi";

interface GeoRow {
  country: string;
  scans: number;
  percentage: number;
}

export default function AdminGeoPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<GeoRow[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/v1/admin/geo", {
        headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
      });
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setRows(json.data?.rows ?? []);
        setTotal(json.data?.total ?? 0);
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) return <div className="min-h-screen bg-[#0b0a0a] text-white flex items-center justify-center">Loading...</div>;

  return (
    <AdminChrome title="Geo Map" subtitle="Scan distribution by country from analytics events.">
      <Panel title={`Scan Locations (${total.toLocaleString()})`}>
        {rows.length === 0 ? (
          <EmptyState icon="ri-map-pin-line" title="No location data yet" body="When scans include geo data, countries and percentages will appear here automatically." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="min-h-80 rounded-xl border border-[#03A9F4]/20 bg-[radial-gradient(circle_at_35%_40%,rgba(3,169,244,0.3),transparent_18%),radial-gradient(circle_at_65%_60%,rgba(3,169,244,0.18),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))]" />
            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.country}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{row.country}</span>
                    <span className="text-white/45">{row.scans.toLocaleString()} scans</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-[#03A9F4]" style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </AdminChrome>
  );
}

