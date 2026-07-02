"use client";

import { useEffect, useState } from "react";

const steps = [
  {
    title: "Tap",
    desc: "Tap your LinkUp device on any NFC-enabled smartphone.",
    icon: "ri-wifi-line",
  },
  {
    title: "Connect",
    desc: "The phone instantly opens your live profile or selected destination.",
    icon: "ri-user-line",
  },
  {
    title: "Share",
    desc: "Share contacts, links, leads, and updates without changing the card.",
    icon: "ri-check-line",
  },
];

export default function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % steps.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="USE" className="relative overflow-hidden px-4 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(3,169,244,0.16),transparent_24rem),linear-gradient(180deg,transparent,rgba(3,169,244,0.045),transparent)]" />
      <div className="container relative z-10 mx-auto">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-5xl">
            How <span className="text-[#03A9F4]">LinkUp</span> Works
          </h2>
          <p className="mt-4 text-sm text-white/58 sm:text-base">Get connected in 3 simple steps.</p>
        </div>

        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/8 bg-[#03080d]/70 px-6 py-10 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:px-10 md:py-14">
          <div className="flex flex-col items-center gap-0 md:flex-row md:items-start md:justify-between">
            {steps.map((step, index) => {
              const isActive = activeIndex === index;
              const isPassed = activeIndex >= index;

              return (
                <div key={step.title} className="contents md:flex md:items-start">
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    className="group relative flex w-full max-w-[250px] flex-col items-center text-center md:w-[250px] md:shrink-0"
                  >
                    <span
                      className={`absolute -left-1 top-0 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition duration-700 md:left-[18%] ${
                        isPassed
                          ? "bg-[#0d5bd6] text-white shadow-[0_0_28px_rgba(3,169,244,0.65)]"
                          : "bg-[#102037] text-white/48 shadow-none"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <span
                      className={`relative flex h-24 w-24 items-center justify-center rounded-[1.35rem] border transition duration-700 sm:h-28 sm:w-28 ${
                        isActive
                          ? "border-[#03A9F4] bg-[#041728] text-[#03A9F4] shadow-[0_0_42px_rgba(3,169,244,0.38)]"
                          : "border-[#0c3350] bg-[#071018] text-[#164966] opacity-80 group-hover:border-[#03A9F4]/50 group-hover:text-[#03A9F4]"
                      }`}
                    >
                      <i className={`${step.icon} text-5xl ${isActive ? "workflow-icon-pulse" : ""}`} />
                    </span>

                    <h3 className={`mt-6 text-xl font-bold transition duration-700 ${isActive ? "text-white" : "text-white/78"}`}>
                      {step.title}
                    </h3>
                    <p className={`mt-3 max-w-[220px] text-sm leading-6 transition duration-700 ${isActive ? "text-white/72" : "text-white/45"}`}>
                      {step.desc}
                    </p>
                  </button>

                  {index < steps.length - 1 ? (
                    <>
                      <div className="relative mx-auto flex h-10 w-px items-center justify-center md:hidden">
                        <div className="h-full border-l border-dashed border-white/18" />
                        <div
                          className={`absolute top-0 h-full border-l border-dashed border-[#03A9F4] transition-all duration-700 ${
                            activeIndex > index ? "opacity-100" : "opacity-0"
                          }`}
                        />
                      </div>
                      <div className="relative hidden h-28 min-w-[110px] flex-1 items-center justify-center px-5 md:flex">
                        <div className="h-px w-full border-t border-dashed border-white/18" />
                        <div
                          className={`absolute left-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[#03A9F4] transition-all duration-700 ${
                            activeIndex > index ? "w-full opacity-100" : "w-0 opacity-0"
                          }`}
                        />
                        <i className={`ri-arrow-right-line absolute right-1 text-xl transition duration-700 ${activeIndex > index ? "text-[#03A9F4]" : "text-white/18"}`} />
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
