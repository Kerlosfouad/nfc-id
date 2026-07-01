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

function orderUnits(order: AdminOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [accepting, setAccepting] = useState(false);

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
    const res = await fetch("/api/v1/admin/orders?format=xls", {
      headers: { Authorization: `Bearer ${token}`, "x-user-id": userId },
    });
    if (!res.ok) throw new Error("Export failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nfc-id-accepted-orders-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteAllOrders() {
    const res = await fetch("/api/v1/admin/orders?all=true&accept=true", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "x-user-id": userId },
    });
    if (!res.ok) throw new Error("Orders could not be cleared.");
  }

  async function acceptOrders() {
    if (!token || !userId || orders.length === 0 || accepting) return;
    setAccepting(true);
    setError("");
    try {
      await exportOrders();
      await deleteAllOrders();
      setOrders([]);
      setSelectedOrder(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Orders could not be accepted.");
    } finally {
      setAccepting(false);
    }
  }

  if (checking) return <AdminLoadingScreen />;

  const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const units = orders.reduce((sum, order) => sum + orderUnits(order), 0);

  return (
    <AdminChrome title="Orders" subtitle="Incoming shop orders, customer details, and fulfillment status.">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Orders" value={orders.length} icon="ri-archive-stack-line" hint="Total checkout submissions" />
        <MetricCard label="Units" value={units} icon="ri-shopping-bag-3-line" hint="Products requested by customers" />
        <MetricCard label="Revenue" value={revenue} formatter={money} icon="ri-money-dollar-circle-line" hint="Before shipping collection" />
      </div>

      <div className="mt-5">
        <Panel
          title="Orders"
          action={
            <button
              type="button"
              onClick={acceptOrders}
              disabled={orders.length === 0 || accepting}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#03A9F4] px-5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <i className={accepting ? "ri-loader-4-line animate-spin text-base" : "ri-check-line text-base"} />
              {accepting ? "Accepting..." : "Accept"}
            </button>
          }
        >
          {error && <p className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
          {orders.length === 0 ? (
            <EmptyState
              icon="ri-archive-stack-line"
              title="No orders yet"
              body="When customers complete checkout from the shop, their orders will appear here."
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const firstItem = order.items[0];
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition-all hover:border-[#03A9F4]/35 hover:bg-white/[0.04]"
                  >
                    <img
                      src={firstItem?.imageUrl || "/img/logo.png"}
                      alt={firstItem?.productName || "Order product"}
                      className="h-14 w-14 shrink-0 rounded-xl bg-black object-contain p-2"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{order.customerName}</p>
                      <p className="mt-1 truncate text-xs text-white/40">
                        {orderUnits(order)} products · {money(order.total)}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60">
                      <i className="ri-eye-line text-base" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 pb-32 pt-6 backdrop-blur-sm lg:pb-6" onClick={() => setSelectedOrder(null)}>
          <div
            className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 text-white shadow-2xl sm:p-6"
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
          </div>
        </div>
      )}
    </AdminChrome>
  );
}
