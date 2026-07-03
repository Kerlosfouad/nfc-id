"use client";

import Image from "next/image";
import Link from "next/link";

const shopHighlights = [
  { icon: "ri-nfc-line", label: "NFC ready", value: "Tap" },
  { icon: "ri-qr-code-line", label: "QR fallback", value: "Scan" },
  { icon: "ri-refresh-line", label: "Reusable", value: "Edit" },
] as const;

const productTypes = [
  { name: "Smart Card", detail: "For teams, creators, and business intros." },
  { name: "Medal Tag", detail: "For events, access, and wearable identity." },
  { name: "Key Tag", detail: "For everyday sharing on the move." },
] as const;

export default function ProductSection() {
  return (
    <section id="PRODUCT" className="relative overflow-hidden px-4 py-24 sm:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/35 to-transparent" />
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-25" />
      <div className="pointer-events-none absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-[#03A9F4]/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-28 bottom-20 h-[360px] w-[520px] rounded-full bg-cyan-400/7 blur-[110px]" />

      <div className="container relative z-10 mx-auto">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#03A9F4] sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#20E7FF] shadow-[0_0_12px_rgba(32,231,255,0.8)]" />
              LinkUp Shop
            </div>

            <h2 className="text-balance text-[clamp(2.7rem,7vw,6.4rem)] font-black leading-[0.9] tracking-normal text-white">
              Gear made for one-tap identity
            </h2>

            <p className="mt-6 max-w-lg text-base leading-8 text-white/52 sm:text-lg">
              Choose the card, medal, or key tag that carries your profile. Every product is built to open your live LinkUp page with a tap or scan.
            </p>

            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {shopHighlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-4">
                  <i className={`${item.icon} text-xl text-[#03A9F4]`} />
                  <p className="mt-3 text-lg font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="group inline-flex h-[54px] items-center justify-center gap-3 rounded-full bg-[#03A9F4] px-7 text-sm font-black uppercase tracking-[0.16em] text-white transition-all duration-300 hover:bg-white hover:text-black hover:shadow-[0_0_34px_rgba(32,231,255,0.35)] active:scale-[0.98]">
                Enter the Shop
                <i className="ri-arrow-right-line text-lg transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/#USE" className="inline-flex h-[54px] items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-7 text-sm font-bold uppercase tracking-[0.16em] text-white/70 transition-all duration-300 hover:border-[#03A9F4]/40 hover:text-white">
                How it works
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="group relative min-h-[500px] overflow-hidden rounded-[2.15rem] border border-white/10 bg-[#070a0d] shadow-[0_42px_150px_rgba(0,0,0,0.48)] sm:min-h-[640px]">
              <Image
                src="/assets/linkup/linkup-shop-hero.png"
                alt="LinkUp smart NFC card, medal, key tag, and phone"
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,9,0.12),rgba(5,7,9,0.08)),linear-gradient(180deg,transparent_52%,rgba(5,7,9,0.82))]" />
              <div className="absolute left-5 right-5 top-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl sm:left-7 sm:right-7 sm:top-7">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/64">Product gateway</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#03A9F4]/15 px-3 py-1 text-xs font-bold text-[#20E7FF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#20E7FF]" />
                  Live shop
                </span>
              </div>

              <div className="absolute bottom-5 left-5 right-5 grid gap-3 sm:bottom-7 sm:left-7 sm:right-7 sm:grid-cols-3">
                {productTypes.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-white/10 bg-black/42 p-4 backdrop-blur-xl transition-all duration-300 hover:border-[#03A9F4]/45 hover:bg-[#03A9F4]/10">
                    <p className="text-sm font-black text-white">{item.name}</p>
                    <p className="mt-2 text-xs leading-5 text-white/45">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-[#03A9F4]/20 bg-[#031016]/90 px-5 py-4 shadow-[0_24px_90px_rgba(3,169,244,0.15)] backdrop-blur-xl sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">Tap response</p>
              <p className="mt-1 text-3xl font-black text-[#20E7FF]">0.3s</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
