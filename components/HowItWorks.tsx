"use client";
import { useState } from "react";
import Image from "next/image";

const steps = [
  {
    num: "01",
    title: "Scan Your NFC Tag",
    desc: "Tap your NFC card or scan the QR code. You'll be instantly redirected to the claim flow.",
    img: "/img/1.webp",
    icon: "ri-nfc-line",
  },
  {
    num: "02",
    title: "Create Your Account",
    desc: "Sign up in seconds with email, Google, or Apple. Your tag is linked to your account automatically.",
    img: "/img/2.webp",
    icon: "ri-user-add-line",
  },
  {
    num: "03",
    title: "Build Your Profile",
    desc: "Add all your links — social media, website, WhatsApp, Spotify, YouTube, and more. Customize your theme.",
    img: "/img/3.webp",
    icon: "ri-links-line",
  },
  {
    num: "04",
    title: "Share Everywhere",
    desc: "Hand out your NFC card, share your link, or let people scan your QR. One tap to your entire digital world.",
    img: "/img/4.webp",
    icon: "ri-share-line",
  },
];

export default function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const toggle = (i: number) => setActiveIndex(activeIndex === i ? null : i);

  return (
    <section id="USE" className="py-14 sm:py-20 px-4">
      <div className="container mx-auto flex flex-col items-center">
        <div className="text-center mb-7 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 text-[#03A9F4] text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-4">
            Simple Setup
          </div>
          <h2 className="text-white text-3xl sm:text-4xl font-bold uppercase leading-tight">How It Works</h2>
          <p className="text-[#555] text-xs sm:text-sm mt-2 leading-relaxed">From tap to live profile in under 2 minutes</p>
        </div>

        <div className="w-full max-w-[520px] space-y-3">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`glass-card w-full ${activeIndex === i ? "active" : ""} cursor-pointer`}
              onClick={() => toggle(i)}
            >
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <span className="text-[#03A9F4]/40 text-xs font-mono font-bold">{s.num}</span>
                  <span className="text-[#03A9F4] text-sm sm:text-base font-semibold leading-tight">
                    {s.title}
                  </span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 border border-[#2c2c2c] bg-[#1a1a1a] rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className={`${s.icon} text-[#03A9F4] text-lg`} />
                </div>
              </div>
              <div className="card-body-content text-center">
                <p className="text-[#ccc] text-sm my-5 leading-relaxed">{s.desc}</p>
                <Image src={s.img} alt={s.title} width={200} height={200} className="rounded-xl mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
