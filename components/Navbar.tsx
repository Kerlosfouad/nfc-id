"use client";
import { useState, useEffect, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function Navbar() {
  const { isArabic, toggleLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const links = [
    { href: "/#about", label: isArabic ? "من نحن" : "ABOUT" },
    { href: "/#PRODUCT", label: isArabic ? "المنتج" : "PRODUCT" },
    { href: "/shop", label: isArabic ? "المتجر" : "SHOP" },
    { href: "/#USE", label: isArabic ? "طريقة الاستخدام" : "HOW TO USE" },
    { href: "/#download", label: isArabic ? "التطبيق" : "APP" },
  ];
  const dashboardLabel = isArabic ? "لوحة التحكم" : "Dashboard";
  const ctaLabel = isArabic ? "ابدأ الآن" : "Get Started";

  return (
    <header className="flex justify-center items-center w-full px-4 sm:px-5 py-3 sm:py-5 fixed top-0 z-50">
      <nav
        className={`w-full max-w-[calc(100vw-32px)] sm:w-auto flex justify-center items-center rounded-[22px] border transition-all duration-300 ${
          scrolled
            ? "bg-black/60 backdrop-blur-xl border-[#03A9F4]/20 shadow-[0_0_30px_rgba(3,169,244,0.08)]"
            : "bg-white/[0.03] backdrop-blur-md border-[#2c2c2c]"
        }`}
      >
        <div className="w-full sm:w-auto flex items-center justify-between md:justify-center gap-3 md:gap-8 px-3.5 sm:px-5 py-2.5 md:py-3 min-h-[52px] md:min-h-0">
          {/* Logo */}
          <Link href="/" className="flex items-center group" aria-label="LinkUp home">
            <Image src="/img/linkup-nav-mark.png" alt="LinkUp" width={54} height={72} className="h-9 w-7 object-contain group-hover:drop-shadow-[0_0_8px_#03A9F4] transition-all duration-300" />
          </Link>

          {/* Desktop Links */}
          <ul className="hidden md:flex gap-8 list-none m-0 p-0">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`text-[#aaa] text-sm font-medium hover:text-white transition-all duration-200 relative group ${isArabic ? "font-[Cairo] tracking-normal" : "uppercase tracking-widest"}`}
                >
                  {l.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#03A9F4] group-hover:w-full transition-all duration-300 rounded-full" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className={`hidden h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/75 transition hover:border-[#03A9F4]/35 hover:text-white md:inline-flex ${isArabic ? "font-[Cairo]" : "uppercase tracking-wider"}`}
              aria-label={isArabic ? "Translate website to English" : "ترجمة الموقع إلى العربية"}
              title={isArabic ? "English" : "العربية"}
            >
              <i className="ri-translate-2" />
              {isArabic ? "EN" : "عربي"}
            </button>
            {isLoggedIn ? (
              <Link href="/dashboard" className="hidden md:block">
                <button className={`relative px-5 h-9 text-sm font-semibold rounded-full bg-[#03A9F4] text-white border border-[#03A9F4]/50 hover:bg-[#03A9F4]/80 hover:shadow-[0_0_20px_rgba(3,169,244,0.4)] transition-all duration-300 flex items-center gap-2 ${isArabic ? "font-[Cairo]" : "uppercase tracking-wider"}`}>
                  <i className="ri-dashboard-line" />
                  {dashboardLabel}
                </button>
              </Link>
            ) : (
              <Link href="/signup" className="hidden md:block">
                <button className={`relative px-5 h-9 text-sm font-semibold rounded-full bg-[#03A9F4] text-white border border-[#03A9F4]/50 hover:bg-[#03A9F4]/80 hover:shadow-[0_0_20px_rgba(3,169,244,0.4)] transition-all duration-300 ${isArabic ? "font-[Cairo]" : "uppercase tracking-wider"}`}>
                  {ctaLabel}
                </button>
              </Link>
            )}

            <button
              className="md:hidden flex flex-col justify-center gap-1.5 w-10 h-10 rounded-full border border-white/10 bg-white/5 cursor-pointer group items-center"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <span className="block h-[2px] w-5 bg-white rounded group-hover:bg-[#03A9F4] transition-colors" />
              <span className="block h-[2px] w-5 bg-white rounded group-hover:bg-[#03A9F4] transition-colors" />
              <span className="block h-[2px] w-5 bg-white rounded group-hover:bg-[#03A9F4] transition-colors" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div id="mobile-navigation" className={`mobile-menu ${menuOpen ? "show" : ""}`} aria-hidden={!menuOpen}>
        <button
          className={`absolute top-6 text-white text-4xl bg-transparent border-none cursor-pointer w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${isArabic ? "left-6" : "right-6"}`}
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          <i className="ri-close-line" aria-hidden="true" />
        </button>
        <ul className="mobile-menu-slides list-none text-center w-full p-0 m-0">
          {links.map((l, index) => (
            <li
              key={l.href}
              className="mobile-menu-slide w-full"
              style={
                {
                  "--slide-delay": menuOpen ? `${120 + index * 75}ms` : "0ms",
                  "--lead-delay": menuOpen ? `${540 + index * 75}ms` : "0ms",
                } as CSSProperties
              }
            >
              <Link
                href={l.href}
                className={`mobile-menu-link block text-white text-xl sm:text-3xl py-5 hover:text-[#03A9F4] hover:bg-[#03A9F4]/5 ${isArabic ? "font-[Cairo]" : "uppercase tracking-widest"}`}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li
            className="mobile-menu-slide pt-5"
            style={
              {
                "--slide-delay": menuOpen ? `${120 + links.length * 75}ms` : "0ms",
                "--lead-delay": menuOpen ? `${540 + links.length * 75}ms` : "0ms",
              } as CSSProperties
            }
          >
            <button
              type="button"
              onClick={toggleLanguage}
              className={`mb-4 inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-bold text-white/75 ${isArabic ? "font-[Cairo]" : "uppercase tracking-wider"}`}
            >
              <i className="ri-translate-2" />
              {isArabic ? "English" : "العربية"}
            </button>
            <br />
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} onClick={() => setMenuOpen(false)}>
              <button
                className={`mobile-menu-cta px-7 py-3 bg-[#03A9F4] text-white rounded-full text-sm font-semibold hover:shadow-[0_0_20px_rgba(3,169,244,0.5)] ${isArabic ? "font-[Cairo]" : "uppercase tracking-wider"}`}
              >
                {isLoggedIn ? dashboardLabel : ctaLabel}
              </button>
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
