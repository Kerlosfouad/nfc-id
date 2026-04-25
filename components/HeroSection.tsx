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
    <section className="relative flex justify-center items-center overflow-hidden" style={{ minHeight: "100vh" }}>
      <ParticleBackground />
      <div className="absolute inset-0 z-[1] hero-grid opacity-[0.07] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#03A9F4]/6 blur-[140px] pointer-events-none z-[1] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-[#0066ff]/4 blur-[100px] pointer-events-none z-[1] animate-pulse-slow2" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0b0a0a] to-transparent z-[2] pointer-events-none" />

      <div className="container mx-auto relative z-[3] flex justify-center items-center px-4 pt-28">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#03A9F4]/30 bg-[#03A9F4]/10 text-[#03A9F4] text-xs font-semibold uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#03A9F4] animate-pulse" />
            Smart NFC · Link in Bio Platform
          </div>

          <h1 className="font-bold text-white uppercase leading-none mb-4" style={{ fontSize: "clamp(60px, 12vw, 140px)" }}>
            NFC <span className="text-[#03a9f4] drop-shadow-[0_0_40px_rgba(3,169,244,0.5)]">ID</span>
          </h1>

          <p className="text-[#aaa] text-lg md:text-xl mb-4 max-w-xl mx-auto leading-relaxed">
            One link for everything you create, share, and sell.
          </p>
          <p className="text-white/40 text-sm mb-10 max-w-md mx-auto">
            Share your links, social profiles, contact info, and more — all from a single NFC tap or QR scan.
          </p>

          <div className="flex gap-4 justify-center flex-wrap mb-14">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#03A9F4] text-white font-semibold uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_30px_rgba(3,169,244,0.5)] transition-all duration-300"
            >
              <i className="ri-rocket-line" />
              Get Your Free Link
            </Link>
            <Link
              href="/#PRODUCT"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white font-semibold uppercase tracking-wider hover:border-white/50 hover:bg-white/5 transition-all duration-300"
            >
              <i className="ri-nfc-line" />
              See NFC Cards
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Scroll hint */}
          <div className="mt-14 flex flex-col items-center gap-2 text-white/30 text-xs uppercase tracking-widest animate-bounce">
            <i className="ri-arrow-down-line text-lg" />
            Scroll
          </div>
        </div>
      </div>
    </section>
  );
}
