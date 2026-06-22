"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminLoadingScreen, EmptyState, Panel } from "../_components/AdminUi";

interface ProductRow {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  discountLabel: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface CategoryRow {
  name: string;
  productCount: number;
}

const blankProduct: Omit<ProductRow, "id"> = {
  name: "",
  description: "",
  priceLabel: "",
  imageUrl: "",
  badge: "",
  icon: "ri-shopping-bag-3-line",
  category: "General",
  discountLabel: null,
  isActive: true,
  displayOrder: 0,
};

export default function AdminProductsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [checking, setChecking] = useState(true);
  const [authToken, setAuthToken] = useState("");
  const [userId, setUserId] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [draft, setDraft] = useState<Omit<ProductRow, "id">>(blankProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const authHeaders = useCallback((json = true) => ({
    ...(json ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${authToken}`,
    "x-user-id": userId,
  }), [authToken, userId]);

  const loadData = useCallback(async (token: string, uid: string) => {
    const headers = { Authorization: `Bearer ${token}`, "x-user-id": uid };
    const [productsRes, categoriesRes] = await Promise.all([
      fetch("/api/v1/admin/products", { headers }),
      fetch("/api/v1/admin/product-categories", { headers }),
    ]);
    if (productsRes.status === 403 || categoriesRes.status === 403) {
      router.push("/dashboard");
      return;
    }
    if (productsRes.ok) {
      const json = await productsRes.json();
      setProducts(json.data ?? []);
    }
    if (categoriesRes.ok) {
      const json = await categoriesRes.json();
      const rows = json.data ?? [];
      setCategories(rows.length ? rows : [{ name: "General", productCount: 0 }]);
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
      await loadData(session.access_token, session.user.id);
      setChecking(false);
    });
  }, [loadData, router]);

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
      discountLabel: product.discountLabel,
      isActive: product.isActive,
      displayOrder: product.displayOrder,
    });
    setUploadedFileName("");
  }

  function resetForm() {
    setEditingId(null);
    setDraft(blankProduct);
    setNewCategory("");
    setError(null);
    setUploadedFileName("");
  }

  async function createCategory() {
    const name = newCategory.trim();
    if (!name) return;
    const res = await fetch("/api/v1/admin/product-categories", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      await loadData(authToken, userId);
      setDraft((current) => ({ ...current, category: name }));
      setNewCategory("");
    }
  }

  async function uploadProductImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "product");
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        headers: authHeaders(false),
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Image upload failed");
      setDraft((current) => ({ ...current, imageUrl: json.url }));
      setUploadedFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveProduct() {
    setSaving(true);
    setError(null);
    try {
      const productPayload = {
        ...draft,
        discountLabel: draft.discountLabel?.trim() ? draft.discountLabel.trim() : null,
      };
      const res = await fetch(editingId ? `/api/v1/admin/products/${editingId}` : "/api/v1/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(productPayload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Product save failed");
      await loadData(authToken, userId);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Product save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product from the shop?")) return;
    await fetch(`/api/v1/admin/products/${id}`, { method: "DELETE", headers: authHeaders() });
    setProducts((current) => current.filter((product) => product.id !== id));
  }

  if (checking) return <AdminLoadingScreen />;

  return (
    <AdminChrome title="Products" subtitle="Add products, create sections, upload images, and control the public shop.">
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title={editingId ? "Edit Product" : "Upload Product"}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Product name</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="NFC Medal" className="custom-input" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Section</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="custom-input">
                  {categories.map((category) => (
                    <option key={category.name} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Price</label>
                <input value={draft.priceLabel} onChange={(e) => setDraft({ ...draft, priceLabel: e.target.value })} placeholder="EGP 399" className="custom-input" />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Create new section" className="custom-input" />
              <button onClick={createCategory} disabled={!newCategory.trim()} className="rounded-xl border border-[#03A9F4]/30 px-4 py-2 text-sm text-[#03A9F4] disabled:opacity-40">
                Add Section
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Description</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Short product description" rows={3} className="custom-input resize-none" />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Discount (optional)</label>
              <input value={draft.discountLabel ?? ""} onChange={(e) => setDraft({ ...draft, discountLabel: e.target.value || null })} placeholder="20% OFF or leave empty" className="custom-input" />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 overflow-hidden rounded-xl bg-black/30">
                  {draft.imageUrl ? (
                    <img src={draft.imageUrl} alt="" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/20">
                      <i className="ri-image-add-line text-2xl" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Product image</p>
                  <p className="mt-1 max-w-full truncate text-xs text-white/35" title={uploadedFileName || (draft.imageUrl ? "Image uploaded" : "No image uploaded")}>
                    {uploading ? "Uploading image..." : uploadedFileName || (draft.imageUrl ? "Image uploaded" : "No image uploaded")}
                  </p>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20 disabled:opacity-40">
                    {uploading ? "Uploading..." : "Upload Image"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProductImage(file); }} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
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
              <button onClick={saveProduct} disabled={saving || uploading || !draft.name || !draft.description || !draft.priceLabel || !draft.imageUrl} className="boton-elegante boton-tow flex-1">
                {saving ? "Saving..." : editingId ? "Save Product" : "Add Product"}
              </button>
              {editingId && <button onClick={resetForm} className="rounded-full border border-white/10 px-5 text-sm text-white/60">Cancel</button>}
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Sections">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category.name} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                  {category.name} · {category.productCount}
                </span>
              ))}
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
                        {product.discountLabel && <span className="rounded-full bg-[#03A9F4]/10 px-2 py-0.5 text-xs text-[#03A9F4]">{product.discountLabel}</span>}
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
      </div>
    </AdminChrome>
  );
}
