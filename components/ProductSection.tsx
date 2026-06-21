"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect } from "react";

function Badge({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-[#0a0e16]/90 border border-[#03A9F4]/25 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_0_20px_rgba(3,169,244,0.1)] backdrop-blur-md whitespace-nowrap">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#03A9F4]/15 border border-[#03A9F4]/30 flex items-center justify-center flex-shrink-0">
        <i className={`${icon} text-[#03A9F4] text-xs sm:text-sm`} />
      </div>
      <div className="text-left">
        <div className="text-white text-xs sm:text-sm font-bold tracking-wide">{title}</div>
        <div className="text-[#03A9F4]/60 text-[11px] sm:text-xs">{desc}</div>
      </div>
    </div>
  );
}

export default function ProductSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const paths = sectionRef.current?.querySelectorAll<SVGPathElement>(".connector-path");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          paths?.forEach((p, i) => {
            const len = p.getTotalLength();
            p.style.strokeDasharray = String(len);
            p.style.strokeDashoffset = String(len);
            setTimeout(() => {
              p.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)";
              p.style.strokeDashoffset = "0";
            }, i * 250);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="PRODUCT" className="py-16 sm:py-24 px-5 sm:px-4 overflow-hidden" ref={sectionRef}>
      <div className="container mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 text-[#03A9F4] text-xs font-semibold uppercase tracking-widest mb-4">
          Beyond The Basics
        </div>
        <h1 className="text-white text-4xl sm:text-5xl font-bold uppercase mb-4">Our Product</h1>
        <p className="text-white/40 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-12">
          Smart NFC products built to make every first impression faster, cleaner, and easier to share.
        </p>

        <div className="relative mx-auto rounded-[28px] sm:rounded-[32px] border border-white/5 bg-white/[0.015] w-full max-w-[560px] min-h-[470px] sm:min-h-[500px]">
          <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 560 500" fill="none">
            <defs>
              <filter id="lg" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path className="connector-path" d="M 280 60 L 280 93" stroke="#03A9F4" strokeWidth="1.8" strokeLinecap="round" filter="url(#lg)" />
            <circle cx="280" cy="93" r="3.5" fill="#03A9F4" filter="url(#lg)" />
            <path className="connector-path" d="M 148 375 C 158 375 160 355 160 330" stroke="#03A9F4" strokeWidth="1.8" strokeLinecap="round" filter="url(#lg)" />
            <circle cx="160" cy="330" r="3.5" fill="#03A9F4" filter="url(#lg)" />
            <path className="connector-path" d="M 412 375 C 402 375 400 355 400 330" stroke="#03A9F4" strokeWidth="1.8" strokeLinecap="round" filter="url(#lg)" />
            <circle cx="400" cy="330" r="3.5" fill="#03A9F4" filter="url(#lg)" />
          </svg>

          <div className="absolute z-10" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <div className="relative">
              <div className="absolute inset-0 bg-[#03A9F4]/12 blur-3xl rounded-full scale-110" />
              <Image src="/img/id.png" alt="NFC ID Card" width={240} height={320} className="relative z-10 w-[190px] sm:w-[240px] h-auto drop-shadow-[0_0_35px_rgba(3,169,244,0.3)]" />
            </div>
          </div>

          <div className="absolute z-20 animate-float-top left-1/2 top-3 -translate-x-1/2 scale-[0.92] sm:scale-100">
            <Badge icon="ri-information-line" title="INFORMATION" desc="Smart data sharing" />
          </div>
          <div className="absolute z-20 animate-float-left left-1 sm:left-0 bottom-10 sm:bottom-[125px] scale-[0.86] sm:scale-100 origin-left">
            <Badge icon="ri-nfc-line" title="NFC" desc="Fast connection" />
          </div>
          <div className="absolute z-20 animate-float-right right-1 sm:right-0 bottom-10 sm:bottom-[125px] scale-[0.86] sm:scale-100 origin-right">
            <Badge icon="ri-palette-line" title="DESIGN" desc="Sleek and stylish" />
          </div>
        </div>

        <div className="mt-6">
          <Link href="/shop" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#03A9F4] text-white font-semibold uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_30px_rgba(3,169,244,0.4)] transition-all duration-300">
            <i className="ri-shopping-bag-line" />
            Shop Now
          </Link>
        </div>
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap text-xs text-white/35 uppercase tracking-widest">
          <span className="inline-flex items-center gap-1.5"><i className="ri-flashlight-line text-[#03A9F4]" /> Instant tap</span>
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span className="inline-flex items-center gap-1.5"><i className="ri-qr-code-line text-[#03A9F4]" /> QR ready</span>
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span className="inline-flex items-center gap-1.5"><i className="ri-shield-check-line text-[#03A9F4]" /> Profile control</span>
        </div>
      </div>
    </section>
  );
}
