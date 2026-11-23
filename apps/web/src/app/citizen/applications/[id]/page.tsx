"use client";
/**
 * Application detail — full audit trail view
 */
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Clock, User, Hash, FileText, MapPin } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PipelineTimeline } from "@/components/ui/PipelineTimeline";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

type AuditEntry = { id: string; event_type: string; created_at: string; actor_role?: string; metadata?: Record<string, unknown> };
type AppDetail  = {
  id: string; status: string; owner_name: string; national_id: string;
  created_at: string; rejection_reason?: string | null;
  parcels?: { lga?: string; state?: string };
  land_titles?: Array<{ token_id: string; tx_hash: string }>;
};

function useAppDetail(id: string) {
  return useQuery({
    queryKey: ["app-detail", id],
    queryFn: async () => {
      const [appRes, auditRes] = await Promise.all([
        supabase.from("applications")
          .select("id, status, owner_name, national_id, created_at, rejection_reason, parcels(lga, state), land_titles(token_id, tx_hash)")
          .eq("id", id).single(),
        supabase.from("audit_events")
          .select("id, event_type, created_at, actor_role, metadata")
          .eq("entity_id", id)
          .order("created_at", { ascending: true }),
      ]);
      return {
        app:   appRes.data as unknown as AppDetail | null,
        audit: (auditRes.data ?? []) as AuditEntry[],
      };
    },
  });
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useAppDetail(id);

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;
  if (error || !data?.app) {
    return (
      <AppLayout>
        <div className="card text-center py-10 text-[#EF4444]">
          Application not found.{" "}
          <Link href="/citizen/applications" className="text-[#6338F5] underline">Back</Link>
        </div>
      </AppLayout>
    );
  }

  const { app, audit } = data;
  const parcel = app.parcels as { lga?: string; state?: string } | undefined;
  const title  = app.land_titles?.[0];

  return (
    <AppLayout pageTitle="Application Detail">
      <PageHeader
        title={`Application #${id.slice(0, 8)}`}
        breadcrumbs={[{ label: "Applications", href: "/citizen/applications" }, { label: id.slice(0, 8) }]}
        action={
          <Link href="/citizen/applications" className="btn-secondary text-sm">
            <ChevronLeft size={15} /> Back
          </Link>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Summary */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Application Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { label: "Status",      value: <StatusBadge status={app.status} /> },
                { label: "Owner",       value: app.owner_name },
                { label: "National ID", value: <span className="font-mono text-xs">{app.national_id}</span> },
                { label: "Location",    value: parcel?.lga ? `${parcel.lga}, ${parcel.state}` : "—" },
                { label: "Submitted",   value: format(parseISO(app.created_at), "d MMM yyyy, HH:mm") },
                { label: "NFT Token",   value: title ? <span className="font-mono text-xs text-[#13C98A]">#{title.token_id}</span> : "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-[#AAB4CC] mb-0.5">{label}</dt>
                  <dd className="text-sm text-white">{value}</dd>
                </div>
              ))}
            </dl>
            {title && (
              <div className="mt-4 p-3 rounded-xl bg-[#13C98A]/10 border border-[#13C98A]/20">
                <p className="text-xs text-[#AAB4CC] mb-1">Transaction Hash</p>
                <TxHashDisplay hash={title.tx_hash} />
              </div>
            )}
          </div>

          {/* Audit trail */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Audit Trail</h2>
            {audit.length === 0 ? (
              <p className="text-sm text-[#AAB4CC]">No audit events recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {audit.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#6338F5]/20 border border-[#6338F5]/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={10} className="text-[#6338F5]" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{e.event_type.replace(/_/g, " ")}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[#AAB4CC]">
                          {format(parseISO(e.created_at), "d MMM yyyy, HH:mm")}
                        </span>
                        {e.actor_role && (
                          <span className="text-xs text-[#6338F5]">{e.actor_role}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Pipeline */}
        <div className="card h-fit">
          <h2 className="text-sm font-semibold text-white mb-4">Pipeline</h2>
          <PipelineTimeline
            currentStatus={app.status}
            rejectionReason={app.rejection_reason}
          />
        </div>
      </div>
    </AppLayout>
  );
}
