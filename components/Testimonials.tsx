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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(3,169,244,0.18),transparent_34%),radial-gradient(circle_at_18%_82%,rgba(0,229,255,0.08),transparent_28%),#050607]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/55 to-transparent" />
      <div className="absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-[#03A9F4]/10 blur-[90px]" />

      <div className="relative mx-auto w-full max-w-6xl px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <i className="ri-download-cloud-2-line text-[#03A9F4]" />
            Available Soon
          </div>
          <h2 className="text-balance text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.95] tracking-normal text-white">
            Download the LinkUp app
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
            Manage your smart profile, edit links, track scans, and share your identity from one polished mobile experience.
          </p>
        </div>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div data-gsap-media className="relative mx-auto h-[520px] w-full max-w-[360px] sm:h-[610px] sm:max-w-[420px]">
            <div className="absolute left-1/2 top-0 h-full w-[78%] -translate-x-1/2 rounded-[3rem] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.015] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_80px_rgba(3,169,244,0.10)]">
              <div className="relative h-full overflow-hidden rounded-[2.55rem] border border-white/[0.06] bg-[#0a0d10]">
                <div className="absolute left-1/2 top-4 h-7 w-24 -translate-x-1/2 rounded-full bg-black" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(3,169,244,0.22),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_28%)]" />
                <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
                  <div className="relative mb-9 h-40 w-40 sm:h-48 sm:w-48">
                    <div className="absolute inset-0 rounded-[2rem] bg-[#03A9F4]/15 blur-2xl" />
                    <Image src="/img/logo.png" alt="LinkUp" fill sizes="192px" className="object-contain drop-shadow-[0_0_34px_rgba(3,169,244,0.35)]" priority />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/40">Your smart identity</p>
                  <h3 className="mt-3 text-2xl font-black text-white">LinkUp</h3>
                  <div className="mt-8 grid w-full grid-cols-3 gap-2">
                    {["Profile", "Scans", "Links"].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-3 text-[10px] font-semibold text-white/55">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-4 top-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-2xl text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <i className="ri-smartphone-line" />
            </div>
            <div className="absolute bottom-8 left-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#03A9F4]/20 bg-[#03A9F4]/10 text-xl text-[#03A9F4] backdrop-blur-xl">
              <i className="ri-nfc-line" />
            </div>
          </div>

          <div data-gsap-stack className="mx-auto w-full max-w-[520px] space-y-5 lg:mx-0">
            {storeLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                data-gsap-stack-card
                className="group flex min-h-[96px] items-center justify-between rounded-[1.35rem] border border-white/10 bg-white/[0.035] px-5 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-500 hover:-translate-y-1 hover:border-[#03A9F4]/45 hover:bg-[#03A9F4]/10 hover:shadow-[0_24px_80px_rgba(3,169,244,0.13)]"
              >
                <span className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] text-3xl text-white transition-transform duration-500 group-hover:scale-105">
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
              <span className="text-xs font-semibold text-white/35">For members and creators</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/15 to-white/5" />
            </div>

            <Link
              href="/dashboard"
              data-gsap-stack-card
              className="group flex min-h-[74px] items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-[#03A9F4]/28 bg-[#03A9F4]/8 px-6 text-sm font-black uppercase tracking-[0.18em] text-white transition-all duration-500 hover:border-[#03A9F4]/65 hover:bg-[#03A9F4]/16"
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
