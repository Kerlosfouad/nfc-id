"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminLoadingScreen, EmptyState, MetricCard, Panel } from "../_components/AdminUi";

interface AdminOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  email: string | null;
  phone: string;
  secondaryPhone: string | null;
  address: string;
  apartment: string;
  country: string;
  city: string;
  notes: string | null;
  couponCode: string | null;
  subtotal: number;
  discount: number;
  shippingLabel: string;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    imageUrl: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
}

function money(value: number) {
  return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setToken(session.access_token);
      setUserId(session.user.id);
      const res = await fetch("/api/v1/admin/orders", {
        headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
      });
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data ?? []);
      } else {
        setError("Orders could not be loaded.");
      }
      setChecking(false);
    });
  }, [router]);

  async function exportOrders() {
    if (!token || !userId) return;
    const res = await fetch("/api/v1/admin/orders?format=csv", {
      headers: { Authorization: `Bearer ${token}`, "x-user-id": userId },
    });
    if (!res.ok) {
      setError("Export failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nfc-id-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteOrder(id: string) {
    if (!token || !userId) return;
    const res = await fetch(`/api/v1/admin/orders?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "x-user-id": userId },
    });
    if (!res.ok) {
      setError("Order could not be deleted.");
      return;
    }
    setOrders((current) => current.filter((order) => order.id !== id));
    setSelectedOrder((current) => (current?.id === id ? null : current));
  }

  async function deleteAllOrders() {
    if (!token || !userId || orders.length === 0) return;
    const confirmed = window.confirm("Delete all orders? This cannot be undone.");
    if (!confirmed) return;
    const res = await fetch("/api/v1/admin/orders?all=true", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "x-user-id": userId },
    });
    if (!res.ok) {
      setError("Orders could not be deleted.");
      return;
    }
    setOrders([]);
    setSelectedOrder(null);
  }

  if (checking) return <AdminLoadingScreen />;

  const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const units = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  return (
    <AdminChrome title="Orders" subtitle="Incoming shop orders, customer details, and fulfillment status.">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Orders" value={orders.length} icon="ri-archive-stack-line" hint="Total checkout submissions" />
        <MetricCard label="Units" value={units} icon="ri-shopping-bag-3-line" hint="Products requested by customers" />
        <MetricCard label="Revenue" value={money(revenue)} icon="ri-money-dollar-circle-line" hint="Before shipping collection" />
      </div>

      <div className="mt-5">
        <Panel
          title="Orders"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={deleteAllOrders}
                disabled={orders.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 text-xs font-bold uppercase tracking-wider text-red-100 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <i className="ri-delete-bin-6-line text-base" />
                Delete all
              </button>
              <button
                type="button"
                onClick={exportOrders}
                disabled={orders.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#03A9F4] px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <i className="ri-file-excel-2-line text-base" />
                Export Excel
              </button>
            </div>
          }
        >
          {error && <p className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
          {orders.length === 0 ? (
            <EmptyState
              icon="ri-archive-stack-line"
              title="No orders yet"
              body="When customers complete checkout from the shop, their orders will appear here and can be exported for fulfillment."
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const firstItem = order.items[0];
                return (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 transition-all hover:border-[#03A9F4]/35 hover:bg-white/[0.04]"
                  >
                    <button type="button" onClick={() => setSelectedOrder(order)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <img
                        src={firstItem?.imageUrl || "/img/logo.png"}
                        alt={firstItem?.productName || "Order product"}
                        className="h-14 w-14 shrink-0 rounded-xl bg-black object-contain p-2"
                      />
                      <div className="min-w-0">
                        <p className="font-bold">{order.customerName}</p>
                        <p className="mt-1 truncate text-xs text-white/40">
                          #{order.orderNumber} · {firstItem?.productName || "No product"} {firstItem ? `x${firstItem.quantity}` : ""}
                        </p>
                      </div>
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition-all hover:border-[#03A9F4]/40 hover:text-[#03A9F4]"
                        aria-label="View order details"
                      >
                        <i className="ri-eye-line text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-100 transition-all hover:bg-red-500 hover:text-white"
                        aria-label="Delete order"
                      >
                        <i className="ri-delete-bin-line text-base" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div
            className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 text-white shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#03A9F4]">Order #{selectedOrder.orderNumber}</p>
                <h2 className="mt-2 text-2xl font-bold">{selectedOrder.customerName}</h2>
                <p className="mt-1 text-xs text-white/40">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="text-2xl text-white/50 hover:text-white" aria-label="Close details">
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-bold uppercase">Customer</h3>
                <div className="mt-3 space-y-2 text-sm text-white/60">
                  <p>Name: <span className="text-white">{selectedOrder.customerName}</span></p>
                  <p>Phone: <span className="text-white">{selectedOrder.phone}</span></p>
                  {selectedOrder.secondaryPhone && <p>Second phone: <span className="text-white">{selectedOrder.secondaryPhone}</span></p>}
                  {selectedOrder.email && <p>Email: <span className="text-white">{selectedOrder.email}</span></p>}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-bold uppercase">Shipping</h3>
                <div className="mt-3 space-y-2 text-sm text-white/60">
                  <p>Country: <span className="text-white">{selectedOrder.country}</span></p>
                  <p>Governorate: <span className="text-white">{selectedOrder.city}</span></p>
                  <p>Address: <span className="text-white">{selectedOrder.address}</span></p>
                  <p>Apartment: <span className="text-white">{selectedOrder.apartment}</span></p>
                </div>
              </section>
            </div>

            <section className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-bold uppercase">Products</h3>
              <div className="mt-3 space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.imageUrl} alt={item.productName} className="h-14 w-14 rounded-xl bg-black object-contain p-2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.productName}</p>
                      <p className="mt-1 text-xs text-white/40">{money(item.unitPrice)} x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold">{money(item.lineTotal)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(selectedOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>{money(selectedOrder.discount)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{selectedOrder.shippingLabel}</span></div>
                <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-white"><span>Total</span><span>{money(selectedOrder.total)}</span></div>
              </div>
              {selectedOrder.notes && <p className="mt-4 rounded-xl border border-[#03A9F4]/20 bg-[#03A9F4]/10 p-3 text-sm text-[#b8ecff]">{selectedOrder.notes}</p>}
            </section>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => deleteOrder(selectedOrder.id)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 text-xs font-bold uppercase tracking-wider text-red-100 transition-all hover:bg-red-500 hover:text-white"
              >
                <i className="ri-delete-bin-line text-base" />
                Delete order
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminChrome>
  );
}
