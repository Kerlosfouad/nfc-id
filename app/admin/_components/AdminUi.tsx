"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  formatter,
  className,
  duration = 650,
}: {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayRef.current = value;
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = displayRef.current;
    const change = value - from;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const nextValue = from + change * eased;
      displayRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const rounded = Math.round(displayValue);

  return <span className={className}>{formatter ? formatter(rounded) : rounded.toLocaleString()}</span>;
}

export function MetricCard({
  label,
  value,
  icon,
  hint,
  formatter,
}: {
  label: string;
  value: number;
  icon: string;
  hint: string;
  formatter?: (value: number) => string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#03A9F4]/18 bg-[#0d2539] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.26)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#03A9F4]/42 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(3,169,244,0.13),transparent_46%),radial-gradient(circle_at_100%_0%,rgba(3,169,244,0.22),transparent_9rem)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative min-h-14 pr-14 sm:min-h-16 sm:pr-20">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8fdfff]/62 sm:text-[11px] sm:tracking-[0.22em]">{label}</p>
          <p className="mt-3 max-w-full whitespace-nowrap text-[clamp(1.85rem,8vw,2.35rem)] font-bold leading-none text-white sm:text-[34px]">
            <AnimatedNumber value={value} formatter={formatter} />
          </p>
        </div>
        <span className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#03A9F4]/35 bg-[#03A9F4]/12 text-[#29c0ff] shadow-[0_0_22px_rgba(3,169,244,0.15)] sm:h-14 sm:w-14">
          <i className={`${icon} text-xl sm:text-2xl`} />
        </span>
      </div>
      <p className="relative mt-4 line-clamp-2 min-h-[2.25rem] text-xs leading-[1.15rem] text-white/48 sm:min-h-[2.5rem] sm:text-sm sm:leading-5">{hint}</p>
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-[#2c2c2c] bg-white/[0.03] p-3 backdrop-blur-md sm:p-5">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
        <h2 className="min-w-0 text-sm font-bold uppercase tracking-wide sm:text-base">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
      <i className={`${icon} text-4xl text-[#03A9F4]`} />
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">{body}</p>
    </div>
  );
}

export function AdminLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0b0a0a] text-white p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-16 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
      </div>
    </div>
  );
}

export function AdminInlineLoading() {
  return null;
}
