export function MetricCard({ label, value, icon, hint }: { label: string; value: string | number; icon: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[#2c2c2c] bg-white/[0.03] p-5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/35">{label}</p>
          <p className="mt-3 text-3xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#03A9F4]/25 bg-[#03A9F4]/10 text-[#03A9F4]">
          <i className={`${icon} text-xl`} />
        </span>
      </div>
      <p className="mt-4 text-xs text-white/35">{hint}</p>
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#2c2c2c] bg-white/[0.03] p-5 backdrop-blur-md">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold uppercase tracking-wide">{title}</h2>
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
