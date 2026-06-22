"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "../_components/AdminChrome";
import { EmptyState, Panel } from "../_components/AdminUi";

export default function AdminProductsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<unknown[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/v1/admin/products", {
        headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
      });
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data ?? []);
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) return <div className="min-h-screen bg-[#0b0a0a] text-white flex items-center justify-center">Loading...</div>;

  return (
    <AdminChrome title="Products" subtitle="Product catalog and category shelves.">
      <Panel title="Products">
        {products.length === 0 ? (
          <EmptyState
            icon="ri-shopping-bag-3-line"
            title="Product database is not configured yet"
            body="This page is wired to a server API. Add Product and Category tables next, and this section will render real catalog data."
          />
        ) : null}
      </Panel>
    </AdminChrome>
  );
}

