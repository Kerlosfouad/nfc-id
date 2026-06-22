import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { listProducts } from "@/lib/services/productCatalog";

export default async function ShopSection() {
  noStore();
  const products = await listProducts({ activeOnly: true }).catch(() => []);

  return (
    <section id="SHOP" className="relative py-20 sm:py-24 px-4 overflow-hidden scroll-mt-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/30 to-transparent" />
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-[#03A9F4]/8 blur-3xl rounded-full pointer-events-none" />

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 text-[#03A9F4] text-xs font-semibold uppercase tracking-widest mb-4">
            NFC ID Shop
          </div>
          <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold uppercase mb-4">Choose Your Smart Product</h2>
          <p className="text-white/40 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Pick the NFC product that fits how your customers, clients, or followers meet you.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <i className="ri-shopping-bag-3-line text-4xl text-[#03A9F4]" />
            <h3 className="mt-4 text-white text-xl font-bold uppercase">No products available</h3>
            <p className="mt-2 text-white/40 text-sm">Products added from the owner dashboard will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {products.map((product) => (
              <article
                key={product.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#101010] hover:border-[#03A9F4]/40 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#03A9F4]/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative aspect-[4/3] bg-[#070707] overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#03A9F4]/30 bg-black/50 backdrop-blur-md text-[#03A9F4] text-[11px] font-semibold uppercase tracking-wider">
                    <i className={product.icon} />
                    {product.badge || product.category}
                  </div>
                  {product.discountLabel && (
                    <div className="absolute top-4 right-4 rounded-full bg-[#03A9F4] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                      {product.discountLabel}
                    </div>
                  )}
                </div>

                <div className="relative p-5 sm:p-6">
                  <h3 className="text-white text-lg sm:text-xl font-bold uppercase mb-2">{product.name}</h3>
                  <p className="text-white/40 text-sm leading-relaxed min-h-[64px]">{product.description}</p>

                  <div className="flex items-center justify-between gap-4 mt-6">
                    <div>
                      <p className="text-white/25 text-xs uppercase tracking-widest">Starting at</p>
                      <p className="text-[#03A9F4] text-lg font-bold">{product.priceLabel}</p>
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
        )}
      </div>
    </section>
  );
}
