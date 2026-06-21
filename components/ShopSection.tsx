import Image from "next/image";
import Link from "next/link";

const products = [
  {
    name: "NFC ID Card",
    desc: "A premium smart card for professionals, creators, and teams.",
    price: "EGP 399",
    image: "/img/id.png",
    badge: "Best Seller",
    icon: "ri-bank-card-line",
  },
  {
    name: "NFC Keychain",
    desc: "Tap-to-share convenience for daily use, events, and networking.",
    price: "EGP 299",
    image: "/img/keychain-with-phone.webp",
    badge: "Everyday",
    icon: "ri-key-2-line",
  },
  {
    name: "Business Bundle",
    desc: "Multiple smart IDs for your team with profile setup support.",
    price: "From EGP 999",
    image: "/img/product-main.webp",
    badge: "For Teams",
    icon: "ri-team-line",
  },
];

export default function ShopSection() {
  return (
    <section id="SHOP" className="relative py-24 px-4 overflow-hidden scroll-mt-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/30 to-transparent" />
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-[#03A9F4]/8 blur-3xl rounded-full pointer-events-none" />

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 text-[#03A9F4] text-xs font-semibold uppercase tracking-widest mb-4">
            NFC ID Shop
          </div>
          <h2 className="text-white text-4xl md:text-5xl font-bold uppercase mb-4">Choose Your Smart Product</h2>
          <p className="text-white/40 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Pick the NFC product that fits how your customers, clients, or followers meet you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {products.map((product) => (
            <article
              key={product.name}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#101010] hover:border-[#03A9F4]/40 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#03A9F4]/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative aspect-[4/3] bg-[#070707] overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#03A9F4]/30 bg-black/50 backdrop-blur-md text-[#03A9F4] text-[11px] font-semibold uppercase tracking-wider">
                  <i className={product.icon} />
                  {product.badge}
                </div>
              </div>

              <div className="relative p-6">
                <h3 className="text-white text-xl font-bold uppercase mb-2">{product.name}</h3>
                <p className="text-white/40 text-sm leading-relaxed min-h-[64px]">{product.desc}</p>

                <div className="flex items-center justify-between gap-4 mt-6">
                  <div>
                    <p className="text-white/25 text-xs uppercase tracking-widest">Starting at</p>
                    <p className="text-[#03A9F4] text-lg font-bold">{product.price}</p>
                  </div>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-[#03A9F4] hover:text-white transition-all duration-300"
                  >
                    Order
                    <i className="ri-arrow-right-up-line" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
