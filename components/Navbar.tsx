"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const links = [
    { href: "/#about", label: "ABOUT" },
    { href: "/#PRODUCT", label: "PRODUCT" },
    { href: "/#USE", label: "HOW TO USE" },
    { href: "/#Testimonials", label: "TESTIMONIALS" },
  ];

  return (
    <header className="flex justify-center items-center w-full px-5 py-5 fixed top-0 z-50">
      <nav
        className={`flex justify-center items-center rounded-[20px] border transition-all duration-300 ${
          scrolled
            ? "bg-black/60 backdrop-blur-xl border-[#03A9F4]/20 shadow-[0_0_30px_rgba(3,169,244,0.08)]"
            : "bg-white/[0.03] backdrop-blur-md border-[#2c2c2c]"
        }`}
      >
        <div className="flex items-center gap-8 px-5 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/img/logo.png" alt="NFC ID" width={36} height={36} className="group-hover:drop-shadow-[0_0_8px_#03A9F4] transition-all duration-300" />
            <span className="text-white font-bold text-lg tracking-wider hidden sm:block">
              NFC <span className="text-[#03A9F4]">ID</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <ul className="hidden md:flex gap-8 list-none m-0 p-0">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[#aaa] uppercase text-sm tracking-widest font-medium hover:text-white transition-all duration-200 relative group"
                >
                  {l.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#03A9F4] group-hover:w-full transition-all duration-300 rounded-full" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Right */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="hidden md:block">
                <button className="relative px-5 h-9 text-sm font-semibold rounded-full bg-[#03A9F4] text-white border border-[#03A9F4]/50 hover:bg-[#03A9F4]/80 hover:shadow-[0_0_20px_rgba(3,169,244,0.4)] transition-all duration-300 uppercase tracking-wider flex items-center gap-2">
                  <i className="ri-dashboard-line" />
                  Dashboard
                </button>
              </Link>
            ) : (
              <Link href="/signup" className="hidden md:block">
                <button className="relative px-5 h-9 text-sm font-semibold rounded-full bg-[#03A9F4] text-white border border-[#03A9F4]/50 hover:bg-[#03A9F4]/80 hover:shadow-[0_0_20px_rgba(3,169,244,0.4)] transition-all duration-300 uppercase tracking-wider">
                  Get Started
                </button>
              </Link>
            )}

            {/* Hamburger */}
            <button
              className="md:hidden flex flex-col justify-between w-6 h-[18px] cursor-pointer group"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="block h-[2px] bg-white rounded group-hover:bg-[#03A9F4] transition-colors" />
              <span className="block h-[2px] bg-white rounded w-4 group-hover:bg-[#03A9F4] transition-colors" />
              <span className="block h-[2px] bg-white rounded group-hover:bg-[#03A9F4] transition-colors" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? "show" : ""}`}>
        <button
          className="absolute top-6 right-6 text-white text-4xl bg-transparent border-none cursor-pointer w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>
        <ul className="list-none text-center w-full p-0 m-0">
          {links.map((l) => (
            <li key={l.href} className="w-full border-b border-white/5 last:border-0">
              <Link
                href={l.href}
                className="block text-white text-2xl uppercase tracking-widest py-5 hover:text-[#03A9F4] hover:bg-[#03A9F4]/5 transition-all duration-200"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="pt-6">
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} onClick={() => setMenuOpen(false)}>
              <button className="px-8 py-3 bg-[#03A9F4] text-white rounded-full font-semibold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(3,169,244,0.5)] transition-all">
                {isLoggedIn ? "Dashboard" : "Get Started"}
              </button>
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
