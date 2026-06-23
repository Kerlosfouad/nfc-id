"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const orbitFeatures = [
  {
    icon: "ri-nfc-line",
    title: "NFC Tap",
    desc: "Open your profile with one smooth tap.",
    className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  },
  {
    icon: "ri-qr-code-line",
    title: "QR Ready",
    desc: "Every medal is ready for instant QR scans.",
    className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  },
  {
    icon: "ri-shield-check-line",
    title: "Live Control",
    desc: "Update links and profile details anytime.",
    className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  },
  {
    icon: "ri-sparkling-line",
    title: "Premium Finish",
    desc: "A clean black medal built to look sharp.",
    className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  },
];

function FeatureNode({
  feature,
  active,
  onClick,
}: {
  feature: (typeof orbitFeatures)[number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute ${feature.className} flex items-center justify-center border border-[#03A9F4]/30 bg-[#07141c]/90 text-[#03A9F4] shadow-[0_0_22px_rgba(3,169,244,0.18)] backdrop-blur-xl transition-all duration-500 ease-out ${
        active
          ? "h-[74px] w-[210px] gap-3 rounded-2xl px-4 text-left sm:w-[250px]"
          : "h-14 w-14 rounded-full hover:scale-110 hover:border-[#03A9F4]/60"
      }`}
      aria-label={feature.title}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#03A9F4]/15 transition-all duration-500 ${active ? "h-10 w-10" : "h-full w-full"}`}>
        <i className={`${feature.icon} ${active ? "text-xl" : "text-2xl"}`} />
      </span>
      <span className={`min-w-0 overflow-hidden transition-all duration-500 ${active ? "max-w-[170px] opacity-100" : "max-w-0 opacity-0"}`}>
        <span className="block truncate text-sm font-bold uppercase tracking-wide text-white">{feature.title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[#8ddfff]/70">{feature.desc}</span>
      </span>
    </button>
  );
}

export default function ProductSection() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const paused = activeFeature !== null;

  return (
    <section id="PRODUCT" className="relative overflow-hidden px-4 py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/35 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#03A9F4]/10 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-35" />

      <div className="container relative z-10 mx-auto text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#03A9F4]">
          NFC ID Shop
        </div>
        <h2 className="mb-4 text-3xl font-bold uppercase text-white sm:text-5xl">Smart Medal, One Tap Away</h2>
        <p className="mx-auto mb-10 max-w-2xl text-sm leading-relaxed text-white/40 md:text-base">
          Tap a feature to pause the orbit and reveal what your NFC medal can do.
        </p>

        <div className="relative mx-auto flex min-h-[430px] w-full max-w-[780px] items-center justify-center sm:min-h-[560px]">
          <div className="product-orbit-glow absolute h-[280px] w-[280px] rounded-full sm:h-[430px] sm:w-[430px]" />
          <div className="absolute h-[220px] w-[220px] rounded-full border border-[#03A9F4]/20 shadow-[0_0_45px_rgba(3,169,244,0.08)] sm:h-[350px] sm:w-[350px]" />
          <div className="absolute h-[300px] w-[300px] rounded-full border border-[#03A9F4]/15 sm:h-[480px] sm:w-[480px]" />
          <div className="absolute h-[370px] w-[370px] rounded-full border border-white/5 sm:h-[590px] sm:w-[590px]" />

          <div className={`product-orbit product-orbit-slow absolute h-[300px] w-[300px] sm:h-[480px] sm:w-[480px] ${paused ? "product-orbit-paused" : ""}`}>
            {orbitFeatures.slice(0, 2).map((feature, index) => (
              <FeatureNode
                key={feature.title}
                feature={feature}
                active={activeFeature === index}
                onClick={() => setActiveFeature(activeFeature === index ? null : index)}
              />
            ))}
          </div>

          <div className={`product-orbit product-orbit-reverse absolute h-[240px] w-[240px] sm:h-[380px] sm:w-[380px] ${paused ? "product-orbit-paused" : ""}`}>
            {orbitFeatures.slice(2).map((feature, index) => {
              const featureIndex = index + 2;
              return (
                <FeatureNode
                  key={feature.title}
                  feature={feature}
                  active={activeFeature === featureIndex}
                  onClick={() => setActiveFeature(activeFeature === featureIndex ? null : featureIndex)}
                />
              );
            })}
          </div>

          <div className="relative z-20 flex h-[260px] w-[190px] items-center justify-center sm:h-[390px] sm:w-[280px]">
            <Image
              src="/img/medal-black.png"
              alt="Black NFC ID medal"
              width={520}
              height={860}
              className="h-full w-full object-contain drop-shadow-[0_0_36px_rgba(3,169,244,0.5)]"
              priority={false}
            />
          </div>
        </div>

        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#03A9F4] px-8 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(3,169,244,0.4)]">
            <i className="ri-shopping-bag-line" />
            Shop Now
          </Link>
          <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 px-8 text-sm font-bold uppercase tracking-wider text-white/70 transition-all hover:border-[#03A9F4]/40 hover:text-[#03A9F4]">
            <i className="ri-user-add-line" />
            Create Profile
          </Link>
        </div>
      </div>
    </section>
  );
}
