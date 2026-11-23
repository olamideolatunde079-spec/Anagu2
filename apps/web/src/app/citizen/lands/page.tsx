"use client";
/**
 * C02 — My Lands
 */
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark, PlusCircle, Search, Grid, List, MapPin, ChevronRight
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { clsx } from "clsx";

type LandRecord = {
  id:         string;
  parcel_id:  string;
  status:     string;
  created_at: string;
  parcels?:   { lga?: string; state?: string; area_sqm?: number };
  land_titles?: Array<{ token_id?: string; is_revoked?: boolean }>;
};

function useLands(userId: string | undefined) {
  return useQuery({
    queryKey: ["citizen-lands", userId],
    enabled:  !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, parcel_id, status, created_at, parcels(lga, state, area_sqm), land_titles(token_id, is_revoked)")
        .eq("applicant_id", userId!)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as LandRecord[];
    },
  });
}

export default function MyLandsPage() {
  const { user } = useUser();
  const { data, isLoading, error } = useLands(user?.id);
  const [view, setView]   = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const statuses = ["ALL", "COMPLETED", "NFT_ISSUED", "APPROVED"];

  const filtered = (data ?? []).filter((l) => {
    const matchSearch = !search ||
      l.id.toLowerCase().includes(search.toLowerCase()) ||
      (l.parcels as { lga?: string } | undefined)?.lga?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "ALL" || l.status === filter;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout pageTitle="My Lands">
      <PageHeader
        title="My Lands"
        description="All your registered land parcels and titles"
        breadcrumbs={[{ label: "My Lands" }]}
        action={
          <Link href="/citizen/apply" className="btn-primary text-sm">
            <PlusCircle size={16} />
            Register Land
          </Link>
        }
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB4CC]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or LGA…"
            className="input pl-9 h-10"
          />
        </div>

        <div className="flex gap-1">
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
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex gap-1 border border-[#29345A] rounded-lg p-0.5">
          <button
            onClick={() => setView("grid")}
            className={clsx("p-1.5 rounded", view === "grid" ? "bg-[#6338F5] text-white" : "text-[#AAB4CC] hover:text-white")}
            aria-label="Grid view"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={clsx("p-1.5 rounded", view === "list" ? "bg-[#6338F5] text-white" : "text-[#AAB4CC] hover:text-white")}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" label="Loading lands…" /></div>
      ) : error ? (
        <div className="card text-center py-10 text-[#EF4444]">Failed to load land records.</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Landmark size={28} />}
          title={data?.length === 0 ? "No registered lands" : "No results found"}
          message={
            data?.length === 0
              ? "Register your first land parcel to get a blockchain-verified title."
              : "Try adjusting your search or filter."
          }
          action={
            data?.length === 0 ? (
              <Link href="/citizen/apply" className="btn-primary text-sm">
                <PlusCircle size={14} />
                Register Land
              </Link>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((land) => {
            const parcel = land.parcels as { lga?: string; state?: string; area_sqm?: number } | undefined;
            const title  = (land.land_titles as Array<{ token_id?: string; is_revoked?: boolean }>)?.[0];
            return (
              <Link
                key={land.id}
                href={`/citizen/lands/${land.id}`}
                className="card hover:border-[#6338F5]/50 hover:shadow-glow transition-all"
              >
                {/* Map placeholder */}
                <div className="h-32 rounded-xl mb-4 overflow-hidden bg-[#111832] relative flex items-center justify-center">
                  <MapPin size={32} className="text-[#29345A]" />
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={land.status} />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Parcel #{land.id.slice(0, 8)}
                    </p>
                    {parcel?.lga && (
                      <p className="text-xs text-[#AAB4CC] mt-0.5">
                        <MapPin size={10} className="inline mr-0.5" />
                        {parcel.lga}, {parcel.state}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-[#AAB4CC] shrink-0 mt-0.5" />
                </div>

                {parcel?.area_sqm && (
                  <p className="text-xs text-[#AAB4CC] mt-2">
                    Area: {parcel.area_sqm.toFixed(2)} m²
                  </p>
                )}

                {title?.token_id && (
                  <p className="text-xs text-[#13C98A] mt-1 font-mono">
                    NFT #{title.token_id}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Parcel ID</th>
                <th>LGA / State</th>
                <th>Area</th>
                <th>NFT Token</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((land) => {
                const parcel = land.parcels as { lga?: string; state?: string; area_sqm?: number } | undefined;
                const title  = (land.land_titles as Array<{ token_id?: string }>)?.[0];
                return (
                  <tr key={land.id}>
                    <td className="font-mono text-xs">#{land.id.slice(0, 8)}</td>
                    <td>{parcel?.lga ? `${parcel.lga}, ${parcel.state}` : "—"}</td>
                    <td>{parcel?.area_sqm ? `${parcel.area_sqm.toFixed(2)} m²` : "—"}</td>
                    <td className="font-mono text-xs text-[#13C98A]">
                      {title?.token_id ? `#${title.token_id}` : "—"}
                    </td>
                    <td><StatusBadge status={land.status} /></td>
                    <td>
                      <Link href={`/citizen/lands/${land.id}`} className="btn-ghost text-xs py-1 px-2">
                        View
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
