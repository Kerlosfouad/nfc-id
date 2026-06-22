"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", icon: "ri-dashboard-line", label: "Overview" },
  { href: "/admin/customers", icon: "ri-user-smile-line", label: "Customers" },
  { href: "/admin/products", icon: "ri-shopping-bag-3-line", label: "Products" },
  { href: "/admin/orders", icon: "ri-archive-stack-line", label: "Orders" },
  { href: "/admin/geo", icon: "ri-map-pin-line", label: "Geo Map" },
  { href: "/admin/tags", icon: "ri-nfc-line", label: "NFC Tags" },
  { href: "/admin/moderation", icon: "ri-shield-check-line", label: "Moderation" },
];

export function AdminChrome({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0b0a0a] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none hero-grid opacity-50" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-[#2c2c2c] bg-black/70 backdrop-blur-xl lg:block">
        <div className="px-6 py-6">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/img/logo.png" alt="NFC ID" width={42} height={42} className="group-hover:drop-shadow-[0_0_10px_#03A9F4] transition-all" />
            <span className="text-xl font-bold tracking-wider">
              NFC <span className="text-[#03A9F4]">ID</span>
            </span>
          </Link>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm uppercase tracking-wider transition-all ${
                  active
                    ? "bg-[#03A9F4] text-white shadow-[0_0_24px_rgba(3,169,244,0.25)]"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                <i className={`${item.icon} text-lg`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#03A9F4]/20 bg-[#03A9F4]/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/35">Medal scan link</p>
          <p className="mt-2 truncate font-mono text-xs text-[#03A9F4]">/scan/{"{medalId}"}</p>
        </div>
      </aside>

      <main className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#2c2c2c] bg-[#0b0a0a]/85 px-5 py-5 backdrop-blur-xl md:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#03A9F4]">Owner Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold uppercase md:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-white/40">{subtitle}</p>
            </div>
            <Link href="/dashboard" className="ml-auto boton-elegante boton-tow hidden sm:inline-flex">
              Client View
            </Link>
          </div>
        </header>

        <div className="px-5 py-8 md:px-8">{children}</div>
      </main>
    </div>
  );
}

