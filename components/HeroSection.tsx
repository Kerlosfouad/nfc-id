"use client";
import Link from "next/link";
import ParticleBackground from "./ParticleBackground";

const stats = [
  { value: "50K+", label: "Active Profiles" },
  { value: "2M+", label: "Monthly Scans" },
  { value: "99.9%", label: "Uptime" },
];

export default function HeroSection() {
  return (
    <section className="relative flex justify-center items-center overflow-hidden" style={{ minHeight: "100svh" }}>
      <ParticleBackground />
      <div className="absolute inset-0 z-[1] hero-grid opacity-[0.07] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#03A9F4]/6 blur-[140px] pointer-events-none z-[1] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-[#0066ff]/4 blur-[100px] pointer-events-none z-[1] animate-pulse-slow2" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0b0a0a] to-transparent z-[2] pointer-events-none" />

      <div className="container mx-auto relative z-[3] flex justify-center items-center px-5 pt-24 sm:pt-28">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex max-w-full items-center justify-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-[#03A9F4]/30 bg-[#03A9F4]/10 text-[#03A9F4] text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-widest mb-5 sm:mb-6 text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#03A9F4] animate-pulse" />
            Smart NFC - Link in Bio Platform
          </div>

          <h1 className="font-bold text-white uppercase leading-[0.92] mb-4 sm:mb-4" style={{ fontSize: "clamp(54px, 17vw, 140px)" }}>
            NFC <span className="text-[#03a9f4] drop-shadow-[0_0_40px_rgba(3,169,244,0.5)]">ID</span>
          </h1>

          <p className="text-[#aaa] text-lg sm:text-xl md:text-xl mb-3 sm:mb-4 max-w-xl mx-auto leading-snug sm:leading-relaxed">
            One link for everything you create, share, and sell.
          </p>
          <p className="text-white/40 text-sm sm:text-sm mb-8 sm:mb-10 max-w-[330px] sm:max-w-md mx-auto leading-relaxed">
            Share your links, social profiles, contact info, and more - all from a single NFC tap or QR scan.
          </p>

          <div className="flex gap-2.5 sm:gap-4 justify-center flex-col sm:flex-row mb-10 sm:mb-14">
            <Link
              href="/signup"
              className="inline-flex h-12 sm:h-auto items-center justify-center gap-2 px-5 sm:px-8 py-0 sm:py-3.5 rounded-full bg-[#03A9F4] text-white text-sm sm:text-base font-semibold uppercase tracking-wide sm:tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_30px_rgba(3,169,244,0.5)] transition-all duration-300"
            >
              <i className="ri-rocket-line" />
              Get Your Free Link
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-12 sm:h-auto items-center justify-center gap-2 px-5 sm:px-8 py-0 sm:py-3.5 rounded-full border border-white/20 text-white text-sm sm:text-base font-semibold uppercase tracking-wide sm:tracking-wider hover:border-white/50 hover:bg-white/5 transition-all duration-300"
            >
              <i className="ri-shopping-bag-line" />
              Shop NFC Cards
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5 sm:flex sm:items-center sm:justify-center sm:gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-white/40 uppercase tracking-wide sm:tracking-wider leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Scroll hint */}
          <div className="mt-10 sm:mt-14 flex flex-col items-center gap-2 text-white/30 text-[10px] sm:text-xs uppercase tracking-widest animate-bounce">
            <i className="ri-arrow-down-line text-lg" />
            Scroll
          </div>
        </div>
      </div>
    </section>
  );
}
