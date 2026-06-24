"use client";
import { useEffect, useRef } from "react";

const testimonials = [
  { initial: "J", name: "James Wilson", role: "Software Engineer", text: "The smart keychain is a total lifesaver! I never lose my keys anymore, and the tracking app is incredibly precise and easy to use." },
  { initial: "S", name: "Sophia Reed", role: "Interior Designer", text: "I was worried it would be bulky, but the design is so sleek. It's more than a gadget; it's a stylish accessory that fits my daily look." },
  { initial: "M", name: "Marcus Chen", role: "Digital Nomad", text: "The separation alert feature saved me from leaving my keys behind at the airport. Essential for anyone who travels frequently!" },
  { initial: "E", name: "Emma Thompson", role: "Business Consultant", text: "Best gift I've bought for myself this year. The battery lasts for months and it pairs instantly with my phone. Highly recommended!" },
];

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="bg-[#121212] border border-[#222] rounded-[15px] p-4 sm:p-5 w-[min(330px,calc(100vw-40px))] sm:w-[min(350px,calc(100vw-40px))] mr-4 sm:mr-5 flex-shrink-0 hover:border-[#444] hover:bg-[#1a1a1a] transition-colors">
      <div className="flex items-center mb-3">
        <div className="w-11 h-11 bg-[#03A9F4] rounded-full flex items-center justify-center text-white font-bold">
          {t.initial}
        </div>
        <div className="ml-3">
          <h6 className="text-[#03A9F4] text-sm sm:text-base font-semibold mb-0">{t.name}</h6>
          <small className="text-gray-500">{t.role}</small>
        </div>
      </div>
      <p className="text-white text-xs sm:text-sm leading-relaxed">&quot;{t.text}&quot;</p>
    </div>
  );
}

export default function Testimonials() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    [row1Ref, row2Ref].forEach((ref) => {
      if (ref.current) {
        const content = ref.current.innerHTML;
        ref.current.innerHTML = content + content + content;
      }
    });
  }, []);

  return (
    <section id="Testimonials" className="py-14 sm:py-20 overflow-hidden">
      <div className="px-4">
        <h1 className="text-white text-3xl sm:text-4xl font-bold uppercase mb-7 sm:mb-12 container mx-auto leading-tight">Testimonials</h1>
        <div className="testimonial-wrapper">
          <div className="marquee-container mb-4">
            <div ref={row1Ref} className="marquee-content scroll-left">
              {testimonials.slice(0, 2).map((t, i) => <TestimonialCard key={i} t={t} />)}
            </div>
          </div>
          <div className="marquee-container">
            <div ref={row2Ref} className="marquee-content scroll-right">
              {testimonials.slice(2).map((t, i) => <TestimonialCard key={i} t={t} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
