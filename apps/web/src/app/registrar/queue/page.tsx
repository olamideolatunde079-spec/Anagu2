"use client";
/**
 * R02 — Registrar Review Queue
 */
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

const REVIEW_STATUSES = [
  "SUBMITTED",
  "SPATIAL_VERIFIED",
  "OWNERSHIP_VERIFIED",
  "LEGAL_VERIFIED",
];

type AppRow = {
  id: string; status: string; owner_name: string; created_at: string;
  parcels?: { lga?: string; state?: string };
};

function useQueue() {
  return useQuery({
    queryKey: ["registrar-queue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, owner_name, created_at, parcels(lga, state)")
        .in("status", REVIEW_STATUSES)
        .order("created_at", { ascending: true });
      return (data ?? []) as AppRow[];
    },
    refetchInterval: 30_000,
  });
}

export default function RegistrarQueuePage() {
  const { data, isLoading } = useQueue();
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("ALL");

  const statuses = ["ALL", ...REVIEW_STATUSES];

  const filtered = (data ?? []).filter((a) => {
    const matchSearch = !search ||
      a.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || a.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AppLayout pageTitle="Review Queue">
      <PageHeader
        title="Application Review Queue"
        description="Applications awaiting registrar review and approval"
        breadcrumbs={[
          { label: "Registrar", href: "/registrar/dashboard" },
          { label: "Review Queue" },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB4CC]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="input pl-9 h-10"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === s
                  ? "bg-[#6338F5] text-white"
                  : "bg-[#111832] text-[#AAB4CC] hover:text-white border border-[#29345A]"
              )}
            >
              {s === "ALL" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading queue…" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={data?.length === 0 ? "Queue is empty" : "No results"}
          message="No applications match your search or filter."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Owner</th>
                <th>Location</th>
                <th>Stage</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => {
                const parcel = app.parcels as { lga?: string; state?: string } | undefined;
                return (
                  <tr key={app.id}>
                    <td className="font-mono text-xs">#{app.id.slice(0, 8)}</td>
                    <td className="font-medium">{app.owner_name}</td>
                    <td className="text-xs text-[#AAB4CC]">
                      {parcel?.lga ? `${parcel.lga}, ${parcel.state}` : "—"}
                    </td>
                    <td><StatusBadge status={app.status} /></td>
                    <td className="text-xs text-[#AAB4CC]">
                      {format(parseISO(app.created_at), "d MMM yyyy")}
                    </td>
                    <td>
                      <Link
                        href={`/registrar/queue/${app.id}`}
                        className="inline-flex items-center gap-1 btn-primary text-xs py-1 px-3"
                      >
                        Review <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
