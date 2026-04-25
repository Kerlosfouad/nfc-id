"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TagState = "MANUFACTURED" | "SOLD" | "CLAIMED" | "ACTIVE" | "SUSPENDED";

interface TagRow {
  publicId: string;
  state: TagState;
  ownerId: string | null;
  createdAt: string;
}

const TAG_STATES: TagState[] = ["MANUFACTURED", "SOLD", "CLAIMED", "ACTIVE", "SUSPENDED"];

const STATE_COLORS: Record<TagState, string> = {
  MANUFACTURED: "text-gray-400 bg-gray-400/10",
  SOLD: "text-blue-400 bg-blue-400/10",
  CLAIMED: "text-yellow-400 bg-yellow-400/10",
  ACTIVE: "text-green-400 bg-green-400/10",
  SUSPENDED: "text-red-400 bg-red-400/10",
};

export default function AdminTagsPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Search filters
  const [filterPublicId, setFilterPublicId] = useState("");
  const [filterState, setFilterState] = useState<TagState | "">("");
  const [filterOwnerId, setFilterOwnerId] = useState("");

  // Results
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-row pending state update
  const [pendingStates, setPendingStates] = useState<Record<string, TagState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Batch generate
  const [quantity, setQuantity] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      "x-user-id": userId ?? "",
    };
  }

  // ── Auth check ──────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      const res = await fetch("/api/v1/admin/tags?state=MANUFACTURED", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "x-user-id": session.user.id,
        },
      });
      if (res.status === 403) { router.push("/dashboard"); return; }
      setAuthToken(session.access_token);
      setUserId(session.user.id);
      setChecking(false);
    });
  }, [router]);

  // ── Search ──────────────────────────────────────────────────────────────

  const searchTags = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterPublicId) params.set("publicId", filterPublicId);
      if (filterState) params.set("state", filterState);
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

  // ── Update tag state ────────────────────────────────────────────────────

  async function updateTagState(publicId: string) {
    const newState = pendingStates[publicId];
    if (!newState) return;
    setSaving((s) => ({ ...s, [publicId]: true }));
    try {
      const res = await fetch(`/api/v1/admin/tags/${publicId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Update failed");
      }
      setTags((prev) =>
        prev.map((t) => (t.publicId === publicId ? { ...t, state: newState } : t))
      );
      setPendingStates((s) => { const n = { ...s }; delete n[publicId]; return n; });
      showToast(`Tag ${publicId} updated to ${newState}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setSaving((s) => ({ ...s, [publicId]: false }));
    }
  }

  // ── Batch generate ──────────────────────────────────────────────────────

  async function batchGenerate() {
    if (!authToken) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/v1/admin/tags/batch", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tags-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Generated ${quantity} tags — CSV downloaded`);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="bg-[#0b0a0a] min-h-screen text-white flex items-center justify-center">
        <span className="text-white/40">Verifying access…</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0a0a] min-h-screen text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-500/20 border border-green-500/40 text-green-300"
              : "bg-red-500/20 border border-red-500/40 text-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-white/50 hover:text-white transition-colors text-sm">
          ← Admin
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium">Tag Management</span>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Search */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Search Tags</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Public ID</label>
              <input
                type="text"
                value={filterPublicId}
                onChange={(e) => setFilterPublicId(e.target.value)}
                placeholder="e.g. abc123"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">State</label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value as TagState | "")}
                className="w-full bg-[#0b0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="">All states</option>
                {TAG_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Owner ID</label>
              <input
                type="text"
                value={filterOwnerId}
                onChange={(e) => setFilterOwnerId(e.target.value)}
                placeholder="UUID"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
          <button
            onClick={searchTags}
            disabled={loading}
            className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </section>

        {/* Results */}
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {tags.length > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-xs">
                    <th className="text-left px-4 py-3 font-medium">Public ID</th>
                    <th className="text-left px-4 py-3 font-medium">State</th>
                    <th className="text-left px-4 py-3 font-medium">Owner ID</th>
                    <th className="text-left px-4 py-3 font-medium">Created At</th>
                    <th className="text-left px-4 py-3 font-medium">Update State</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag) => (
                    <tr key={tag.publicId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{tag.publicId}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATE_COLORS[tag.state]}`}>
                          {tag.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-white/50 truncate max-w-[160px]">
                        {tag.ownerId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50">
                        {new Date(tag.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={pendingStates[tag.publicId] ?? tag.state}
                            onChange={(e) =>
                              setPendingStates((s) => ({
                                ...s,
                                [tag.publicId]: e.target.value as TagState,
                              }))
                            }
                            className="bg-[#0b0a0a] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-white/30"
                          >
                            {TAG_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => updateTagState(tag.publicId)}
                            disabled={
                              saving[tag.publicId] ||
                              !pendingStates[tag.publicId] ||
                              pendingStates[tag.publicId] === tag.state
                            }
                            className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors disabled:opacity-30"
                          >
                            {saving[tag.publicId] ? "…" : "Save"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && tags.length === 0 && !error && (
          <p className="text-white/30 text-sm text-center py-4">
            Use the search form above to find tags.
          </p>
        )}

        {/* Batch Generate */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Batch Generate Tags</h2>
          <p className="text-xs text-white/40">
            Generate new tags in MANUFACTURED state and download as CSV.
          </p>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Quantity (1–10,000)</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(10000, Math.max(1, Number(e.target.value))))}
                className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              onClick={batchGenerate}
              disabled={generating}
              className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate & Download CSV"}
            </button>
          </div>
          {genError && <p className="text-red-400 text-xs">{genError}</p>}
        </section>
      </main>
    </div>
  );
}
