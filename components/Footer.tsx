import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { href: "/#about", label: "About" },
  { href: "/#PRODUCT", label: "Product" },
  { href: "/#USE", label: "How to Use" },
  { href: "/#Testimonials", label: "Testimonials" },
];

const productLinks = [
  { href: "/signup", label: "Get Started Free" },
  { href: "/login", label: "Sign In" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#0b0a0a] border-t border-[#111] pt-16 pb-8 overflow-hidden">
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/30 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3 w-fit">
              <Image src="/img/logo.png" alt="NFC ID" width={36} height={36} />
              <span className="text-white font-bold text-lg tracking-wider">
                NFC <span className="text-[#03a9f4]">ID</span>
              </span>
            </Link>
            <p className="text-[#444] text-sm leading-relaxed max-w-xs">
              The all-in-one platform for smart NFC connections. One tap, infinite possibilities.
            </p>
          </div>

          {/* Links */}
          <div>
            <h6 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Navigation</h6>
            <ul className="space-y-2 list-none p-0 m-0">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[#555] hover:text-[#03A9F4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Product */}
          <div>
            <h6 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Platform</h6>
            <ul className="space-y-2 list-none p-0 m-0">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[#555] hover:text-[#03A9F4] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h6 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Follow Us</h6>
            <div className="flex gap-3">
              {[
                { href: "https://www.facebook.com/kerlos.foudi", icon: "ri-facebook-fill", label: "Facebook" },
                { href: "https://www.instagram.com/kerlos_fouad", icon: "ri-instagram-line", label: "Instagram" },
              ].map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl border border-[#1e1e1e] bg-[#111] flex items-center justify-center text-[#555] hover:text-[#03a9f4] hover:border-[#03a9f4]/30 hover:bg-[#03a9f4]/5 transition-all duration-200"
                >
                  <i className={`${s.icon} text-base`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#111] pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-[#333] text-xs">
          <span>© 2026 NFC ID · All rights reserved.</span>
          <span>
            Made with <span className="text-[#03A9F4]">♥</span> by{" "}
            <a href="https://www.facebook.com/kerlos.foudi" className="text-[#555] hover:text-white transition-colors font-medium">
              KERLOS FOUAD
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
