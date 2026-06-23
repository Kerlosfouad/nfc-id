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
            <button
              type="button"
              onClick={exportOrders}
              disabled={orders.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#03A9F4] px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <i className="ri-file-excel-2-line text-base" />
              Export Excel
            </button>
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
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-white/35">
                  <tr className="border-b border-white/10">
                    <th className="py-3 pr-4">Order</th>
                    <th className="py-3 pr-4">Customer</th>
                    <th className="py-3 pr-4">Products</th>
                    <th className="py-3 pr-4">Address</th>
                    <th className="py-3 pr-4">Total</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5 align-top">
                      <td className="py-4 pr-4">
                        <p className="font-bold text-[#03A9F4]">#{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-white/35">{new Date(order.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="font-semibold">{order.customerName}</p>
                        <p className="mt-1 text-xs text-white/45">{order.phone}</p>
                        {order.email && <p className="mt-1 text-xs text-white/35">{order.email}</p>}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <p key={item.id} className="text-xs text-white/55">
                              {item.productName} <span className="text-white">x{item.quantity}</span>
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="max-w-xs text-xs text-white/55">{order.address}</p>
                        <p className="mt-1 text-xs text-white/35">
                          {order.apartment}, {order.city}, {order.country}
                        </p>
                        {order.notes && <p className="mt-1 max-w-xs text-xs text-[#03A9F4]/80">{order.notes}</p>}
                      </td>
                      <td className="py-4 pr-4 font-bold">{money(order.total)}</td>
                      <td className="py-4 pr-4">
                        <span className="rounded-full border border-[#03A9F4]/25 bg-[#03A9F4]/10 px-2.5 py-1 text-xs font-bold uppercase text-[#8ddfff]">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AdminChrome>
  );
}
