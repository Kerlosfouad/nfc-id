"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSessionHeaders } from "@/lib/adminSessionClient";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminInlineLoading, EmptyState, Panel } from "../_components/AdminUi";

type TagState = "MANUFACTURED" | "SOLD" | "CLAIMED" | "ACTIVE" | "SUSPENDED";

interface TagRow {
  publicId: string;
  state: TagState;
  ownerId: string | null;
  createdAt: string;
}

const TAG_STATES: TagState[] = ["MANUFACTURED", "SOLD", "CLAIMED", "ACTIVE", "SUSPENDED"];

const STATE_COLORS: Record<TagState, string> = {
  MANUFACTURED: "text-gray-300 bg-gray-400/10",
  SOLD: "text-blue-300 bg-blue-400/10",
  CLAIMED: "text-yellow-300 bg-yellow-400/10",
  ACTIVE: "text-green-300 bg-green-400/10",
  SUSPENDED: "text-red-300 bg-red-400/10",
};

export default function AdminTagsPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [filterPublicId, setFilterPublicId] = useState("");
  const [filterState, setFilterState] = useState<TagState | "">("");
  const [filterOwnerId, setFilterOwnerId] = useState("");
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const searchTags = useCallback(async (stateOverride?: TagState | "") => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterPublicId) params.set("publicId", filterPublicId);
      const nextState = stateOverride ?? filterState;
      if (nextState) params.set("state", nextState);
      if (filterOwnerId) params.set("ownerId", filterOwnerId);

      const res = await fetch(`/api/v1/admin/tags?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}`, "x-user-id": userId ?? "" },
      });
      if (!res.ok) throw new Error("Failed to fetch tags");
      const json = await res.json();
      setTags(json.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [authToken, userId, filterPublicId, filterState, filterOwnerId]);

  useEffect(() => {
    getAdminSessionHeaders().then(async (session) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setAuthToken(session.accessToken);
      setUserId(session.userId);

      const res = await fetch("/api/v1/admin/tags", {
        headers: session.headers,
      });
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setTags(json.data ?? []);
      }
      setChecking(false);
    });
  }, [router]);

  async function updateTagState(publicId: string) {
    if (!authToken) return;
    const newState: TagState = "SUSPENDED";
    setSaving((s) => ({ ...s, [publicId]: true }));
    try {
      const res = await fetch(`/api/v1/admin/tags/${publicId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "x-user-id": userId ?? "",
        },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Update failed");
      }
      setTags((prev) => prev.map((tag) => (tag.publicId === publicId ? { ...tag, state: newState } : tag)));
      showToast(`NFC ${publicId} is now inactive`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setSaving((s) => ({ ...s, [publicId]: false }));
    }
  }

  async function copyNfcLink(publicId: string) {
    const baseUrl = window.location.origin;
    await navigator.clipboard.writeText(`${baseUrl}/${publicId}`);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 1600);
  }

  async function deleteTag(publicId: string) {
    if (!authToken) return;
    const ok = window.confirm(`Delete retired NFC ${publicId}? Linked customer profiles are protected and will not be deleted here.`);
    if (!ok) return;
    setSaving((s) => ({ ...s, [publicId]: true }));
    try {
      const res = await fetch(`/api/v1/admin/tags/${publicId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "x-user-id": userId ?? "",
        },
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Delete failed");
      }
      setTags((prev) => prev.filter((tag) => tag.publicId !== publicId));
      showToast(`NFC ${publicId} deleted`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setSaving((s) => ({ ...s, [publicId]: false }));
    }
  }

  if (checking) {
    return (
      <AdminChrome title="NFC" subtitle="Review linked medals, control status, and retire unused NFC codes.">
        <AdminInlineLoading />
      </AdminChrome>
    );
  }

  return (
    <AdminChrome title="NFC" subtitle="Review linked medals, control status, and retire unused NFC codes.">
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-lg border px-4 py-3 text-sm ${
          toast.type === "success" ? "border-green-500/40 bg-green-500/10 text-green-300" : "border-red-500/40 bg-red-500/10 text-red-300"
        }`}>
          {toast.message}
        </div>
      )}

      <Panel title="NFC Medals">
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-[#03A9F4]/20 bg-[#03A9F4]/10 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#03A9F4]/25 bg-black/25 text-[#03A9F4]">
            <i className="ri-qr-scan-2-line text-3xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Existing NFC medals</h2>
            <p className="mt-1 text-sm text-white/55">View saved medal codes, copy scan links, make medals inactive, or delete retired medals that are not linked to customer profiles.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {TAG_STATES.map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => { setFilterState(state); void searchTags(state); }}
              className={`rounded-xl border px-3 py-3 text-left transition ${filterState === state ? "border-[#03A9F4]/60 bg-[#03A9F4]/15" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}
            >
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATE_COLORS[state]}`}>{state}</span>
              <p className="mt-2 text-xs text-white/42">Filter medals</p>
            </button>
          ))}
        </div>
      </Panel>

      <div className="mt-6">
      <Panel title="Search Tags">
        <div className="grid gap-3 md:grid-cols-4">
          <input value={filterPublicId} onChange={(e) => setFilterPublicId(e.target.value)} placeholder="Public ID" className="custom-input" />
          <select value={filterState} onChange={(e) => setFilterState(e.target.value as TagState | "")} className="custom-input">
            <option value="">All states</option>
            {TAG_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <input value={filterOwnerId} onChange={(e) => setFilterOwnerId(e.target.value)} placeholder="Owner ID" className="custom-input" />
          <button onClick={() => void searchTags()} disabled={loading} className="boton-elegante boton-tow">
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </Panel>

      </div>

      <div className="mt-6">
        <Panel title="Database Tags">
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          {tags.length === 0 ? (
            <EmptyState icon="ri-qr-scan-2-line" title="No database tags found" body="Only NFC tags saved in the database appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-white/35">
                  <tr className="border-b border-white/10">
                    <th className="py-3 font-medium">Public ID</th>
                    <th className="py-3 font-medium">State</th>
                    <th className="py-3 font-medium">Owner ID</th>
                    <th className="py-3 font-medium">Created</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag) => (
                    <tr key={tag.publicId} className="border-b border-white/5 text-white/65">
                      <td className="py-4 font-mono text-xs text-[#03A9F4]">{tag.publicId}</td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs ${STATE_COLORS[tag.state]}`}>{tag.state}</span>
                      </td>
                      <td className="py-4 font-mono text-xs text-white/40">{tag.ownerId ?? "-"}</td>
                      <td className="py-4 text-white/40">{new Date(tag.createdAt).toLocaleDateString()}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyNfcLink(tag.publicId)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:text-white"
                            title="Copy scan link"
                          >
                            <i className={copiedId === tag.publicId ? "ri-check-line text-green-300" : "ri-file-copy-line"} />
                          </button>
                          <button
                            onClick={() => updateTagState(tag.publicId)}
                            disabled={saving[tag.publicId] || tag.state === "SUSPENDED"}
                            className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/15 disabled:opacity-35"
                          >
                            {saving[tag.publicId] ? "Saving..." : "Inactive"}
                          </button>
                          <button
                            onClick={() => deleteTag(tag.publicId)}
                            disabled={saving[tag.publicId]}
                            className="rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-400/15 disabled:opacity-35"
                          >
                            Delete
                          </button>
                        </div>
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
