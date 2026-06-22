"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminLoadingScreen, EmptyState, Panel } from "../_components/AdminUi";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<unknown[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
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
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) return <AdminLoadingScreen />;

  return (
    <AdminChrome title="Orders" subtitle="Incoming orders and fulfillment status.">
      <Panel title="Orders">
        {orders.length === 0 ? (
          <EmptyState
            icon="ri-archive-stack-line"
            title="Order database is not configured yet"
            body="This page is wired to a server API. Add Order tables next, then paid and pending orders will appear here dynamically."
          />
        ) : null}
      </Panel>
    </AdminChrome>
  );
}
