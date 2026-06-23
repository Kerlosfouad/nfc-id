"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface ShopProduct {
  id: string;
  name: string;
  priceLabel: string;
  salePriceLabel: string | null;
  imageUrl: string;
}

interface CartItem {
  product: ShopProduct;
  quantity: number;
}

const emptyCheckout = {
  customerName: "",
  email: "",
  phone: "",
  secondaryPhone: "",
  address: "",
  apartment: "",
  country: "Egypt",
  city: "",
  notes: "",
  couponCode: "",
};

const egyptGovernorates = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Dakahlia",
  "Red Sea",
  "Beheira",
  "Fayoum",
  "Gharbia",
  "Ismailia",
  "Menofia",
  "Minya",
  "Qalyubia",
  "New Valley",
  "Suez",
  "Aswan",
  "Assiut",
  "Beni Suef",
  "Port Said",
  "Damietta",
  "Sharkia",
  "South Sinai",
  "Kafr El Sheikh",
  "Matrouh",
  "Luxor",
  "Qena",
  "North Sinai",
  "Sohag",
];

function priceNumber(product: ShopProduct) {
  const label = product.salePriceLabel || product.priceLabel;
  const match = label.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function money(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;
}

function egyptPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^(20|0)/, "");
  return digits ? `+20${digits}` : "";
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkout, setCheckout] = useState(emptyCheckout);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [loaded, setLoaded] = useState(false);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + priceNumber(item.product) * item.quantity, 0),
    [cart],
  );

  useEffect(() => {
    const savedCart = window.localStorage.getItem("nfc-id-cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        window.localStorage.removeItem("nfc-id-cart");
      }
    }
    setLoaded(true);
  }, []);

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setOrderMessage("");

    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: checkout.customerName,
          email: checkout.email.trim() || null,
          phone: egyptPhone(checkout.phone),
          secondaryPhone: checkout.secondaryPhone.trim() ? egyptPhone(checkout.secondaryPhone) : null,
          address: checkout.address,
          apartment: checkout.apartment,
          country: checkout.country,
          city: checkout.city,
          notes: checkout.notes.trim() || null,
          couponCode: checkout.couponCode.trim() || null,
          items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Order could not be created");
      window.localStorage.removeItem("nfc-id-cart");
      setCart([]);
      setCheckout(emptyCheckout);
      setOrderMessage(`Order #${json.data.orderNumber} received. We will contact you to confirm shipping.`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Order could not be created");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0a0a] text-white">
      <Navbar />
      <div
        className={`fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-all duration-300 ${
          orderMessage ? "translate-y-0 opacity-100" : "-translate-y-4 pointer-events-none opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-[#03A9F4]/30 bg-[#03A9F4] px-5 py-3 text-center text-sm font-bold text-white shadow-2xl shadow-[#03A9F4]/25">
          {orderMessage}
        </div>
      </div>
      <section className="relative overflow-hidden px-4 pb-20 pt-28">
        <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-[#03A9F4]/30 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-24 h-[320px] w-[520px] rounded-full bg-[#03A9F4]/8 blur-3xl" />

        <div className="container relative z-10 mx-auto">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#03A9F4]">NFC ID Checkout</p>
              <h1 className="mt-2 text-3xl font-bold uppercase sm:text-4xl">Complete Your Order</h1>
            </div>
            <Link href="/shop" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-bold uppercase tracking-wider text-white/70 transition-all hover:border-[#03A9F4]/40 hover:text-[#03A9F4]">
              <i className="ri-arrow-left-line" />
              Back to shop
            </Link>
          </div>

          {loaded && cart.length === 0 && !orderMessage ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <i className="ri-shopping-bag-line text-5xl text-[#03A9F4]" />
              <h2 className="mt-4 text-xl font-bold uppercase">Your cart is empty</h2>
              <p className="mt-2 text-sm text-white/40">Add products from the shop before checkout.</p>
            </div>
          ) : (
            <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl lg:grid-cols-[1.2fr_0.8fr]">
              <form onSubmit={submitOrder} className="order-2 p-5 sm:p-7 lg:order-1">
                <h2 className="mb-5 text-xl font-bold uppercase">Contact information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="text-xs font-semibold text-white/60">Name *</span>
                    <input required value={checkout.customerName} onChange={(e) => setCheckout({ ...checkout, customerName: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#03A9F4]" placeholder="Enter your name" />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-xs font-semibold text-white/60">Email (Optional)</span>
                    <input type="email" value={checkout.email} onChange={(e) => setCheckout({ ...checkout, email: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#03A9F4]" placeholder="Enter your email" />
                  </label>
                  <label>
                    <span className="text-xs font-semibold text-white/60">Phone no. *</span>
                    <div className="mt-2 flex h-11 overflow-hidden rounded-xl border border-white/10 bg-black/30 focus-within:border-[#03A9F4]">
                      <span className="flex w-16 items-center justify-center border-r border-white/10 text-sm font-bold text-white">+20</span>
                      <input required inputMode="tel" value={checkout.phone} onChange={(e) => setCheckout({ ...checkout, phone: e.target.value.replace(/\D/g, "") })} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="100 000 0000" />
                    </div>
                  </label>
                  <label>
                    <span className="text-xs font-semibold text-white/60">Secondary phone no. (Optional)</span>
                    <div className="mt-2 flex h-11 overflow-hidden rounded-xl border border-white/10 bg-black/30 focus-within:border-[#03A9F4]">
                      <span className="flex w-16 items-center justify-center border-r border-white/10 text-sm font-bold text-white">+20</span>
                      <input inputMode="tel" value={checkout.secondaryPhone} onChange={(e) => setCheckout({ ...checkout, secondaryPhone: e.target.value.replace(/\D/g, "") })} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="100 000 0000" />
                    </div>
                  </label>
                </div>

                <h2 className="mb-5 mt-8 text-xl font-bold uppercase">Shipping information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="text-xs font-semibold text-white/60">Address *</span>
                    <input required value={checkout.address} onChange={(e) => setCheckout({ ...checkout, address: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#03A9F4]" placeholder="Enter your address" />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-xs font-semibold text-white/60">Apartment, suite, unit etc. *</span>
                    <input required value={checkout.apartment} onChange={(e) => setCheckout({ ...checkout, apartment: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#03A9F4]" placeholder="Enter your apartment, suite, unit etc." />
                  </label>
                  <label>
                    <span className="text-xs font-semibold text-white/60">Country *</span>
                    <input required value={checkout.country} onChange={(e) => setCheckout({ ...checkout, country: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#03A9F4]" />
                  </label>
                  <label>
                    <span className="text-xs font-semibold text-white/60">City/Governorate *</span>
                    <select required value={checkout.city} onChange={(e) => setCheckout({ ...checkout, city: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#03A9F4]">
                      <option value="">Select governorate</option>
                      {egyptGovernorates.map((governorate) => (
                        <option key={governorate} value={governorate}>
                          {governorate}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-xs font-semibold text-white/60">Notes to seller (Optional)</span>
                    <textarea value={checkout.notes} onChange={(e) => setCheckout({ ...checkout, notes: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:border-[#03A9F4]" placeholder="Enter your notes" />
                  </label>
                </div>

                {formError && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{formError}</p>}
                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="mt-5 h-12 w-full rounded-full bg-[#03A9F4] text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? "Sending Order..." : "Place Order"}
                </button>
              </form>

              <aside className="order-1 border-b border-white/10 bg-black/25 p-5 sm:p-7 lg:order-2 lg:border-b-0 lg:border-l">
                <h2 className="mb-5 text-xl font-bold uppercase">Order summary</h2>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="relative h-16 w-16 shrink-0 rounded-xl bg-black">
                        <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-contain p-2" />
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#03A9F4] px-1 text-[10px] font-bold">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{item.product.name}</p>
                        <p className="mt-1 text-xs text-white/35">SKU: {item.product.id.slice(0, 8)}</p>
                      </div>
                      <p className="text-sm font-bold">{money(priceNumber(item.product) * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-2">
                  <input value={checkout.couponCode} onChange={(e) => setCheckout({ ...checkout, couponCode: e.target.value })} className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#03A9F4]" placeholder="Enter coupon code" />
                  <button type="button" className="h-11 rounded-xl border border-white/10 px-4 text-xs font-bold uppercase text-white/60">
                    Apply
                  </button>
                </div>

                <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
                  <div className="flex justify-between text-white/50">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Discount</span>
                    <span>0 EGP</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Shipping</span>
                    <span>To be calculated</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-bold">
                    <span>Total</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <p className="text-right text-xs text-white/35">+Shipping</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
