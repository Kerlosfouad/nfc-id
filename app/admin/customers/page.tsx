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
    isVerified: boolean;
    isSuspended: boolean;
    isActive: boolean;
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

  async function toggleVerification(profileId: string, verified: boolean) {
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
        body: JSON.stringify({ verified }),
      });
      if (!res.ok) throw new Error("Failed to update verification");
      setCustomers((current) =>
        current.map((customer) => ({
          ...customer,
          profiles: customer.profiles.map((profile) =>
            profile.id === profileId ? { ...profile, isVerified: verified } : profile
          ),
        }))
      );
    } finally {
      setBusyProfileId(null);
    }
  }

  if (checking) return <AdminLoadingScreen />;

  return (
    <AdminChrome title="Customers" subtitle="Registered users, owned medals, and public profile counts.">
      <Panel title="Customer Directory">
        {customers.length === 0 ? (
          <EmptyState icon="ri-user-search-line" title="No customers yet" body="When users sign up, they will appear here automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-white/35">
                <tr className="border-b border-white/10">
                  <th className="py-3 font-medium">Email</th>
                  <th className="py-3 font-medium">Role</th>
                  <th className="py-3 font-medium">Medals</th>
                  <th className="py-3 font-medium">Profiles</th>
                  <th className="py-3 font-medium">Verification</th>
                  <th className="py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-white/5 text-white/65">
                    <td className="py-4 font-medium text-white">{customer.email}</td>
                    <td className="py-4">{customer.role}</td>
                    <td className="py-4">{customer._count.tags}</td>
                    <td className="py-4">{customer._count.profiles}</td>
                    <td className="py-4">
                      {customer.profiles.length === 0 ? (
                        <span className="text-white/25">No profiles</span>
                      ) : (
                        <div className="space-y-2 pr-4">
                          {customer.profiles.map((profile) => (
                            <div key={profile.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-xs font-semibold text-white">{profile.displayName}</span>
                                  {profile.isVerified && (
                                    <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#1877F2]">
                                      <i className="ri-check-line text-[11px] leading-none text-white" />
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={`/profile/${profile.publicId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 block truncate font-mono text-[10px] text-[#03A9F4]"
                                >
                                  /profile/{profile.publicId}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleVerification(profile.id, !profile.isVerified)}
                                disabled={busyProfileId === profile.id}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                  profile.isVerified
                                    ? "bg-white/10 text-white/60 hover:bg-white/15"
                                    : "bg-[#1877F2] text-white hover:bg-[#0A66FF]"
                                }`}
                              >
                                {busyProfileId === profile.id ? "Saving..." : profile.isVerified ? "Unverify" : "Verify"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-white/40">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AdminChrome>
  );
}
