import Image from "next/image";

const stats = [
  { icon: "ri-user-2-line", value: "50K+", label: "Active Users", desc: "Creators & professionals" },
  { icon: "ri-qr-scan-2-line", value: "2M+", label: "Monthly Scans", desc: "Successful connections" },
  { icon: "ri-global-line", value: "30+", label: "Countries", desc: "Global reach & growing" },
  { icon: "ri-sim-card-2-line", value: "NFC", label: "Technology", desc: "Fast & secure tap" },
];

const comparison = [
  { feature: "Link in Bio", us: true, them: true },
  { feature: "Physical NFC Card", us: true, them: false },
  { feature: "QR Code", us: true, them: true },
  { feature: "Analytics", us: true, them: true },
  { feature: "Lead Capture", us: true, them: false },
  { feature: "Link Scheduling", us: true, them: false },
  { feature: "PIN Protection", us: true, them: false },
  { feature: "Custom Themes", us: true, them: true },
];

export default function AboutSection() {
  return (
    <section id="about" className="py-10 sm:py-24 px-4">
      <div className="w-full max-w-none md:container md:mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-7 sm:w-8 h-[2px] bg-[#03A9F4] rounded-full" />
          <span className="text-[#03A9F4] text-[10px] sm:text-xs font-semibold uppercase tracking-widest">Who We Are</span>
        </div>
        <h2 className="text-white text-2xl sm:text-5xl font-bold uppercase mb-1 leading-tight">About Us</h2>
        <p className="text-[#555] text-xs sm:text-base mb-5 sm:mb-10 leading-relaxed">Everything you need to know</p>

        <div className="flex w-full flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Stats grid */}
          <div className="grid w-full grid-cols-2 gap-3 md:w-1/2">
            {stats.map((s, i) => (
              <div
                key={i}
                className="group relative min-h-[120px] sm:min-h-[132px] bg-gradient-to-br from-[#1a1a1d] to-[#111114] rounded-2xl p-3.5 sm:p-5 border border-[#222] hover:border-[#03A9F4]/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-[#03A9F4]/0 group-hover:bg-[#03A9F4]/5 transition-all duration-300 rounded-2xl" />
                <div className="relative z-10">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#1f1f23] group-hover:bg-[#03A9F4]/20 border border-[#2c2c2c] group-hover:border-[#03A9F4]/30 flex items-center justify-center mb-3 transition-all duration-300">
                    <i className={`${s.icon} text-[#03A9F4] text-lg sm:text-xl`} />
                  </div>
                  <div className="text-[#03A9F4] text-xl sm:text-2xl font-bold mb-0.5">{s.value}</div>
                  <div className="text-white text-xs sm:text-sm font-semibold leading-tight">{s.label}</div>
                  <div className="text-[#555] text-[10px] sm:text-xs mt-0.5 leading-tight">{s.desc}</div>
                </div>
              </div>
            ))}

            {/* Comparison table */}
            <div className="col-span-2 bg-gradient-to-br from-[#1a1a1d] to-[#111114] rounded-2xl p-4 sm:p-5 border border-[#222]">
              <p className="text-white text-sm font-semibold mb-3">NFC ID vs. Linktree</p>
              <div className="space-y-2 max-h-[176px] overflow-hidden sm:max-h-none">
                {comparison.map((c, i) => (
                  <div key={i} className="flex items-start sm:items-center justify-between gap-3 text-[10px] sm:text-xs">
                    <span className="text-[#666]">{c.feature}</span>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-6">
                      <span className={c.us ? "text-green-400" : "text-red-400/50"}>
                        <i className={c.us ? "ri-check-line" : "ri-close-line"} />
                        <span className="ml-1 text-[#444]">NFC ID</span>
                      </span>
                      <span className={c.them ? "text-green-400/50" : "text-red-400/30"}>
                        <i className={c.them ? "ri-check-line" : "ri-close-line"} />
                        <span className="ml-1 text-[#333]">Linktree</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="hidden md:flex md:w-1/2 justify-center items-center relative">
            <div className="absolute w-48 h-48 bg-[#03A9F4]/10 rounded-full blur-3xl" />
            <Image
              src="/img/keychain-with-phone.webp"
              alt="Keychain with phone"
              width={280}
              height={420}
              className="relative z-10 drop-shadow-2xl"
              style={{
                WebkitBoxReflect:
                  "below 8px linear-gradient(transparent 60%, rgba(0,0,0,0.2) 80%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
