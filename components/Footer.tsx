"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const navLinks = [
  { href: "/#about", label: "About" },
  { href: "/#PRODUCT", label: "Product" },
  { href: "/#USE", label: "How to Use" },
  { href: "/#download", label: "App" },
];

const productLinks = [
  { href: "/signup", label: "Get Started Free" },
  { href: "/login", label: "Sign In" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Footer() {
  const { isArabic } = useLanguage();
  const localizedNavLinks = isArabic
    ? [
        { href: "/#about", label: "من نحن" },
        { href: "/#PRODUCT", label: "المنتج" },
        { href: "/#USE", label: "طريقة الاستخدام" },
        { href: "/#download", label: "التطبيق" },
      ]
    : navLinks;
  const localizedProductLinks = isArabic
    ? [
        { href: "/signup", label: "ابدأ مجانًا" },
        { href: "/login", label: "تسجيل الدخول" },
        { href: "/dashboard", label: "لوحة التحكم" },
      ]
    : productLinks;

  return (
    <footer dir={isArabic ? "rtl" : "ltr"} className={`relative bg-[#0b0a0a] border-t border-[#111] pt-16 pb-8 overflow-hidden ${isArabic ? "font-[Cairo]" : ""}`}>
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/30 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3 w-fit">
              <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={36} height={48} className="h-9 w-7 object-contain" />
              <span className="text-white font-bold text-lg tracking-wider">
                Link<span className="text-[#03a9f4]">Up</span>
              </span>
            </Link>
            <p className="text-white/65 text-sm leading-relaxed max-w-xs">
              {isArabic ? "هوية NFC ذكية من لمسة واحدة." : "Smart NFC identity in one tap."}
            </p>
          </div>

          {/* Links */}
          <div>
            <h6 className={`text-white text-xs font-semibold mb-4 ${isArabic ? "" : "uppercase tracking-widest"}`}>{isArabic ? "التنقل" : "Navigation"}</h6>
            <ul className="space-y-2 list-none p-0 m-0">
              {localizedNavLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/65 hover:text-[#03A9F4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Product */}
          <div>
            <h6 className={`text-white text-xs font-semibold mb-4 ${isArabic ? "" : "uppercase tracking-widest"}`}>{isArabic ? "المنصة" : "Platform"}</h6>
            <ul className="space-y-2 list-none p-0 m-0">
              {localizedProductLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/65 hover:text-[#03A9F4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h6 className={`text-white text-xs font-semibold mb-4 ${isArabic ? "" : "uppercase tracking-widest"}`}>{isArabic ? "تابعنا" : "Follow Us"}</h6>
            <div className="flex gap-3">
              {[
                { href: "https://www.facebook.com/kerlos.foudi", icon: "ri-facebook-fill", label: "Facebook" },
                { href: "https://www.instagram.com/kerlos_fouad", icon: "ri-instagram-line", label: "Instagram" },
              ].map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl border border-[#1e1e1e] bg-[#111] flex items-center justify-center text-white/65 hover:text-[#03a9f4] hover:border-[#03a9f4]/30 hover:bg-[#03a9f4]/5 transition-all duration-200"
                >
                  <i className={`${s.icon} text-base`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#111] pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-white/55 text-xs">
          <span>{isArabic ? "© 2026 LinkUp · جميع الحقوق محفوظة." : "© 2026 LinkUp · All rights reserved."}</span>
          <span>
            {isArabic ? "صنع بحب " : "Made with "}<span className="text-[#03A9F4]">♥</span>{isArabic ? " بواسطة " : " by "}
            <a href="https://www.facebook.com/kerlos.foudi" className="text-white/70 hover:text-white transition-colors font-medium">
              KERLOS FOUAD
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
