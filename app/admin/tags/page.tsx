"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AdminChrome } from "../_components/AdminChrome";
import { EmptyState, Panel } from "../_components/AdminUi";

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
  const [pendingStates, setPendingStates] = useState<Record<string, TagState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setAuthToken(session.access_token);
      setUserId(session.user.id);

      const res = await fetch("/api/v1/admin/tags", {
        headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
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
    const newState = pendingStates[publicId];
    if (!newState || !authToken) return;
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
      setPendingStates((current) => {
        const next = { ...current };
        delete next[publicId];
        return next;
      });
      showToast(`Tag ${publicId} updated to ${newState}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    } finally {
      setSaving((s) => ({ ...s, [publicId]: false }));
    }
  }

  if (checking) {
    return <div className="min-h-screen bg-[#0b0a0a] text-white flex items-center justify-center">Verifying access...</div>;
  }

  return (
    <AdminChrome title="NFC Tags" subtitle="Search medals and manage lifecycle states.">
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-lg border px-4 py-3 text-sm ${
          toast.type === "success" ? "border-green-500/40 bg-green-500/10 text-green-300" : "border-red-500/40 bg-red-500/10 text-red-300"
        }`}>
          {toast.message}
        </div>
      )}

      <Panel title="Search Tags">
        <div className="grid gap-3 md:grid-cols-4">
          <input value={filterPublicId} onChange={(e) => setFilterPublicId(e.target.value)} placeholder="Public ID" className="custom-input" />
          <select value={filterState} onChange={(e) => setFilterState(e.target.value as TagState | "")} className="custom-input">
            <option value="">All states</option>
            {TAG_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <input value={filterOwnerId} onChange={(e) => setFilterOwnerId(e.target.value)} placeholder="Owner ID" className="custom-input" />
          <button onClick={searchTags} disabled={loading} className="boton-elegante boton-tow">
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </Panel>

      <div className="mt-6">
        <Panel title="Tag Results">
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          {tags.length === 0 ? (
            <EmptyState icon="ri-nfc-line" title="No tags found" body="Search results from the database will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-white/35">
                  <tr className="border-b border-white/10">
                    <th className="py-3 font-medium">Public ID</th>
                    <th className="py-3 font-medium">State</th>
                    <th className="py-3 font-medium">Owner ID</th>
                    <th className="py-3 font-medium">Created</th>
                    <th className="py-3 font-medium">Update</th>
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
                          <select
                            value={pendingStates[tag.publicId] ?? tag.state}
                            onChange={(e) => setPendingStates((current) => ({ ...current, [tag.publicId]: e.target.value as TagState }))}
                            className="rounded-lg border border-white/10 bg-black px-2 py-2 text-xs text-white"
                          >
                            {TAG_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                          </select>
                          <button
                            onClick={() => updateTagState(tag.publicId)}
                            disabled={saving[tag.publicId] || !pendingStates[tag.publicId] || pendingStates[tag.publicId] === tag.state}
                            className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                          >
                            {saving[tag.publicId] ? "Saving..." : "Save"}
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

