"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TasteGsapMotion() {
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const media = gsap.matchMedia();

    media.add("(min-width: 1024px)", () => {
      gsap.utils.toArray<HTMLElement>("[data-gsap-media]").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.86, opacity: 0.42, filter: "brightness(0.68)" },
          {
            scale: 1,
            opacity: 1,
            filter: "brightness(1)",
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              end: "bottom 18%",
              scrub: true,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-gsap-pin-title]").forEach((el) => {
        ScrollTrigger.create({
          trigger: el.parentElement ?? el,
          start: "top 12%",
          end: "bottom 62%",
          pin: el,
          pinSpacing: false,
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-gsap-stack]").forEach((section) => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-gsap-stack-card]", section);
        cards.forEach((card, index) => {
          gsap.fromTo(
            card,
            { y: 96 + index * 22, opacity: 0.2, scale: 0.94 },
            {
              y: index * -18,
              opacity: 1,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top 82%",
                end: "bottom 28%",
                scrub: true,
              },
            },
          );
        });
      });

      return () => ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    });

    return () => media.revert();
  }, []);

  return null;
}
