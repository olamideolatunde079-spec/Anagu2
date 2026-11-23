"use client";
/**
 * RV01 — Governor Dashboard
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, List, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

type RevocationRow = {
  id:                string;
  token_id:          string;
  revocation_tx?:    string;
  revocation_ground?: string;
  revoked_at?:       string;
};

function useRevocations() {
  return useQuery({
    queryKey: ["governor-revocations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("land_titles")
        .select("id, token_id, revocation_tx, revocation_ground, revoked_at")
        .eq("is_revoked", true)
        .order("revoked_at", { ascending: false })
        .limit(10);
      return (data ?? []) as RevocationRow[];
    },
  });
}

export default function GovernorDashboard() {
  const { user, loading } = useUser();
  const { data, isLoading } = useRevocations();

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  // Guard: only GOVERNOR role
  if (user?.role !== "GOVERNOR") {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-[#EF4444]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-[#AAB4CC]">
            The Governor revocation portal requires the GOVERNOR role. Contact your system administrator.
          </p>
          <Link href="/dashboard" className="mt-6 btn-secondary inline-block">
            Go to Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Governor Dashboard">
      {/* Restricted access banner */}
      <div className="mb-6 flex items-start gap-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-4">
        <AlertTriangle size={20} className="text-[#EF4444] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#EF4444]">Statutory Revocation Portal — GOVERNOR Access Only</p>
          <p className="text-xs text-[#AAB4CC] mt-0.5">
            Actions taken here are consequential, irreversible, and permanently recorded on the blockchain.
            Statutory authority under the Land Use Act (1978), Section 28.
          </p>
        </div>
      </div>

      <PageHeader
        title="Governor Dashboard"
        description="Statutory land title revocation under the Land Use Act (1978)"
        breadcrumbs={[{ label: "Governor" }]}
        action={
          <Link href="/governor/revoke" className="btn-danger text-sm">
            <Shield size={15} />
            New Revocation
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Total Revocations"
          value={data?.length ?? "—"}
          icon={<Shield size={20} />}
          loading={isLoading}
          accentColor="text-[#EF4444]"
        />
        <MetricCard
          label="Pending Requests"
          value={0}
          icon={<Clock size={20} />}
          loading={isLoading}
          accentColor="text-[#F0B429]"
        />
        <MetricCard
          label="Completed This Month"
          value={data?.filter((r) => {
            const d = r.revoked_at ? parseISO(r.revoked_at) : null;
            return d && d.getMonth() === new Date().getMonth();
          }).length ?? "—"}
          icon={<List size={20} />}
          loading={isLoading}
          accentColor="text-[#AAB4CC]"
        />
      </div>

      {/* Recent revocations */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Recent Revocation Events</h2>
          <Link href="/governor/history" className="text-xs text-[#6338F5] hover:underline">
            View history
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-12 rounded-xl bg-[#29345A]/30 animate-pulse" />)}
          </div>
        ) : data?.length === 0 ? (
          <p className="text-sm text-[#AAB4CC] py-6 text-center">No revocations on record.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Ground</th>
                  <th>Transaction</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-[#EF4444]">#{r.token_id}</td>
                    <td className="text-xs">
                      {r.revocation_ground === "OVERRIDING_PUBLIC_INTEREST"
                        ? "Overriding Public Interest"
                        : r.revocation_ground === "BREACH_OF_STATUTORY_CONDITION"
                        ? "Breach of Statutory Condition"
                        : r.revocation_ground ?? "—"}
                    </td>
                    <td>{r.revocation_tx ? <TxHashDisplay hash={r.revocation_tx} /> : "—"}</td>
                    <td className="text-xs text-[#AAB4CC]">
                      {r.revoked_at ? format(parseISO(r.revoked_at), "d MMM yyyy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
