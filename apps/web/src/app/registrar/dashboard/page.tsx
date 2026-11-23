"use client";
/**
 * R01 — Registrar Dashboard
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileSearch, CheckCircle2, XCircle, Clock, ChevronRight, AlertCircle
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { format, parseISO, isToday } from "date-fns";

type AppRow = {
  id: string; status: string; owner_name: string;
  created_at: string;
  parcels?: { lga?: string; state?: string };
};

function useRegistrarStats() {
  return useQuery({
    queryKey: ["registrar-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, owner_name, created_at, parcels(lga, state)")
        .order("created_at", { ascending: false })
        .limit(100);

      const apps = (data ?? []) as AppRow[];
      const pending  = apps.filter((a) => ["SPATIAL_VERIFIED","OWNERSHIP_VERIFIED","LEGAL_VERIFIED"].includes(a.status));
      const approved = apps.filter((a) => ["APPROVED","BLOCKCHAIN_REGISTERED","NFT_ISSUED","COMPLETED"].includes(a.status));
      const rejected = apps.filter((a) => a.status === "REJECTED");
      const today    = pending.filter((a) => isToday(parseISO(a.created_at)));

      return { pending, approved, rejected, today, recent: apps.slice(0, 8) };
    },
  });
}

export default function RegistrarDashboard() {
  const { data, isLoading } = useRegistrarStats();

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout pageTitle="Registrar Dashboard">
      <PageHeader
        title="Registrar Dashboard"
        description="Application review queue and approval workflow"
        breadcrumbs={[{ label: "Registrar" }]}
        action={
          <Link href="/registrar/queue" className="btn-primary text-sm">
            <FileSearch size={15} />
            Open Review Queue
          </Link>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Pending Review"
          value={data?.pending.length ?? 0}
          icon={<Clock size={20} />}
          accentColor="text-[#F0B429]"
        />
        <MetricCard
          label="Approved"
          value={data?.approved.length ?? 0}
          icon={<CheckCircle2 size={20} />}
          accentColor="text-[#13C98A]"
        />
        <MetricCard
          label="Rejected"
          value={data?.rejected.length ?? 0}
          icon={<XCircle size={20} />}
          accentColor="text-[#EF4444]"
        />
        <MetricCard
          label="New Today"
          value={data?.today.length ?? 0}
          icon={<AlertCircle size={20} />}
          accentColor="text-[#168BFF]"
        />
      </div>

      {/* Pending queue preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Applications Awaiting Review</h2>
          <Link href="/registrar/queue" className="text-xs text-[#6338F5] hover:underline flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {data?.pending.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 size={32} className="text-[#13C98A] mx-auto mb-2" />
            <p className="text-sm text-[#AAB4CC]">No applications pending review</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Owner</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.pending.slice(0, 10).map((app) => {
                  const parcel = app.parcels as { lga?: string; state?: string } | undefined;
                  return (
                    <tr key={app.id}>
                      <td className="font-mono text-xs">#{app.id.slice(0, 8)}</td>
                      <td>{app.owner_name}</td>
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
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
