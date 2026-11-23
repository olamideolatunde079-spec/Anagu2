"use client";
import { useQuery } from "@tanstack/react-query";
import { Users, Search } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = users.filter((u: any) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout pageTitle="User Management">
      <div className="p-6 space-y-6">
        <PageHeader title="User Management" description="All registered platform users" />

        <div className="card-navy">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB4CC]" />
            <input className="input pl-9 max-w-sm" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-[#171A3B] rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users size={40} />} title="No users found" message="Adjust your search." />
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>National ID</th><th>Active</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium text-white">{u.full_name}</td>
                    <td className="text-[#AAB4CC] font-mono text-xs">{u.email}</td>
                    <td><StatusBadge status={u.role} /></td>
                    <td className="font-mono text-xs text-[#AAB4CC]">{u.national_id ?? "—"}</td>
                    <td>
                      <span className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-[#AAB4CC] text-xs">{u.created_at ? format(new Date(u.created_at), "dd MMM yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
