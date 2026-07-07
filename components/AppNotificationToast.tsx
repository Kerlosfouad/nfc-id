"use client";

import Image from "next/image";

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  time?: string;
  visible: boolean;
};

export function AppNotificationToast({ items }: { items: AppNotification[] }) {
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-[52px] z-[120] flex flex-col items-center gap-2 px-4 sm:top-5">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={
            "relative flex w-full max-w-[430px] items-center gap-3 overflow-hidden rounded-2xl border border-white/70 bg-white/92 px-4 py-3 text-[#111827] shadow-[0_18px_46px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-all duration-200 ease-out " +
            (item.visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-4 scale-[0.98] opacity-0") +
            (index > 0 ? " -mt-3 scale-[0.97] opacity-80" : "")
          }
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(236,248,255,0.92)_48%,rgba(255,255,255,0.94))]" />
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#03A9F4]/15 bg-[#f4fbff] p-2 shadow-[0_10px_24px_rgba(3,169,244,0.16)]">
            <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={40} height={40} className="h-10 w-10 object-contain" />
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 truncate text-sm font-black text-[#111827]">{item.title}</p>
              {item.time && <span className="shrink-0 text-[11px] font-semibold text-[#64748b]">{item.time}</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#475569]">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
