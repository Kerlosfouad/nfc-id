"use client";

import Image from "next/image";
import Link from "next/link";

const storeLinks = [
  {
    href: "#",
    eyebrow: "Download on the",
    label: "App Store",
    icon: "ri-apple-line",
  },
  {
    href: "#",
    eyebrow: "Get it on",
    label: "Google Play",
    icon: "ri-google-play-line",
  },
];

export default function Testimonials() {
  return (
    <section id="download" className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(3,169,244,0.26),transparent_32%),radial-gradient(circle_at_18%_78%,rgba(0,229,255,0.15),transparent_30%),radial-gradient(circle_at_88%_58%,rgba(37,99,235,0.16),transparent_26%),linear-gradient(180deg,#07131b_0%,#071017_42%,#050607_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/55 to-transparent" />
      <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#03A9F4]/18 blur-[90px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#03A9F4]/10 to-transparent" />

      <div className="relative mx-auto w-full max-w-6xl px-4">
        <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/25 bg-[#03A9F4]/10 px-4 py-2 text-xs font-semibold text-[#9ee9ff] shadow-[0_0_28px_rgba(3,169,244,0.14),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <i className="ri-download-cloud-2-line text-[#03A9F4]" />
            Available Soon
          </div>
          <h2 className="text-balance text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.95] tracking-normal text-white">
            Download the LinkUp app
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
            Manage links, scans, and identity in one app.
          </p>
        </div>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div data-gsap-media className="relative mx-auto h-[520px] w-full max-w-[360px] sm:h-[610px] sm:max-w-[420px]">
            <div className="absolute left-1/2 top-0 h-full w-[78%] -translate-x-1/2 rounded-[3rem] border border-[#03A9F4]/24 bg-gradient-to-b from-white/[0.12] to-[#03A9F4]/[0.035] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.58),0_0_95px_rgba(3,169,244,0.22)]">
              <div className="relative h-full overflow-hidden rounded-[2.55rem] border border-white/[0.06] bg-[#0a0d10]">
                <div className="absolute left-1/2 top-4 h-7 w-24 -translate-x-1/2 rounded-full bg-black" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_28%)]" />
                <div className="absolute inset-x-8 top-28 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/35 to-transparent opacity-0 animate-[linkup-scan_4.8s_ease-in-out_infinite]" />
                <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
                  <div className="relative h-64 w-64 animate-[linkup-float_5.5s_ease-in-out_infinite] sm:h-72 sm:w-72">
                    <Image src="/img/logo.png" alt="LinkUp" fill sizes="288px" className="object-contain" priority />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-4 top-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#03A9F4]/24 bg-[#03A9F4]/14 text-2xl text-[#9ee9ff] shadow-[0_20px_60px_rgba(3,169,244,0.18)] backdrop-blur-xl">
              <i className="ri-smartphone-line" />
            </div>
            <div className="absolute bottom-8 left-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#03A9F4]/30 bg-[#03A9F4]/18 text-xl text-[#20E7FF] backdrop-blur-xl">
              <i className="ri-nfc-line" />
            </div>
          </div>

          <div data-gsap-stack className="mx-auto w-full max-w-[520px] space-y-5 lg:mx-0">
            {storeLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                data-gsap-stack-card
                className="group flex min-h-[96px] items-center justify-between rounded-[1.35rem] border border-[#03A9F4]/14 bg-white/[0.06] px-5 py-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-500 hover:-translate-y-1 hover:border-[#03A9F4]/55 hover:bg-[#03A9F4]/14 hover:shadow-[0_24px_80px_rgba(3,169,244,0.18)]"
              >
                <span className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#03A9F4]/12 text-3xl text-[#dff8ff] transition-transform duration-500 group-hover:scale-105">
                    <i className={item.icon} />
                  </span>
                  <span>
                    <span className="block text-xs font-medium text-white/45">{item.eyebrow}</span>
                    <span className="mt-1 block text-xl font-black">{item.label}</span>
                  </span>
                </span>
                <i className="ri-arrow-right-up-line text-2xl text-white/45 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[#03A9F4]" />
              </Link>
            ))}

            <div data-gsap-stack-card className="flex items-center gap-4 py-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-white/5" />
              <span className="text-xs font-semibold text-white/50">For members and creators</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/15 to-white/5" />
            </div>

            <Link
              href="/dashboard"
              data-gsap-stack-card
              className="group flex min-h-[74px] items-center justify-center gap-3 rounded-[1.25rem] border border-[#03A9F4]/35 bg-[#03A9F4]/16 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_20px_70px_rgba(3,169,244,0.12)] transition-all duration-500 hover:border-[#03A9F4]/70 hover:bg-[#03A9F4]/24"
            >
              <i className="ri-dashboard-3-line text-lg text-[#03A9F4]" />
              Access your dashboard
              <i className="ri-arrow-right-line text-lg transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
