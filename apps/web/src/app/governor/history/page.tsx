"use client";
/**
 * RV05 — Revocation History
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { Shield } from "lucide-react";

type RevRow = {
  id:                string;
  token_id:          string;
  revocation_tx?:    string;
  revocation_ground?: string;
  revoked_at?:       string;
  revoked_by_address?: string;
};

function useRevocationHistory() {
  return useQuery({
    queryKey: ["revocation-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("land_titles")
        .select("id, token_id, revocation_tx, revocation_ground, revoked_at, revoked_by_address")
        .eq("is_revoked", true)
        .order("revoked_at", { ascending: false });
      return (data ?? []) as RevRow[];
    },
  });
}

const GROUND_LABELS: Record<string, string> = {
  OVERRIDING_PUBLIC_INTEREST:   "Overriding Public Interest",
  BREACH_OF_STATUTORY_CONDITION:"Breach of Statutory Condition",
};

export default function RevocationHistoryPage() {
  const { data, isLoading } = useRevocationHistory();
  const [search, setSearch] = useState("");

  const filtered = (data ?? []).filter((r) =>
    !search ||
    r.token_id.includes(search) ||
    (r.revocation_ground ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout pageTitle="Revocation History">
      <PageHeader
        title="Revocation History"
        description="Searchable record of all statutory land title revocations"
        breadcrumbs={[
          { label: "Governor", href: "/governor/dashboard" },
          { label: "History" },
        ]}
      />

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB4CC]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by token ID or ground…"
          className="input pl-9 h-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading history…" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Shield size={28} />}
          title={data?.length === 0 ? "No revocations on record" : "No results"}
          message="All statutory revocations will appear here."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Statutory Ground</th>
                <th>Transaction Hash</th>
                <th>Authorised By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs text-[#EF4444]">#{r.token_id}</td>
                  <td className="text-xs">
                    {r.revocation_ground ? GROUND_LABELS[r.revocation_ground] ?? r.revocation_ground : "—"}
                  </td>
                  <td>{r.revocation_tx ? <TxHashDisplay hash={r.revocation_tx} /> : "—"}</td>
                  <td className="font-mono text-xs text-[#AAB4CC]">
                    {r.revoked_by_address ? `${r.revoked_by_address.slice(0, 10)}…` : "—"}
                  </td>
                  <td className="text-xs text-[#AAB4CC]">
                    {r.revoked_at ? format(parseISO(r.revoked_at), "d MMM yyyy, HH:mm") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
