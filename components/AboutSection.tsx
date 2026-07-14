"use client";

import Image from "next/image";
import AnimatedCounter from "./AnimatedCounter";
import { useLanguage } from "@/components/LanguageProvider";

const stats = [
  { icon: "ri-user-2-line", value: 12, suffix: "K+", label: "Active profiles", desc: "Creators, teams, and local brands" },
  { icon: "ri-qr-scan-2-line", value: 180, suffix: "K+", label: "Monthly taps", desc: "NFC and QR connections opened" },
  { icon: "ri-global-line", value: 18, suffix: "+", label: "Countries", desc: "Profiles shared across markets" },
  { icon: "ri-sim-card-2-line", value: 1, suffix: " Tap", label: "Live identity", desc: "Cards update without reprints" },
];

const insights = [
  "One editable profile for every device.",
  "Route taps to links, contacts, or leads.",
  "Update destinations without reprints.",
];

export default function AboutSection() {
  const { isArabic } = useLanguage();
  const localizedStats = isArabic
    ? [
        { icon: "ri-user-2-line", value: 12, suffix: "K+", label: "ملف نشط", desc: "صناع محتوى وفرق وعلامات محلية" },
        { icon: "ri-qr-scan-2-line", value: 180, suffix: "K+", label: "لمسة شهرية", desc: "اتصالات NFC وQR مفتوحة" },
        { icon: "ri-global-line", value: 18, suffix: "+", label: "دولة", desc: "ملفات تتم مشاركتها في أسواق مختلفة" },
        { icon: "ri-sim-card-2-line", value: 1, suffix: " لمسة", label: "هوية مباشرة", desc: "تتحدث البطاقات بدون طباعة جديدة" },
      ]
    : stats;
  const localizedInsights = isArabic
    ? ["ملف واحد قابل للتعديل لكل جهاز.", "وجّه اللمسات إلى روابط أو جهات اتصال أو عملاء محتملين.", "غيّر الوجهة بدون إعادة طباعة."]
    : insights;
  const marqueeItems = isArabic
    ? ["المس", "امسح", "شارك", "حدّث", "قس", "المس", "امسح", "شارك"]
    : ["Tap", "Scan", "Share", "Update", "Measure", "Tap", "Scan", "Share"];

  return (
    <section id="about" dir={isArabic ? "rtl" : "ltr"} className={`relative overflow-hidden px-4 py-20 scroll-mt-28 sm:py-28 ${isArabic ? "font-[Cairo]" : ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(3,169,244,0.12),transparent_24rem),radial-gradient(circle_at_78%_46%,rgba(3,169,244,0.08),transparent_28rem)]" />
      <div className="container relative z-10 mx-auto">
        <div className="grid-flow-dense grid gap-4 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#08090a] p-6 sm:p-9 lg:col-span-5">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="h-[2px] w-8 rounded-full bg-[#03A9F4]" />
              <span className={`text-[10px] font-semibold text-[#03A9F4] ${isArabic ? "" : "uppercase tracking-[0.22em]"}`}>{isArabic ? "من نحن" : "Who we are"}</span>
            </div>
            <h2 className="max-w-[760px] text-[clamp(2.8rem,5vw,5.4rem)] font-bold uppercase leading-[0.92] text-white">
              {isArabic ? "مصمم لهوية حية." : "Built for live identity."}
            </h2>
            <p className="mt-6 max-w-[520px] text-base leading-7 text-white/60 sm:text-lg">
              {isArabic ? "لمسة واحدة تفتح ملفك الحي وروابطك وجهاتك وحملاتك." : "One tap opens your live profile, links, leads, or campaign."}
            </p>

            <div className="mt-9 grid grid-cols-2 gap-3">
              {localizedStats.map((s) => (
                <div
                  key={s.label}
                  className="group relative min-h-[142px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition duration-500 hover:-translate-y-1 hover:border-[#03A9F4]/45 hover:bg-[#03A9F4]/[0.055]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[#03A9F4] transition duration-500 group-hover:border-[#03A9F4]/40">
                    <i className={`${s.icon} text-xl`} />
                  </div>
                  <div className="text-2xl font-bold text-[#03A9F4] sm:text-3xl">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </div>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-white">{s.label}</p>
                  <p className="mt-1 text-xs leading-5 text-white/48">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="group relative min-h-[560px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#070809] lg:col-span-4">
            <Image
              src="/assets/linkup/linkup-about-identity-scene.png"
              alt="LinkUp NFC card, tag, and phone profile scene"
              width={1536}
              height={1024}
              className="h-full w-full object-cover object-[64%_50%] opacity-90 transition duration-700 group-hover:scale-105"
              priority={false}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.64))]" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
              <p className={`text-sm font-semibold text-[#03A9F4] ${isArabic ? "" : "uppercase tracking-[0.18em]"}`}>{isArabic ? "ملف واحد" : "One profile"}</p>
              <p className="mt-2 text-2xl font-bold uppercase leading-tight text-white">{isArabic ? "نقاط تواصل مادية متعددة" : "Many physical touchpoints"}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:col-span-3">
            <div className="rounded-[1.5rem] border border-[#03A9F4]/20 bg-[#03A9F4]/10 p-6">
              <p className={`text-sm font-semibold text-[#03A9F4] ${isArabic ? "" : "uppercase tracking-[0.2em]"}`}>{isArabic ? "لماذا يهم؟" : "Why it matters"}</p>
              <p className="mt-5 text-3xl font-bold uppercase leading-none text-white">{isArabic ? "لا حاجة لإعادة الطباعة عند تغيير الوجهة." : "No reprint when the destination changes."}</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6">
              <div className="space-y-5">
                {localizedInsights.map((item, index) => (
                  <div key={item} className="flex gap-4">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#03A9F4]/35 text-xs font-bold text-[#03A9F4]">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-white/64">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black p-6">
              <div className="marquee-container text-[#03A9F4]">
                <div className="marquee-content scroll-left gap-8 text-sm font-bold uppercase tracking-[0.28em]">
                  {marqueeItems.map((item, index) => (
                    <span key={`${item}-${index}`}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
