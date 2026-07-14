"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const steps = [
  {
    title: "Tap",
    eyebrow: "01",
    desc: "Hold LinkUp near an NFC phone.",
    icon: "ri-wifi-line",
    stat: "0.3s",
    statLabel: "read time",
  },
  {
    title: "Open",
    eyebrow: "02",
    desc: "The destination opens instantly.",
    icon: "ri-smartphone-line",
    stat: "No app",
    statLabel: "required",
  },
  {
    title: "Update",
    eyebrow: "03",
    desc: "Change the destination anytime.",
    icon: "ri-refresh-line",
    stat: "Live",
    statLabel: "editable",
  },
] as const;

export default function HowItWorks() {
  const { isArabic } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const localizedSteps = isArabic
    ? [
        { title: "المس", eyebrow: "01", desc: "قرّب LinkUp من هاتف يدعم NFC.", icon: "ri-wifi-line", stat: "0.3ث", statLabel: "وقت القراءة" },
        { title: "افتح", eyebrow: "02", desc: "تفتح الوجهة فورًا بدون خطوات إضافية.", icon: "ri-smartphone-line", stat: "بدون تطبيق", statLabel: "مطلوب" },
        { title: "حدّث", eyebrow: "03", desc: "غيّر الوجهة في أي وقت من لوحة التحكم.", icon: "ri-refresh-line", stat: "مباشر", statLabel: "قابل للتعديل" },
      ]
    : steps;
  const activeStep = localizedSteps[activeIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % localizedSteps.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [localizedSteps.length]);

  return (
    <section id="USE" className={`relative overflow-hidden px-4 py-20 sm:py-28 ${isArabic ? "font-[Cairo]" : ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(3,169,244,0.18),transparent_24rem),linear-gradient(180deg,transparent,rgba(3,169,244,0.04),transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#03A9F4]/8 blur-[130px]" />

      <div className="container relative z-10 mx-auto">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#03A9F4] sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#20E7FF] shadow-[0_0_12px_rgba(32,231,255,0.8)]" />
            {isArabic ? "طريقة الاستخدام" : "How to use"}
          </div>
          <h2 className="text-balance text-[clamp(2.4rem,6vw,5.4rem)] font-black leading-[0.94] tracking-normal text-white">
            {isArabic ? "لمسة واحدة. هويتك أصبحت مباشرة." : "Tap once. Your identity is live."}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
            {isArabic ? "قطعة مادية تفتح الوجهة الرقمية الصحيحة فورًا." : "A physical object that opens the right digital destination."}
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <div className="relative min-h-[430px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#03080d] shadow-[0_32px_110px_rgba(0,0,0,0.42)] sm:min-h-[520px]">
            <Image
              src="/assets/linkup/connect-nfc-phone-card.png"
              alt="A LinkUp NFC card being tapped near a phone"
              fill
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-cover opacity-82"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,13,0.18),rgba(3,8,13,0.18)_42%,rgba(3,8,13,0.88)),radial-gradient(circle_at_48%_44%,transparent,rgba(0,0,0,0.42)_72%)]" />

            <div className="absolute left-5 right-5 top-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/38 px-4 py-3 backdrop-blur-xl">
              <span className={`text-[10px] font-bold text-white/58 ${isArabic ? "" : "uppercase tracking-[0.2em]"}`}>{isArabic ? "تشغيل مباشر" : "Live trigger"}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#03A9F4]/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#20E7FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20E7FF]" />
                {activeStep.stat}
              </span>
            </div>

            <div className="absolute bottom-5 left-5 right-5">
              <div className="max-w-sm rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#03A9F4]/35 bg-[#03A9F4]/12 text-[#20E7FF]">
                    <i className={`${activeStep.icon} text-2xl workflow-icon-pulse`} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">{activeStep.statLabel}</p>
                    <h3 className="text-2xl font-black text-white">{activeStep.title}</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/64">{activeStep.desc}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {localizedSteps.map((step, index) => {
              const isActive = activeIndex === index;

              return (
                <button
                  key={step.title}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative grid min-h-[128px] grid-cols-[auto_1fr] gap-4 rounded-[1.35rem] border p-4 text-left transition duration-500 sm:min-h-[150px] sm:gap-5 sm:p-6 ${isArabic ? "text-right" : ""} ${
                    isActive
                      ? "border-[#03A9F4]/45 bg-[#041522] shadow-[0_0_42px_rgba(3,169,244,0.16)]"
                      : "border-white/10 bg-white/[0.025] hover:border-[#03A9F4]/25 hover:bg-white/[0.045]"
                  }`}
                  aria-pressed={isActive}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-lg transition duration-500 sm:h-14 sm:w-14 ${
                      isActive
                        ? "border-[#03A9F4]/50 bg-[#03A9F4]/14 text-[#20E7FF]"
                        : "border-white/10 bg-black/20 text-white/42 group-hover:text-[#20E7FF]"
                    }`}
                  >
                    <i className={step.icon} />
                  </span>

                  <span className="min-w-0">
                    <span className="flex items-start justify-between gap-4">
                      <span>
                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#03A9F4]/80">{step.eyebrow}</span>
                        <span className="mt-1 block text-2xl font-black text-white sm:text-3xl">{step.title}</span>
                      </span>
                      <span className={`hidden rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] sm:inline-flex ${isActive ? "bg-[#03A9F4] text-white" : "bg-white/[0.06] text-white/38"}`}>
                        {step.stat}
                      </span>
                    </span>
                    <span className="mt-3 block max-w-xl text-sm leading-6 text-white/56 sm:text-base sm:leading-7">{step.desc}</span>
                  </span>

                  <span
                    className={`absolute bottom-0 left-4 right-4 h-px origin-left bg-[#03A9F4] transition-transform duration-700 sm:left-6 sm:right-6 ${
                      isActive ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
