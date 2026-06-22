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
  _count: { tags: number; profiles: number };
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

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
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data ?? []);
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) return <AdminLoadingScreen />;

  return (
    <AdminChrome title="Customers" subtitle="Registered users, owned medals, and public profile counts.">
      <Panel title="Customer Directory">
        {customers.length === 0 ? (
          <EmptyState icon="ri-user-search-line" title="No customers yet" body="When users sign up, they will appear here automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-white/35">
                <tr className="border-b border-white/10">
                  <th className="py-3 font-medium">Email</th>
                  <th className="py-3 font-medium">Role</th>
                  <th className="py-3 font-medium">Medals</th>
                  <th className="py-3 font-medium">Profiles</th>
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
