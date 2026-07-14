"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type ShowcaseSlide = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  label: string;
};

const showcaseSlides: ShowcaseSlide[] = [
  {
    id: "phone-tap",
    title: "Instant Profile Tap",
    caption: "Open your live profile from phone to NFC in one clean move.",
    imageUrl: "/assets/linkup/linkup-slider-phone-tap.png",
    label: "Tap Ready",
  },
  {
    id: "nfc-card",
    title: "Matte NFC Card",
    caption: "A premium black card made for meetings, events, and daily use.",
    imageUrl: "/assets/linkup/linkup-slider-nfc-card.png",
    label: "Black Edition",
  },
  {
    id: "key-tag",
    title: "Key Tag Access",
    caption: "Keep your LinkUp profile with your keys wherever you go.",
    imageUrl: "/assets/linkup/linkup-slider-key-tag.png",
    label: "Key Tag",
  },
  {
    id: "nfc-medal",
    title: "LinkUp Medal",
    caption: "A bold wearable NFC piece with the same instant profile magic.",
    imageUrl: "/assets/linkup/linkup-slider-medal.png",
    label: "Medal",
  },
];

export default function ProductSection() {
  const { isArabic } = useLanguage();
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const localizedSlides = isArabic
    ? [
        { ...showcaseSlides[0], title: "لمسة تفتح ملفك فورًا", caption: "افتح ملفك الحي من الهاتف إلى NFC بحركة واحدة.", label: "جاهز للمس" },
        { ...showcaseSlides[1], title: "بطاقة NFC مطفية", caption: "بطاقة سوداء فاخرة للاجتماعات والفعاليات والاستخدام اليومي.", label: "الإصدار الأسود" },
        { ...showcaseSlides[2], title: "ميدالية مفاتيح ذكية", caption: "احتفظ بملف LinkUp مع مفاتيحك أينما ذهبت.", label: "ميدالية مفاتيح" },
        { ...showcaseSlides[3], title: "ميدالية LinkUp", caption: "قطعة NFC قابلة للارتداء بنفس سرعة فتح الملف.", label: "ميدالية" },
      ]
    : showcaseSlides;
  const sliderSlides = [...localizedSlides, ...localizedSlides];

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || isInteracting) return;

    const interval = window.setInterval(() => {
      const nextLeft = slider.scrollLeft + 280;
      const halfway = slider.scrollWidth / 2;

      if (nextLeft >= halfway) {
        slider.scrollTo({ left: 0, behavior: "auto" });
      } else {
        slider.scrollBy({ left: 280, behavior: "smooth" });
      }
    }, 2400);

    return () => window.clearInterval(interval);
  }, [isInteracting, sliderSlides.length]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const slider = sliderRef.current;
    if (!slider) return;

    dragState.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: slider.scrollLeft,
    };
    slider.setPointerCapture(event.pointerId);
    setIsInteracting(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const slider = sliderRef.current;
    const drag = dragState.current;
    if (!slider || !drag.active) return;

    const walk = event.clientX - drag.startX;
    if (Math.abs(walk) > 6) drag.moved = true;
    slider.scrollLeft = drag.scrollLeft - walk;
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const slider = sliderRef.current;
    dragState.current.active = false;
    if (slider?.hasPointerCapture(event.pointerId)) {
      slider.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => setIsInteracting(false), 900);
  }

  return (
    <section id="PRODUCT" className={`relative overflow-hidden px-4 py-20 sm:py-28 ${isArabic ? "font-[Cairo]" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/35 to-transparent" />
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-25" />
      <div className="pointer-events-none absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-[#03A9F4]/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-28 bottom-20 h-[360px] w-[520px] rounded-full bg-cyan-400/7 blur-[110px]" />

      <div className="container relative z-10 mx-auto">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#03A9F4] sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#20E7FF] shadow-[0_0_12px_rgba(32,231,255,0.8)]" />
            {isArabic ? "متجر LinkUp" : "LinkUp Shop"}
          </div>

          <h2 className="text-balance text-[clamp(2.6rem,7vw,5.8rem)] font-black leading-[0.92] tracking-normal text-white">
            {isArabic ? "منتجات صنعت لهوية تفتح بلمسة واحدة" : "Gear made for one-tap identity"}
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
            {isArabic ? "بطاقات وميداليات وقطع ذكية تفتح ملفك الحي فورًا." : "Cards, medals, and tags that open your live profile."}
          </p>
        </div>

        <div className="relative mt-12 sm:mt-14">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0b0a0a] to-transparent sm:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0b0a0a] to-transparent sm:w-28" />

          <div
            ref={sliderRef}
            className="flex cursor-grab touch-pan-y snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[max(0px,calc((100vw-1160px)/2))] pb-4 active:cursor-grabbing sm:gap-5"
            onMouseEnter={() => setIsInteracting(true)}
            onMouseLeave={() => {
              dragState.current.active = false;
              setIsInteracting(false);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label="LinkUp shop showcase slider"
          >
            {sliderSlides.map((slide, index) => (
              <Link
                href="/shop"
                key={`${slide.id}-${index}`}
                className="group relative min-h-[390px] w-[76vw] max-w-[380px] shrink-0 snap-center overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#080b0e] shadow-[0_28px_90px_rgba(0,0,0,0.34)] transition-all duration-500 hover:-translate-y-1 hover:border-[#03A9F4]/45 sm:w-[330px] lg:w-[370px]"
                draggable={false}
                onClick={(event) => {
                  if (dragState.current.moved) event.preventDefault();
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(3,169,244,0.18),transparent_52%)] opacity-70" />
                <div className="relative h-[390px] overflow-hidden bg-black/45">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title}
                    fill
                    sizes="(min-width: 1024px) 370px, (min-width: 640px) 330px, 76vw"
                    className="h-full w-full select-none object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.08)_45%,rgba(8,11,14,0.88)),radial-gradient(circle_at_50%_22%,transparent,rgba(0,0,0,0.28)_68%)]" />
                  <div className="absolute left-4 top-4">
                    <span className="rounded-full border border-[#03A9F4]/25 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#20E7FF] backdrop-blur-md">
                      {slide.label}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="max-w-[15rem] text-2xl font-black uppercase leading-tight text-white">{slide.title}</h3>
                    <p className="mt-3 max-w-[17rem] text-sm leading-6 text-white/58">{slide.caption}</p>
                    <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/78 transition-colors duration-300 group-hover:text-[#20E7FF]">
                      {isArabic ? "ادخل المتجر" : "Enter the shop"}
                      <i className="ri-arrow-right-line text-base transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-9 flex justify-center">
          <Link href="/shop" className="group inline-flex h-[58px] min-w-[260px] items-center justify-center gap-3 rounded-full bg-[#03A9F4] px-8 text-sm font-black uppercase tracking-[0.18em] text-white transition-all duration-300 hover:bg-white hover:text-black hover:shadow-[0_0_34px_rgba(32,231,255,0.35)] active:scale-[0.98]">
            {isArabic ? "ادخل المتجر" : "Enter the Shop"}
            <i className="ri-arrow-right-line text-lg transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
