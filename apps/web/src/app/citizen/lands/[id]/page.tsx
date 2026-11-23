"use client";
/**
 * C03 — Land Details
 */
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Award, FileText, ChevronLeft, ExternalLink,
  Calendar, Hash
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PipelineTimeline } from "@/components/ui/PipelineTimeline";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

type ApplicationDetail = {
  id:              string;
  status:          string;
  owner_name:      string;
  national_id:     string;
  created_at:      string;
  approved_at?:    string | null;
  rejection_reason?: string | null;
  parcels?:        { id: string; lga?: string; state?: string; area_sqm?: number; coordinates?: unknown };
  land_titles?:    Array<{ token_id: string; tx_hash: string; is_revoked: boolean; issued_at: string; block_number?: string }>;
  documents?:      Array<{ id: string; file_name: string; document_type: string }>;
};

function useLandDetail(id: string) {
  return useQuery({
    queryKey: ["land-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id, status, owner_name, national_id, created_at, approved_at, rejection_reason,
          parcels(id, lga, state, area_sqm, coordinates),
          land_titles(token_id, tx_hash, is_revoked, issued_at, block_number),
          documents(id, file_name, document_type)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as ApplicationDetail;
    },
  });
}

export default function LandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useLandDetail(id);

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;
  if (error || !data) {
    return (
      <AppLayout>
        <div className="card text-center py-16 text-[#EF4444]">
          Land record not found.{" "}
          <Link href="/citizen/lands" className="text-[#6338F5] underline">Back to My Lands</Link>
        </div>
      </AppLayout>
    );
  }

  const parcel = data.parcels as ApplicationDetail["parcels"];
  const title  = data.land_titles?.[0];
  const docs   = data.documents ?? [];

  return (
    <AppLayout pageTitle="Land Details">
      <PageHeader
        title={`Parcel #${id.slice(0, 8)}`}
        description="Land record and title details"
        breadcrumbs={[
          { label: "My Lands", href: "/citizen/lands" },
          { label: id.slice(0, 8) },
        ]}
        action={
          <Link href="/citizen/lands" className="btn-secondary text-sm">
            <ChevronLeft size={15} />
            Back
          </Link>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Map placeholder */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3">Parcel Location</h2>
            <div className="h-56 rounded-xl bg-[#111832] flex flex-col items-center justify-center border border-[#29345A]">
              <MapPin size={32} className="text-[#29345A] mb-2" />
              <p className="text-xs text-[#AAB4CC]">Map preview — coordinates on record</p>
            </div>
            {parcel?.lga && (
              <p className="text-sm text-[#AAB4CC] mt-3">
                <MapPin size={14} className="inline mr-1 text-[#168BFF]" />
                {parcel.lga}, {parcel.state}
              </p>
            )}
            {parcel?.area_sqm && (
              <p className="text-sm text-[#AAB4CC] mt-1">
                Area: <span className="text-white font-medium">{parcel.area_sqm.toFixed(4)} m²</span>
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">Application Summary</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: "Application ID",  value: <span className="font-mono text-xs">{id}</span> },
                { label: "Status",          value: <StatusBadge status={data.status} /> },
                { label: "Owner Name",      value: data.owner_name },
                { label: "National ID",     value: <span className="font-mono text-xs">{data.national_id}</span> },
                { label: "Submitted",       value: format(parseISO(data.created_at), "d MMM yyyy, HH:mm") },
                {
                  label: "Approved",
                  value: data.approved_at
                    ? format(parseISO(data.approved_at), "d MMM yyyy, HH:mm")
                    : "—",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-[#AAB4CC] mb-0.5">{label}</dt>
                  <dd className="text-sm text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* NFT Title */}
          {title && (
            <div className="card border-[#13C98A]/30 bg-[#13C98A]/5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-[#13C98A]" />
                <h2 className="text-sm font-semibold text-white">NFT Land Title</h2>
                <StatusBadge status={title.is_revoked ? "REVOKED" : "ACTIVE"} />
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-[#AAB4CC]">Token ID</dt>
                  <dd className="text-sm font-mono text-[#13C98A] font-bold">#{title.token_id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#AAB4CC]">Transaction Hash</dt>
                  <dd><TxHashDisplay hash={title.tx_hash} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-[#AAB4CC]">Block Number</dt>
                  <dd className="text-sm font-mono text-white">{title.block_number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#AAB4CC]">Issued</dt>
                  <dd className="text-sm text-white">{format(parseISO(title.issued_at), "d MMM yyyy")}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Link href={`/titles/${title.token_id}`} className="btn-secondary text-xs">
                  <Hash size={13} />
                  View Title
                </Link>
                <Link href={`/titles/certificate/${title.token_id}`} className="btn-ghost text-xs">
                  <FileText size={13} />
                  Certificate
                </Link>
              </div>
            </div>
          )}

          {/* Documents */}
          {docs.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-white mb-3">
                <FileText size={15} className="inline mr-1 text-[#168BFF]" />
                Attached Documents ({docs.length})
              </h2>
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#111832] border border-[#29345A]"
                  >
                    <FileText size={16} className="text-[#AAB4CC] shrink-0" />
                    <span className="flex-1 text-sm text-white truncate">{doc.file_name}</span>
                    <span className="text-xs text-[#AAB4CC] shrink-0">{doc.document_type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Pipeline timeline */}
        <div className="card h-fit">
          <h2 className="text-sm font-semibold text-white mb-4">
            <Calendar size={15} className="inline mr-1 text-[#6338F5]" />
            Registration Pipeline
          </h2>
          <PipelineTimeline
            currentStatus={data.status}
            rejectionReason={data.rejection_reason}
          />
        </div>
      </div>
    </AppLayout>
  );
}
