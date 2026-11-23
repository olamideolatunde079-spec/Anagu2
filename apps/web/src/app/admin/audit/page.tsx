"use client";
import { useQuery } from "@tanstack/react-query";
import { Eye, Filter } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export default function AuditLogPage() {
  const [filter, setFilter] = useState("ALL");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events", filter],
    queryFn: async () => {
      let q = supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter !== "ALL") q = q.eq("entity_type", filter.toLowerCase());
      const { data } = await q;
      return data ?? [];
    },
  });

  const FILTERS = ["ALL", "APPLICATION", "PARCEL", "TITLE", "USER"];

  return (
    <AppLayout pageTitle="Audit Log">
      <div className="p-6 space-y-6">
        <PageHeader title="Immutable Audit Log" description="Every state transition recorded — no UPDATE or DELETE permitted" />

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-[#6338F5] text-white" : "bg-[#171A3B] text-[#AAB4CC] hover:text-white border border-[#29345A]"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="card-navy overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-[#171A3B] rounded animate-pulse" />)}</div>
          ) : events.length === 0 ? (
            <EmptyState icon={<Eye size={40} />} title="No audit events" message="Events will appear here as platform activity occurs." />
          ) : (
            <table className="data-table">
              <thead><tr><th>Event</th><th>Entity</th><th>Entity ID</th><th>Actor</th><th>Role</th><th>Timestamp</th></tr></thead>
              <tbody>
                {events.map((ev: any) => (
                  <tr key={ev.id}>
                    <td><span className="badge badge-purple text-xs">{ev.event_type}</span></td>
                    <td className="text-[#AAB4CC] text-xs capitalize">{ev.entity_type}</td>
                    <td className="font-mono text-xs text-[#AAB4CC]">{ev.entity_id?.slice(0,8)}…</td>
                    <td className="font-mono text-xs text-[#AAB4CC]">{ev.actor_id?.slice(0,8)}…</td>
                    <td>{ev.actor_role ? <StatusBadge status={ev.actor_role} /> : <span className="text-[#AAB4CC]">—</span>}</td>
                    <td className="text-xs text-[#AAB4CC] tabular-nums">{ev.created_at ? format(new Date(ev.created_at), "dd MMM yyyy HH:mm:ss") : "—"}</td>
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
