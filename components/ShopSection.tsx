"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  salePriceLabel: string | null;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  discountLabel: string | null;
}

interface CartItem {
  product: ShopProduct;
  quantity: number;
}

function priceNumber(product: ShopProduct) {
  const label = product.salePriceLabel || product.priceLabel;
  const match = label.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function money(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;
}

function ProductCard({ product, onAdd, onBuyNow }: { product: ShopProduct; onAdd: () => void; onBuyNow: () => void }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition-all duration-300 hover:border-[#03A9F4]/40">
      <div className="absolute inset-0 bg-gradient-to-b from-[#03A9F4]/8 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative aspect-[5/3] overflow-hidden bg-[#070707]">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-[#03A9F4]/30 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#03A9F4] backdrop-blur-md">
          <i className={product.icon || "ri-shopping-bag-3-line"} />
          {product.badge || product.category}
        </div>
        {product.discountLabel && (
          <div className="absolute right-3 top-3 rounded-full bg-[#03A9F4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            {product.discountLabel}
          </div>
        )}
      </div>

      <div className="relative p-4 sm:p-5">
        <h3 className="mb-2 text-base font-bold uppercase text-white sm:text-lg">{product.name}</h3>
        <p className="line-clamp-2 min-h-[44px] text-sm leading-relaxed text-white/40">{product.description}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/25">Starting at</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              {product.salePriceLabel ? (
                <>
                  <span className="relative text-sm font-semibold text-white/35">
                    {product.priceLabel}
                    <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#03A9F4]" />
                  </span>
                  <span className="text-lg font-bold text-[#03A9F4]">{product.salePriceLabel}</span>
                </>
              ) : (
                <span className="text-lg font-bold text-[#03A9F4]">{product.priceLabel}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onBuyNow}
              className="inline-flex h-10 items-center rounded-full bg-white px-3.5 text-[11px] font-bold uppercase tracking-wider text-black transition-all duration-300 hover:bg-[#03A9F4] hover:text-white"
            >
              Buy Now
            </button>
            <button
              type="button"
              onClick={onAdd}
              aria-label={`Add ${product.name} to cart`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition-all hover:border-[#03A9F4]/50 hover:text-[#03A9F4]"
            >
              <i className="ri-shopping-cart-2-line text-lg" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ShopSection() {
  const router = useRouter();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + priceNumber(item.product) * item.quantity, 0),
    [cart],
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    let alive = true;
    const savedCart = window.localStorage.getItem("nfc-id-cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        window.localStorage.removeItem("nfc-id-cart");
      }
    }

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

  useEffect(() => {
    window.localStorage.setItem("nfc-id-cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(product: ShopProduct) {
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((items) =>
      items
        .map((item) => (item.product.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function goToCheckout() {
    if (cart.length === 0) return;
    setCartOpen(false);
    router.push("/checkout");
  }

  return (
    <section id="SHOP" className="relative overflow-hidden px-4 py-20 scroll-mt-24 sm:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/30 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-[260px] w-[520px] -translate-x-1/2 rounded-full bg-[#03A9F4]/8 blur-3xl" />

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[#03A9F4]/30 bg-[#03A9F4] text-white shadow-2xl shadow-[#03A9F4]/20 transition-transform hover:scale-105"
        aria-label="Open shopping cart"
      >
        <i className="ri-shopping-cart-2-line text-2xl" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-black">
            {itemCount}
          </span>
        )}
      </button>

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
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => addToCart(product)}
                onBuyNow={() => {
                  addToCart(product);
                  router.push("/checkout");
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={`fixed inset-0 z-50 bg-black/20 transition-opacity duration-300 ${
          cartOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setCartOpen(false)}
      >
          <aside
            className={`ml-auto flex h-full w-[86vw] max-w-[520px] flex-col border-l border-white/10 bg-[#0f0f0f] text-white shadow-2xl transition-transform duration-300 ease-out ${
              cartOpen ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <i className="ri-shopping-cart-2-line text-2xl text-[#03A9F4]" />
                <h3 className="text-xl font-bold">Shopping Cart</h3>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="text-2xl text-white/60 hover:text-white" aria-label="Close cart">
                <i className="ri-close-line" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <i className="ri-shopping-bag-line text-5xl text-white/20" />
                  <p className="mt-3 font-bold">Your cart is empty</p>
                  <p className="mt-1 text-sm text-white/40">Add a product to start checkout.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <img src={item.product.imageUrl} alt={item.product.name} className="h-20 w-20 rounded-xl bg-black object-contain p-2" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold">{item.product.name}</p>
                        <p className="mt-1 text-sm font-semibold text-[#03A9F4]">{money(priceNumber(item.product))}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="h-8 w-8 rounded-full border border-white/10 text-lg">
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="h-8 w-8 rounded-full border border-white/10 text-lg">
                            +
                          </button>
                          <button type="button" onClick={() => updateQuantity(item.product.id, 0)} className="ml-auto text-white/40 hover:text-red-300" aria-label="Remove item">
                            <i className="ri-delete-bin-line text-lg" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="border-t border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-white/45">Subtotal</span>
                <span className="text-lg font-bold">{money(subtotal)}</span>
              </div>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={goToCheckout}
                className="h-12 w-full rounded-full bg-white text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-[#03A9F4] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Checkout
              </button>
            </footer>
          </aside>
        </div>
    </section>
  );
}
