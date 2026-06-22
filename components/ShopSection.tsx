"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  discountLabel: string | null;
}

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#101010] transition-all duration-300 hover:border-[#03A9F4]/40">
      <div className="absolute inset-0 bg-gradient-to-b from-[#03A9F4]/8 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative aspect-[4/3] overflow-hidden bg-[#070707]">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-contain p-8 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[#03A9F4]/30 bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#03A9F4] backdrop-blur-md">
          <i className={product.icon || "ri-shopping-bag-3-line"} />
          {product.badge || product.category}
        </div>
        {product.discountLabel && (
          <div className="absolute right-4 top-4 rounded-full bg-[#03A9F4] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            {product.discountLabel}
          </div>
        )}
      </div>

      <div className="relative p-5 sm:p-6">
        <h3 className="mb-2 text-lg font-bold uppercase text-white sm:text-xl">{product.name}</h3>
        <p className="min-h-[64px] text-sm leading-relaxed text-white/40">{product.description}</p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/25">Starting at</p>
            <p className="text-lg font-bold text-[#03A9F4]">{product.priceLabel}</p>
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-all duration-300 hover:bg-[#03A9F4] hover:text-white"
          >
            Order
            <i className="ri-arrow-right-up-line" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ShopSection() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/v1/products?t=${Date.now()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed to load products");
        if (alive) setProducts(json.data ?? []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="SHOP" className="relative overflow-hidden px-4 py-20 scroll-mt-24 sm:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/30 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-[260px] w-[520px] -translate-x-1/2 rounded-full bg-[#03A9F4]/8 blur-3xl" />

      <div className="container relative z-10 mx-auto">
        <div className="mb-10 text-center sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#03A9F4]">
            NFC ID Shop
          </div>
          <h2 className="mb-4 text-3xl font-bold uppercase text-white sm:text-4xl md:text-5xl">Choose Your Smart Product</h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/40 md:text-base">
            Pick the NFC product that fits how your customers, clients, or followers meet you.
          </p>
        </div>

        {loading ? (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[410px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : error ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-red-400/20 bg-red-500/[0.06] p-8 text-center">
            <i className="ri-error-warning-line text-4xl text-red-300" />
            <h3 className="mt-4 text-xl font-bold uppercase text-white">Products could not load</h3>
            <p className="mt-2 text-sm text-red-100/70">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <i className="ri-shopping-bag-3-line text-4xl text-[#03A9F4]" />
            <h3 className="mt-4 text-xl font-bold uppercase text-white">No products available</h3>
            <p className="mt-2 text-sm text-white/40">Visible products added from the owner dashboard will appear here.</p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
