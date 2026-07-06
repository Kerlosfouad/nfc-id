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
            "relative flex w-full max-w-[430px] items-center gap-3 overflow-hidden rounded-2xl border border-white/20 bg-[#d8f2ff]/16 px-4 py-3 text-white shadow-[0_22px_70px_rgba(3,169,244,0.26)] backdrop-blur-2xl transition-all duration-500 ease-out " +
            (item.visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-5 scale-[0.96] opacity-0") +
            (index > 0 ? " -mt-3 scale-[0.97] opacity-80" : "")
          }
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(3,169,244,0.08)_48%,rgba(255,255,255,0.06))]" />
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/85 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
            <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={40} height={40} className="h-10 w-10 object-contain" />
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{item.title}</p>
              {item.time && <span className="shrink-0 text-[11px] font-semibold text-white/65">{item.time}</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/78">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
