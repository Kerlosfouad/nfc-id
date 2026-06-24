import Image from "next/image";

const features = [
  {
    title: "All Your Links",
    desc: "Add unlimited links — social profiles, websites, WhatsApp, YouTube, Spotify, TikTok, and more. Everything in one place.",
    img: "/img/add-links.webp",
    icon: "ri-links-line",
    color: "from-[#03A9F4]/20 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_rgba(3,169,244,0.15)]",
    badge: "Like Linktree",
  },
  {
    title: "Real-Time Analytics",
    desc: "Track views, unique visitors, click-through rates per link, device types, and geographic data — all in real time.",
    img: "/img/analytics.webp",
    icon: "ri-bar-chart-2-line",
    color: "from-[#8A2BE2]/20 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_rgba(138,43,226,0.15)]",
    badge: "Built-in",
  },
  {
    title: "NFC + QR Powered",
    desc: "Physical NFC cards and QR codes that instantly redirect to your profile. One tap — your entire digital identity.",
    img: "/img/dynamic-qr.webp",
    icon: "ri-qr-code-line",
    color: "from-[#00d084]/20 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_rgba(0,208,132,0.15)]",
    badge: "Phygital",
  },
];

const extraFeatures = [
  { icon: "ri-lock-password-line", title: "PIN Protection", desc: "Lock your profile with a PIN code" },
  { icon: "ri-eye-off-line", title: "Content Warning", desc: "Add age-gate for sensitive content" },
  { icon: "ri-contacts-line", title: "Lead Capture", desc: "Collect visitor emails directly" },
  { icon: "ri-palette-line", title: "Custom Themes", desc: "Gradient, glassmorphism, minimal" },
  { icon: "ri-calendar-schedule-line", title: "Link Scheduling", desc: "Set active from/to dates per link" },
  { icon: "ri-download-cloud-line", title: "Export Leads", desc: "Download contacts as CSV" },
];

export default function FeaturesSection() {
  return (
    <section className="py-14 sm:py-24 px-5 sm:px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 text-[#03A9F4] text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-4">
            Everything You Need
          </div>
          <h2 className="text-white text-3xl sm:text-5xl font-bold uppercase leading-tight">Power Features</h2>
          <p className="text-[#555] text-sm sm:text-base mt-2 sm:mt-3 max-w-[330px] sm:max-w-md mx-auto leading-relaxed">
            More than a link-in-bio. A complete phygital identity platform.
          </p>
        </div>

        {/* Main 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group relative bg-gradient-to-br from-[#1a1a1d] to-[#111114] rounded-2xl p-5 sm:p-6 border border-[#222] hover:border-[#333] transition-all duration-400 overflow-hidden ${f.glow}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${f.color}`} />
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#1f1f23] border border-[#2c2c2c] flex items-center justify-center">
                  <i className={`${f.icon} text-[#03A9F4] text-2xl`} />
                </div>
                <span className="text-xs text-[#03A9F4] bg-[#03A9F4]/10 border border-[#03A9F4]/20 px-2 py-0.5 rounded-full font-medium">
                  {f.badge}
                </span>
              </div>
              <h3 className="text-white text-lg sm:text-xl font-bold uppercase mb-2 leading-tight">{f.title}</h3>
              <p className="text-[#777] text-sm mb-5 sm:mb-6 leading-relaxed">{f.desc}</p>
              <div className="flex justify-center">
                <Image src={f.img} alt={f.title} width={200} height={200} className="mx-auto group-hover:scale-105 transition-transform duration-500" />
              </div>
            </div>
          ))}
        </div>

        {/* Extra features grid */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {extraFeatures.map((f, i) => (
            <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#03A9F4]/30 hover:bg-[#03A9F4]/5 transition-all duration-200 text-center group">
              <i className={`${f.icon} text-[#03A9F4] text-2xl mb-2 block group-hover:scale-110 transition-transform`} />
              <p className="text-white text-sm sm:text-xs font-semibold mb-1">{f.title}</p>
              <p className="text-[#666] text-sm sm:text-xs leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
