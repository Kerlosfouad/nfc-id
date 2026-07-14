"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminSessionHeaders } from "@/lib/adminSessionClient";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminInlineLoading } from "../_components/AdminUi";

export const dynamic = 'force-dynamic';

type TicketStatus = "OPEN" | "RESOLVED" | "DISMISSED";
type SortBy = "reportCount" | "createdAt" | "owner";

interface ModerationTicket {
  id: string;
  profileId: string;
  reason: string;
  status: TicketStatus;
  createdAt: string;
  reportCount: number;
  ownerId?: string | null;
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "text-yellow-400 bg-yellow-400/10",
  RESOLVED: "text-green-400 bg-green-400/10",
  DISMISSED: "text-gray-400 bg-gray-400/10",
};

export default function AdminModerationPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [tickets, setTickets] = useState<ModerationTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("reportCount");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

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
    getAdminSessionHeaders().then(async (session) => {
      if (!session) { router.push("/login"); return; }
      const res = await fetch("/api/v1/admin/tags?state=MANUFACTURED", {
        headers: session.headers,
      });
      if (res.status === 403) { router.push("/dashboard"); return; }
      setAuthToken(session.accessToken);
      setUserId(session.userId);
      setChecking(false);
    });
  }, [router]);

  // ── Fetch tickets ───────────────────────────────────────────────────────

  const fetchTickets = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sortBy });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/v1/admin/moderation?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}`, "x-user-id": userId ?? "" },
      });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const json = await res.json();
      setTickets(json.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [authToken, userId, sortBy, statusFilter]);

  useEffect(() => {
    if (!checking) fetchTickets();
  }, [checking, fetchTickets]);

  // ── Actions ─────────────────────────────────────────────────────────────

  async function resolveTicket(id: string) {
    setActionLoading((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/v1/admin/moderation/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (!res.ok) throw new Error("Failed to resolve ticket");
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "RESOLVED" } : t))
      );
      showToast("Ticket resolved");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Action failed", "error");
    } finally {
      setActionLoading((s) => ({ ...s, [id]: false }));
    }
  }

  async function dismissTicket(id: string) {
    setActionLoading((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/v1/admin/moderation/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "DISMISSED" }),
      });
      if (!res.ok) throw new Error("Failed to dismiss ticket");
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "DISMISSED" } : t))
      );
      showToast("Ticket dismissed");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Action failed", "error");
    } finally {
      setActionLoading((s) => ({ ...s, [id]: false }));
    }
  }

  async function suspendProfile(ticket: ModerationTicket) {
    const key = `suspend-${ticket.id}`;
    setActionLoading((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch(`/api/v1/admin/profiles/${ticket.profileId}/suspend`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to suspend profile");
      showToast(`Profile ${ticket.profileId} suspended`);
      // Also resolve the ticket
      await resolveTicket(ticket.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Action failed", "error");
    } finally {
      setActionLoading((s) => ({ ...s, [key]: false }));
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <AdminChrome title="Moderation" subtitle="Review reported profiles and resolve safety issues.">
        <AdminInlineLoading />
      </AdminChrome>
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
        <span className="text-sm font-medium">Moderation Queue</span>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="bg-[#0b0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            >
              <option value="reportCount">Report Count</option>
              <option value="createdAt">Date</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "")}
              className="bg-[#0b0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            >
              <option value="">All</option>
              <option value="OPEN">OPEN</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>
          </div>
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Tickets table */}
        {tickets.length > 0 ? (
          <section className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-xs">
                    <th className="text-left px-4 py-3 font-medium">ID</th>
                    <th className="text-left px-4 py-3 font-medium">Profile ID</th>
                    <th className="text-left px-4 py-3 font-medium">Reason</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Reports</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const isOpen = ticket.status === "OPEN";
                    const busy = actionLoading[ticket.id] || actionLoading[`suspend-${ticket.id}`];
                    return (
                      <tr key={ticket.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-white/50 truncate max-w-[80px]">
                          {ticket.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-white/70 truncate max-w-[120px]">
                          {ticket.profileId}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[180px] truncate" title={ticket.reason}>
                          {ticket.reason}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[ticket.status]}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-center">{ticket.reportCount}</td>
                        <td className="px-4 py-3 text-xs text-white/50">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => resolveTicket(ticket.id)}
                              disabled={!isOpen || busy}
                              className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-2 py-1 rounded transition-colors disabled:opacity-30"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => dismissTicket(ticket.id)}
                              disabled={!isOpen || busy}
                              className="text-xs bg-white/5 hover:bg-white/10 text-white/60 px-2 py-1 rounded transition-colors disabled:opacity-30"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => suspendProfile(ticket)}
                              disabled={!isOpen || busy}
                              className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded transition-colors disabled:opacity-30"
                            >
                              Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          !loading && (
            <p className="text-white/30 text-sm text-center py-8">
              {statusFilter ? `No ${statusFilter} tickets found.` : "No tickets found."}
            </p>
          )
        )}
      </main>
    </div>
  );
}


