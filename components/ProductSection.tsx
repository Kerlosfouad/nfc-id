"use client";

import Image from "next/image";
import Link from "next/link";

const orbitFeatures = [
  {
    icon: "ri-nfc-line",
    title: "NFC Tap",
    desc: "Instant profile sharing",
    className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  },
  {
    icon: "ri-qr-code-line",
    title: "QR Ready",
    desc: "Scan from any phone",
    className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  },
  {
    icon: "ri-shield-check-line",
    title: "Control",
    desc: "Update anytime",
    className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  },
  {
    icon: "ri-palette-line",
    title: "Premium Look",
    desc: "Built for your brand",
    className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  },
];

function FeatureChip({ feature }: { feature: (typeof orbitFeatures)[number] }) {
  return (
    <div
      className={`absolute ${feature.className} flex w-[152px] items-center gap-2 rounded-2xl border border-[#03A9F4]/25 bg-[#07141c]/90 px-3 py-2 text-left shadow-[0_0_22px_rgba(3,169,244,0.16)] backdrop-blur-xl sm:w-[190px] sm:px-4 sm:py-3`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#03A9F4]/30 bg-[#03A9F4]/15 text-[#03A9F4] sm:h-9 sm:w-9">
        <i className={`${feature.icon} text-base`} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold uppercase tracking-wide text-white sm:text-sm">{feature.title}</span>
        <span className="block truncate text-[10px] text-[#8ddfff]/65 sm:text-xs">{feature.desc}</span>
      </span>
    </div>
  );
}

export default function ProductSection() {
  return (
    <section id="PRODUCT" className="relative overflow-hidden px-4 py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/35 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#03A9F4]/10 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-40" />

      <div className="container relative z-10 mx-auto text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#03A9F4]">
          NFC ID Shop
        </div>
        <h2 className="mb-4 text-3xl font-bold uppercase text-white sm:text-5xl">Smart Medal, One Tap Away</h2>
        <p className="mx-auto mb-10 max-w-2xl text-sm leading-relaxed text-white/40 md:text-base">
          A premium NFC product surrounded by everything your customer needs: tap, scan, update, and share.
        </p>

        <div className="relative mx-auto flex min-h-[430px] w-full max-w-[780px] items-center justify-center sm:min-h-[560px]">
          <div className="product-orbit-glow absolute h-[280px] w-[280px] rounded-full sm:h-[430px] sm:w-[430px]" />
          <div className="absolute h-[220px] w-[220px] rounded-full border border-[#03A9F4]/20 shadow-[0_0_45px_rgba(3,169,244,0.08)] sm:h-[350px] sm:w-[350px]" />
          <div className="absolute h-[300px] w-[300px] rounded-full border border-[#03A9F4]/15 sm:h-[480px] sm:w-[480px]" />
          <div className="absolute h-[370px] w-[370px] rounded-full border border-white/5 sm:h-[590px] sm:w-[590px]" />

          <div className="product-orbit product-orbit-slow absolute h-[300px] w-[300px] sm:h-[480px] sm:w-[480px]">
            {orbitFeatures.slice(0, 2).map((feature) => (
              <FeatureChip key={feature.title} feature={feature} />
            ))}
          </div>

          <div className="product-orbit product-orbit-reverse absolute h-[240px] w-[240px] sm:h-[380px] sm:w-[380px]">
            {orbitFeatures.slice(2).map((feature) => (
              <FeatureChip key={feature.title} feature={feature} />
            ))}
          </div>

          <div className="relative z-20 flex h-44 w-44 items-center justify-center rounded-[2rem] border border-[#03A9F4]/20 bg-[#071018]/80 shadow-[0_0_70px_rgba(3,169,244,0.22)] backdrop-blur-xl sm:h-64 sm:w-64">
            <div className="absolute inset-4 rounded-[1.5rem] border border-white/5 bg-gradient-to-br from-[#03A9F4]/18 via-transparent to-white/5" />
            <div className="absolute h-28 w-28 rounded-full bg-[#03A9F4]/25 blur-3xl sm:h-40 sm:w-40" />
            <Image
              src="/img/product-main.webp"
              alt="NFC ID medal"
              width={260}
              height={260}
              className="relative z-10 h-36 w-36 object-contain drop-shadow-[0_0_32px_rgba(3,169,244,0.45)] sm:h-52 sm:w-52"
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
