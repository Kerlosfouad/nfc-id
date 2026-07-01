"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminChrome } from "../_components/AdminChrome";
import { AdminLoadingScreen, EmptyState, Panel } from "../_components/AdminUi";

interface CustomerRow {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  profiles: {
    id: string;
    publicId: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    primeDesignUntil: string | null;
    verifiedUntil: string | null;
    isSuspended: boolean;
    isActive: boolean;
    links: { title: string; url: string }[];
  }[];
  tags: {
    publicId: string;
    state: string;
  }[];
  _count: { tags: number; profiles: number };
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/v1/admin/customers", {
        headers: { Authorization: `Bearer ${session.access_token}`, "x-user-id": session.user.id },
      });
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      setAuthToken(session.access_token);
      setUserId(session.user.id);
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data ?? []);
      }
      setChecking(false);
    });
  }, [router]);

  function phoneFromLinks(profile: CustomerRow["profiles"][number]) {
    const phoneLink = profile.links.find((link) => /phone|whatsapp/i.test(link.title));
    return phoneLink?.url.replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com)\/(send\?phone=)?/i, "") ?? "No phone";
  }

  function expiryLabel(value: string | null) {
    if (!value) return "Inactive";
    const date = new Date(value);
    if (date.getTime() <= Date.now()) return "Expired";
    return `Until ${date.toLocaleDateString()}`;
  }

  function isActiveUntil(value: string | null) {
    return !!value && new Date(value).getTime() > Date.now();
  }

  function untilFromDays(profileId: string) {
    const days = Math.max(1, Number(durations[profileId] || 30));
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  async function updateProfileAccess(profileId: string, patch: { verifiedUntil?: string | null; primeDesignUntil?: string | null; verified?: boolean }) {
    if (!authToken) return;
    setBusyProfileId(profileId);
    try {
      const res = await fetch(`/api/v1/admin/profiles/${profileId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "x-user-id": userId ?? "",
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update profile access");
      const json = await res.json();
      setCustomers((current) =>
        current.map((customer) => ({
          ...customer,
          profiles: customer.profiles.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  isVerified: json.data?.isVerified ?? profile.isVerified,
                  verifiedUntil: json.data?.verifiedUntil ?? profile.verifiedUntil,
                  primeDesignUntil: json.data?.primeDesignUntil ?? profile.primeDesignUntil,
                }
              : profile
          ),
        }))
      );
    } finally {
      setBusyProfileId(null);
    }
  }

  if (checking) return <AdminLoadingScreen />;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleCustomers = normalizedSearch
    ? customers.filter((customer) => {
        const profileMatch = customer.profiles.some((profile) =>
          [profile.displayName, profile.publicId, profile.bio ?? ""].some((value) => value.toLowerCase().includes(normalizedSearch))
        );
        const tagMatch = customer.tags.some((tag) => tag.publicId.toLowerCase().includes(normalizedSearch));
        return customer.email.toLowerCase().includes(normalizedSearch) || profileMatch || tagMatch;
      })
    : customers;

  return (
    <AdminChrome title="Customers" subtitle="Registered users, owned medals, and public profile counts.">
      <Panel title="Customer Directory">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/35">Search customer or medal</label>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Customer name, email, profile code, or medal code"
              className="custom-input"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="self-end rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-white/65 hover:border-[#03A9F4]/40 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {customers.length === 0 ? (
          <EmptyState icon="ri-user-search-line" title="No customers yet" body="When users sign up, they will appear here automatically." />
        ) : visibleCustomers.length === 0 ? (
          <EmptyState icon="ri-search-line" title="No matching customers" body="Try another customer name, profile code, or NFC medal code." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleCustomers.map((customer) => (
              <article key={customer.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">{customer.email}</h3>
                    {customer.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {customer.tags.slice(0, 4).map((tag) => (
                          <span key={tag.publicId} className="rounded-md border border-[#03A9F4]/20 bg-[#03A9F4]/10 px-2 py-1 font-mono text-[10px] text-[#8ddfff]">
                            {tag.publicId}
                          </span>
                        ))}
                        {customer.tags.length > 4 && <span className="text-[10px] text-white/35">+{customer.tags.length - 4}</span>}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-white/35">
                      {customer.role} · {customer._count.tags} medals · {customer._count.profiles} profiles
                    </p>
                  </div>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {customer.profiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-white/30">No profiles</div>
                ) : (
                  <div className="space-y-3">
                    {customer.profiles.map((profile) => (
                      <div key={profile.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex gap-3">
                          {profile.avatarUrl ? (
                            <div className="h-14 w-14 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${profile.avatarUrl})` }} />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#03A9F4]/15 text-lg font-bold text-[#8ddfff]">
                              {profile.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold text-white">{profile.displayName}</p>
                              {isActiveUntil(profile.verifiedUntil) && <i className="ri-verified-badge-fill text-[#1877F2]" />}
                            </div>
                            <a href={`/profile/${profile.publicId}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-[#03A9F4]">
                              /profile/{profile.publicId}
                            </a>
                            <p className="mt-1 truncate text-xs text-white/35">{profile.bio || "No bio"}</p>
                            <div className="mt-2 grid gap-1 text-xs text-white/45">
                              <span>Email: <span className="text-white/70">{customer.email}</span></span>
                              <span>Phone: <span className="text-white/70">{phoneFromLinks(profile)}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 rounded-xl bg-black/20 p-3">
                          <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Activation duration</label>
                          <select
                            value={durations[profile.id] ?? "30"}
                            onChange={(event) => setDurations((current) => ({ ...current, [profile.id]: event.target.value }))}
                            className="rounded-lg border border-white/10 bg-[#0b0a0a] px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="180">180 days</option>
                            <option value="365">1 year</option>
                          </select>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {isActiveUntil(profile.primeDesignUntil) ? (
                              <button
                                onClick={() => updateProfileAccess(profile.id, { primeDesignUntil: null })}
                                disabled={busyProfileId === profile.id}
                                className="rounded-lg border border-yellow-300/30 bg-yellow-400/15 px-3 py-2 text-xs font-bold text-yellow-200 disabled:opacity-50"
                              >
                                {busyProfileId === profile.id ? "Saving..." : "Active Theme - cancel"}
                              </button>
                            ) : (
                              <button
                                onClick={() => updateProfileAccess(profile.id, { primeDesignUntil: untilFromDays(profile.id) })}
                                disabled={busyProfileId === profile.id}
                                className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-50"
                              >
                                {busyProfileId === profile.id ? "Saving..." : "Activate Theme Pro"}
                              </button>
                            )}
                            {isActiveUntil(profile.verifiedUntil) ? (
                              <button
                                onClick={() => updateProfileAccess(profile.id, { verifiedUntil: null, verified: false })}
                                disabled={busyProfileId === profile.id}
                                className="rounded-lg border border-[#1877F2]/35 bg-[#1877F2]/15 px-3 py-2 text-xs font-bold text-[#9dccff] disabled:opacity-50"
                              >
                                {busyProfileId === profile.id ? "Saving..." : "Active Verification - cancel"}
                              </button>
                            ) : (
                              <button
                                onClick={() => updateProfileAccess(profile.id, { verifiedUntil: untilFromDays(profile.id), verified: true })}
                                disabled={busyProfileId === profile.id}
                                className="rounded-lg bg-[#1877F2] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                {busyProfileId === profile.id ? "Saving..." : "Activate Verification"}
                              </button>
                            )}
                          </div>
                          <div className="grid gap-2 text-[11px] text-white/35 sm:grid-cols-2">
                            <span>Theme Pro: <b className="text-white/65">{expiryLabel(profile.primeDesignUntil)}</b></span>
                            <span>Verification: <b className="text-white/65">{expiryLabel(profile.verifiedUntil)}</b></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </AdminChrome>
  );
}
