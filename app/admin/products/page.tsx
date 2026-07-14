"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSessionHeaders } from "@/lib/adminSessionClient";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminInlineLoading, EmptyState, Panel } from "../_components/AdminUi";

interface ProductRow {
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
  isActive: boolean;
  displayOrder: number;
  stockQuantity: number;
}

interface CategoryRow {
  name: string;
  productCount: number;
}

type Toast = { message: string; type: "success" | "error" };
type UploadState = "idle" | "uploading" | "ready" | "error";

const blankProduct: Omit<ProductRow, "id"> = {
  name: "",
  description: "",
  priceLabel: "",
  salePriceLabel: null,
  imageUrl: "",
  badge: "",
  icon: "ri-shopping-bag-3-line",
  category: "General",
  discountLabel: null,
  isActive: true,
  displayOrder: 0,
  stockQuantity: 0,
};

function formatPriceLabel(value: string | null | undefined) {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!match) return value?.trim() ?? "";
  return `${Number(match[0]).toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;
}

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
  const [toast, setToast] = useState<Toast | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function showToast(message: string, type: Toast["type"] = "success") {
    setToast({ message, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    getAdminSessionHeaders().then(async (session) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setAuthToken(session.accessToken);
      setUserId(session.userId);
      await loadData(session.accessToken, session.userId);
      setChecking(false);
    });
  }, [loadData, router]);

  function editProduct(product: ProductRow) {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      description: product.description,
      priceLabel: product.priceLabel,
      salePriceLabel: product.salePriceLabel,
      imageUrl: product.imageUrl,
      badge: String(product.stockQuantity ?? Number(product.badge) ?? 0),
      icon: product.icon,
      category: product.category,
      discountLabel: product.discountLabel,
      isActive: product.isActive,
      displayOrder: product.displayOrder,
      stockQuantity: product.stockQuantity ?? 0,
    });
    setUploadedFileName("");
    setUploadState(product.imageUrl ? "ready" : "idle");
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setDraft(blankProduct);
    setNewCategory("");
    setError(null);
    setUploadedFileName("");
    setUploadState("idle");
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
      showToast("Section added");
    } else {
      showToast("Section could not be added", "error");
    }
  }

  async function uploadProductImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      setUploadState("error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      setUploadState("error");
      return;
    }
    setUploading(true);
    setError(null);
    setUploadedFileName(file.name);
    setUploadState("uploading");
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
      setUploadState("ready");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Image upload failed";
      setError(message);
      setUploadState("error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveProduct() {
    setSaving(true);
    setError(null);
    try {
      const stockQuantity = Math.max(0, Number(draft.badge || draft.stockQuantity || 0));
      const productPayload = {
        ...draft,
        badge: String(stockQuantity),
        priceLabel: formatPriceLabel(draft.priceLabel),
        salePriceLabel: draft.salePriceLabel?.trim() ? formatPriceLabel(draft.salePriceLabel) : null,
        stockQuantity,
        icon: "ri-archive-stack-line",
        isActive: true,
        displayOrder: 0,
        discountLabel: null,
      };
      const res = await fetch(editingId ? `/api/v1/admin/products/${editingId}` : "/api/v1/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(productPayload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Product save failed");
      const savedProduct = json.data as ProductRow;
      setProducts((current) => {
        if (editingId) return current.map((product) => (product.id === savedProduct.id ? savedProduct : product));
        return [savedProduct, ...current];
      });
      await loadData(authToken, userId);
      resetForm();
      showToast(editingId ? "Product updated in shop" : "Product added to shop");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Product save failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product from the shop?")) return;
    const res = await fetch(`/api/v1/admin/products/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) {
      showToast("Product could not be deleted", "error");
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== id));
    showToast("Product deleted");
  }

  async function removeCategory(name: string, productCount: number) {
    if (productCount > 0) {
      showToast("Delete or move products in this section first", "error");
      return;
    }
    if (!confirm(`Delete ${name} section?`)) return;
    const res = await fetch(`/api/v1/admin/product-categories?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: authHeaders(false),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      showToast(json?.error?.message ?? "Section could not be deleted", "error");
      return;
    }
    await loadData(authToken, userId);
    if (draft.category === name) setDraft((current) => ({ ...current, category: "General" }));
    showToast("Section deleted");
  }

  if (checking) {
    return (
      <AdminChrome title="Products" subtitle="Manage shop products, categories, stock, and public availability.">
        <AdminInlineLoading />
      </AdminChrome>
    );
  }

  return (
    <AdminChrome title="Products" subtitle="Add products, create sections, upload images, and control the public shop.">
      {toast && (
        <div className="fixed left-1/2 top-5 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
          <div className={`flex items-center gap-3 rounded-full border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
            toast.type === "success"
              ? "border-[#03A9F4]/35 bg-[#07141c]/95 text-white"
              : "border-red-400/35 bg-[#1c0707]/95 text-red-100"
          }`}>
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
              toast.type === "success" ? "bg-[#03A9F4]/15 text-[#03A9F4]" : "bg-red-400/15 text-red-300"
            }`}>
              <i className={toast.type === "success" ? "ri-check-line" : "ri-error-warning-line"} />
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title={editingId ? "Edit Product" : "Upload Product"}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Product name</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="NFC Medal" className="custom-input" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Section</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="custom-input">
                  {categories.map((category) => (
                    <option key={category.name} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Original price</label>
                <input value={draft.priceLabel} onChange={(e) => setDraft({ ...draft, priceLabel: e.target.value })} placeholder="EGP 399" className="custom-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Sale price</label>
                <input value={draft.salePriceLabel ?? ""} onChange={(e) => setDraft({ ...draft, salePriceLabel: e.target.value || null })} placeholder="EGP 299" className="custom-input" />
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

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Product image</p>
                  <p className="mt-0.5 text-xs text-white/35">PNG, JPG, or WEBP up to 5MB</p>
                </div>
                {draft.imageUrl && (
                  <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-[11px] font-semibold text-green-300">
                    Uploaded
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="group grid w-full gap-3 rounded-2xl border border-dashed border-white/15 bg-black/25 p-3 text-left transition hover:border-[#03A9F4]/50 hover:bg-[#03A9F4]/5 disabled:cursor-wait disabled:opacity-60 sm:grid-cols-[112px_1fr]"
              >
                <div className="h-28 overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/5">
                  {draft.imageUrl ? (
                    <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/20">
                      <i className="ri-image-add-line text-3xl" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <i className={uploading ? "ri-loader-4-line animate-spin text-[#03A9F4]" : uploadState === "error" ? "ri-error-warning-line text-red-300" : "ri-upload-cloud-2-line text-[#03A9F4]"} />
                    {uploading ? "Uploading image..." : uploadState === "error" ? "Upload failed" : draft.imageUrl ? "Replace image" : "Upload image"}
                  </div>
                  <p className={`mt-2 max-w-full truncate text-xs ${uploadState === "error" ? "text-red-300" : "text-white/45"}`} title={error || uploadedFileName || (draft.imageUrl ? "Image uploaded" : "No image uploaded")}>
                    {uploadState === "error" ? error : uploadedFileName || (draft.imageUrl ? "Image ready for this product" : "Click to choose a product photo")}
                  </p>
                  <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 transition group-hover:bg-[#03A9F4] group-hover:text-white">
                    <i className="ri-folder-image-line" />
                    Browse
                  </span>
                </div>
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProductImage(file); }} />
              <div className="mt-3">
                <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Or paste image URL</label>
                <input
                  value={draft.imageUrl}
                  onChange={(e) => {
                    setDraft({ ...draft, imageUrl: e.target.value.trim() });
                    setUploadedFileName("");
                    setUploadState(e.target.value.trim() ? "ready" : "idle");
                    setError(null);
                  }}
                  placeholder="https://..."
                  className="custom-input"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-white/35">Stock badge</label>
              <input
                type="number"
                min={0}
                value={draft.badge}
                onChange={(e) => {
                  const value = String(Math.max(0, Number(e.target.value)));
                  setDraft({ ...draft, badge: value, stockQuantity: Number(value) });
                }}
                placeholder="Product stock count"
                className="custom-input"
              />
            </div>

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
                <span key={category.name} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-xs text-white/60">
                  <span>{category.name} · {category.productCount}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(category.name, category.productCount)}
                    disabled={category.name === "General"}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white/35 transition hover:bg-red-500/15 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-25"
                    aria-label={`Delete ${category.name} section`}
                    title={category.productCount > 0 ? "Delete or move products first" : category.name === "General" ? "General cannot be deleted" : "Delete section"}
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
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
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full rounded-xl object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold uppercase">{product.name}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#03A9F4]/20 bg-[#03A9F4]/10 px-2 py-0.5 text-xs font-semibold text-[#8ddfff]">
                          <i className="ri-archive-stack-line" />
                          {product.stockQuantity ?? Number(product.badge) ?? 0}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-white/45">{product.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        {product.salePriceLabel ? (
                          <>
                            <span className="relative text-white/35">
                              {formatPriceLabel(product.priceLabel)}
                              <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#03A9F4]" />
                            </span>
                            <span className="font-semibold text-[#03A9F4]">{formatPriceLabel(product.salePriceLabel)}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-[#03A9F4]">{formatPriceLabel(product.priceLabel)}</span>
                        )}
                        <span className="text-white/25">· {product.category}</span>
                      </div>
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
