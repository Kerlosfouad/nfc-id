"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "../_components/AdminChrome";
import { EmptyState, Panel } from "../_components/AdminUi";

interface ProductRow {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
}

const blankProduct: Omit<ProductRow, "id"> = {
  name: "",
  description: "",
  priceLabel: "",
  imageUrl: "/img/id.png",
  badge: "",
  icon: "ri-shopping-bag-3-line",
  category: "General",
  isActive: true,
  displayOrder: 0,
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authToken, setAuthToken] = useState("");
  const [userId, setUserId] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [draft, setDraft] = useState<Omit<ProductRow, "id">>(blankProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      "x-user-id": userId,
    };
  }

  const loadProducts = useCallback(async (token: string, uid: string) => {
    const res = await fetch("/api/v1/admin/products", {
      headers: { Authorization: `Bearer ${token}`, "x-user-id": uid },
    });
    if (res.status === 403) {
      router.push("/dashboard");
      return;
    }
    if (res.ok) {
      const json = await res.json();
      setProducts(json.data ?? []);
    }
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setAuthToken(session.access_token);
      setUserId(session.user.id);
      await loadProducts(session.access_token, session.user.id);
      setChecking(false);
    });
  }, [loadProducts, router]);

  function editProduct(product: ProductRow) {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      description: product.description,
      priceLabel: product.priceLabel,
      imageUrl: product.imageUrl,
      badge: product.badge,
      icon: product.icon,
      category: product.category,
      isActive: product.isActive,
      displayOrder: product.displayOrder,
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(blankProduct);
    setError(null);
  }

  async function saveProduct() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editingId ? `/api/v1/admin/products/${editingId}` : "/api/v1/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Product save failed");
      await loadProducts(authToken, userId);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Product save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product from the shop?")) return;
    await fetch(`/api/v1/admin/products/${id}`, { method: "DELETE", headers: headers() });
    setProducts((current) => current.filter((product) => product.id !== id));
  }

  if (checking) return <div className="min-h-screen bg-[#0b0a0a] text-white flex items-center justify-center">Loading...</div>;

  return (
    <AdminChrome title="Products" subtitle="Control the products shown in the public shop page.">
      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <Panel title={editingId ? "Edit Product" : "Add Product"}>
          <div className="space-y-3">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Product name" className="custom-input" />
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" rows={3} className="custom-input resize-none" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={draft.priceLabel} onChange={(e) => setDraft({ ...draft, priceLabel: e.target.value })} placeholder="EGP 399" className="custom-input" />
              <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Category" className="custom-input" />
            </div>
            <input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="/img/id.png or https://..." className="custom-input" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} placeholder="Badge" className="custom-input" />
              <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="ri-icon" className="custom-input" />
              <input type="number" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} placeholder="Order" className="custom-input" />
            </div>
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span>Visible in shop</span>
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={saveProduct} disabled={saving || !draft.name || !draft.description || !draft.priceLabel || !draft.imageUrl} className="boton-elegante boton-tow flex-1">
                {saving ? "Saving..." : editingId ? "Save" : "Add"}
              </button>
              {editingId && <button onClick={resetForm} className="rounded-full border border-white/10 px-5 text-sm text-white/60">Cancel</button>}
            </div>
          </div>
        </Panel>

        <Panel title="Shop Products">
          {products.length === 0 ? (
            <EmptyState icon="ri-shopping-bag-3-line" title="No products yet" body="Add your first product here and it will appear on the public shop page." />
          ) : (
            <div className="grid gap-3">
              {products.map((product) => (
                <div key={product.id} className="grid gap-4 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[96px_1fr_auto] sm:items-center">
                  <div className="relative h-24 rounded-xl bg-white/5">
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold uppercase">{product.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${product.isActive ? "bg-green-400/10 text-green-300" : "bg-white/10 text-white/35"}`}>
                        {product.isActive ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-white/45">{product.description}</p>
                    <p className="mt-2 text-sm text-[#03A9F4]">{product.priceLabel} · {product.category}</p>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <button onClick={() => editProduct(product)} className="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20">Edit</button>
                    <button onClick={() => deleteProduct(product.id)} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AdminChrome>
  );
}
