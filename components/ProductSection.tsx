"use client";
import Image from "next/image";
import { useRef, useEffect } from "react";

function Badge({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#0a0e16]/90 border border-[#03A9F4]/25 rounded-2xl px-4 py-3 shadow-[0_0_20px_rgba(3,169,244,0.1)] backdrop-blur-md whitespace-nowrap">
      <div className="w-8 h-8 rounded-xl bg-[#03A9F4]/15 border border-[#03A9F4]/30 flex items-center justify-center flex-shrink-0">
        <i className={`${icon} text-[#03A9F4] text-sm`} />
      </div>
      <div className="text-left">
        <div className="text-white text-sm font-bold tracking-wide">{title}</div>
        <div className="text-[#03A9F4]/60 text-xs">{desc}</div>
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
    <section id="PRODUCT" className="py-24 px-4" ref={sectionRef}>
      <div className="container mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 text-[#03A9F4] text-xs font-semibold uppercase tracking-widest mb-4">
          Beyond The Basics
        </div>
        <h1 className="text-white text-5xl font-bold uppercase mb-12">Our Product</h1>

        <div className="relative mx-auto" style={{ width: 560, height: 500, maxWidth: "100%" }}>
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
              <Image src="/img/id.png" alt="NFC ID Card" width={240} height={320} className="relative z-10 drop-shadow-[0_0_35px_rgba(3,169,244,0.3)]" />
            </div>
          </div>

          <div className="absolute z-20 animate-float-top" style={{ left: "50%", top: 14, transform: "translateX(-50%)" }}>
            <Badge icon="ri-information-line" title="INFORMATION" desc="Smart data sharing" />
          </div>
          <div className="absolute z-20 animate-float-left" style={{ left: 0, top: 355 }}>
            <Badge icon="ri-nfc-line" title="NFC" desc="Fast connection" />
          </div>
          <div className="absolute z-20 animate-float-right" style={{ right: 0, top: 355 }}>
            <Badge icon="ri-palette-line" title="DESIGN" desc="Sleek and stylish" />
          </div>
        </div>

        <div className="mt-6">
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#03A9F4] text-white font-semibold uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_30px_rgba(3,169,244,0.4)] transition-all duration-300">
            <i className="ri-shopping-bag-line" />
            Shop Now
          </button>
        </div>
      </div>
    </section>
  );
}
