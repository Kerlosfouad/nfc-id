"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSessionHeaders } from "@/lib/adminSessionClient";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminInlineLoading, EmptyState, Panel } from "../_components/AdminUi";

interface GeoRow {
  country: string;
  scans: number;
  percentage: number;
}

interface MapPoint extends GeoRow {
  label: string;
  x: number;
  y: number;
}

const COUNTRY_POINTS: Record<string, { label: string; x: number; y: number }> = {
  US: { label: "United States", x: 22, y: 42 },
  CA: { label: "Canada", x: 21, y: 29 },
  BR: { label: "Brazil", x: 36, y: 68 },
  GB: { label: "United Kingdom", x: 47, y: 34 },
  FR: { label: "France", x: 49, y: 42 },
  DE: { label: "Germany", x: 52, y: 39 },
  IT: { label: "Italy", x: 53, y: 47 },
  ES: { label: "Spain", x: 47, y: 48 },
  EG: { label: "Egypt", x: 57, y: 55 },
  SA: { label: "Saudi Arabia", x: 62, y: 56 },
  AE: { label: "United Arab Emirates", x: 66, y: 56 },
  IN: { label: "India", x: 70, y: 59 },
  CN: { label: "China", x: 77, y: 47 },
  JP: { label: "Japan", x: 87, y: 45 },
  AU: { label: "Australia", x: 84, y: 76 },
  ZA: { label: "South Africa", x: 56, y: 79 },
  NG: { label: "Nigeria", x: 51, y: 60 },
  TR: { label: "Turkey", x: 58, y: 47 },
  RU: { label: "Russia", x: 68, y: 31 },
  MX: { label: "Mexico", x: 20, y: 51 },
};

function normalizeCountry(country: string) {
  return country.trim().toUpperCase();
}

function resolvePoint(row: GeoRow, index: number): MapPoint {
  const key = normalizeCountry(row.country);
  const known = COUNTRY_POINTS[key];
  if (known) return { ...row, ...known };

  const fallback = [
    { x: 48, y: 42 },
    { x: 62, y: 51 },
    { x: 72, y: 45 },
    { x: 34, y: 58 },
    { x: 82, y: 66 },
  ][index % 5];

  return {
    ...row,
    label: row.country === "Unknown" ? "Unknown location" : row.country,
    ...fallback,
  };
}

function WorldMap({ points, total }: { points: MapPoint[]; total: number }) {
  const featured = points[0];

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#050607] shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(3,169,244,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_35%)]" />
      <div className="absolute left-5 top-5 z-20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Map Distribution</p>
        <p className="mt-1 text-2xl font-bold text-white">{total.toLocaleString()}</p>
        <p className="text-xs text-white/35">tracked scans</p>
      </div>

      {featured && (
        <div
          className="absolute z-30 -translate-x-1/2 -translate-y-full rounded-xl border border-[#03A9F4]/25 bg-[#151a2a]/95 px-4 py-2 text-center shadow-[0_0_24px_rgba(3,169,244,0.22)]"
          style={{ left: `${featured.x}%`, top: `${Math.max(featured.y - 8, 22)}%` }}
        >
          <p className="text-lg font-bold leading-none text-white">{featured.scans.toLocaleString()}</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-[#03A9F4]">people</p>
        </div>
      )}

      <svg viewBox="0 0 1000 520" className="absolute inset-x-0 bottom-2 h-[84%] w-full text-white/10" aria-hidden="true">
        <defs>
          <pattern id="mapDots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
          </pattern>
          <filter id="pinGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g fill="url(#mapDots)" opacity="0.95">
          <path d="M96 192 142 156l74-16 68 24 42 44-26 42-84 18-72-18-56-28z" />
          <path d="M248 285 318 270l60 52 24 80-40 68-64-34-44-70z" />
          <path d="M448 160 534 130l94 20 38 52-38 48-90-10-74 32-66-36z" />
          <path d="M496 280 584 266l80 40 36 78-44 72-82-28-60-62z" />
          <path d="M672 178 792 132l110 34 38 72-72 56-126-24-86 30-54-58z" />
          <path d="M748 330 858 342l60 64-42 64-108-14-52-62z" />
        </g>

        <g>
          {points.map((point) => (
            <g key={`${point.country}-${point.x}-${point.y}`} transform={`translate(${point.x * 10} ${point.y * 5.2})`} className="group">
              <circle r="18" fill="#03A9F4" opacity="0.14" />
              <path
                d="M0-22c-10 0-18 8-18 18 0 14 18 32 18 32S18 10 18-4c0-10-8-18-18-18Zm0 24a7 7 0 1 1 0-14A7 7 0 0 1 0 2Z"
                fill="#03A9F4"
                filter="url(#pinGlow)"
              />
              <foreignObject x="-55" y="-62" width="110" height="34" className="pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="rounded-lg border border-[#03A9F4]/30 bg-black/80 px-2 py-1 text-center text-[10px] text-white shadow-xl">
                  <span className="block truncate font-semibold">{point.label}</span>
                  <span className="text-[#03A9F4]">{point.scans.toLocaleString()} scans</span>
                </div>
              </foreignObject>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function AdminGeoPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<GeoRow[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getAdminSessionHeaders().then(async (session) => {
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/v1/admin/geo", {
        headers: session.headers,
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

  const points = useMemo(() => rows.map(resolvePoint), [rows]);

  if (checking) {
    return (
      <AdminChrome title="Geo Map" subtitle="Scan distribution by country from analytics events.">
        <AdminInlineLoading />
      </AdminChrome>
    );
  }

  return (
    <AdminChrome title="Geo Map" subtitle="Scan distribution by country from analytics events.">
      <Panel title={`Map Distribution (${total.toLocaleString()})`}>
        {rows.length === 0 ? (
          <EmptyState icon="ri-map-pin-line" title="No location data yet" body="When scans include geo data, countries and percentages will appear here automatically." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <WorldMap points={points} total={total} />
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Top Locations</p>
                  <p className="text-xs text-white/35">Users and scans by country</p>
                </div>
                <i className="ri-map-pin-2-line text-xl text-[#03A9F4]" />
              </div>
              <div className="space-y-4">
                {points.map((row) => (
                  <div key={row.country}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-white/85">{row.label}</span>
                      <span className="shrink-0 text-white/45">{row.scans.toLocaleString()} people</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-[#03A9F4] shadow-[0_0_18px_rgba(3,169,244,0.45)]" style={{ width: `${row.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </AdminChrome>
  );
}
