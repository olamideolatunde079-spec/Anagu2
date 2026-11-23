"use client";
/**
 * B02 — NFT Title Detail
 */
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Award, Hash, MapPin, User, Calendar, FileText, Shield,
  ExternalLink, ChevronLeft
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

type TitleFull = {
  id:                string;
  token_id:          string;
  tx_hash:           string;
  is_revoked:        boolean;
  owner_address:     string;
  owner_user_id?:    string;
  block_number?:     string;
  token_uri?:        string;
  issued_at:         string;
  revocation_tx?:    string;
  revocation_ground?: string;
  revoked_at?:       string;
  revoked_by_address?: string;
  parcels?: { id?: string; lga?: string; state?: string; area_sqm?: number };
  applications?: { id?: string };
};

function useTitleDetail(tokenId: string) {
  return useQuery({
    queryKey: ["title-detail", tokenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("land_titles")
        .select(`
          id, token_id, tx_hash, is_revoked, owner_address, owner_user_id,
          block_number, token_uri, issued_at,
          revocation_tx, revocation_ground, revoked_at, revoked_by_address,
          parcels(id, lga, state, area_sqm)
        `)
        .eq("token_id", tokenId)
        .single();
      if (error) throw error;
      return data as unknown as TitleFull;
    },
  });
}

const GROUND_LABELS: Record<string, string> = {
  OVERRIDING_PUBLIC_INTEREST:   "Overriding Public Interest",
  BREACH_OF_STATUTORY_CONDITION:"Breach of Statutory Condition",
};

export default function TitleDetailPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = use(params);
  const { data: title, isLoading, error } = useTitleDetail(tokenId);

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;
  if (error || !title) {
    return (
      <AppLayout>
        <div className="card text-center py-12 text-[#EF4444]">
          Title not found.
          <Link href="/titles" className="ml-2 text-[#6338F5] underline">Back</Link>
        </div>
      </AppLayout>
    );
  }

  const parcel = title.parcels as { lga?: string; state?: string; area_sqm?: number } | undefined;

  return (
    <AppLayout pageTitle="NFT Title Detail">
      <PageHeader
        title={`NFT Title #${title.token_id}`}
        description="Blockchain-verified digital land title"
        breadcrumbs={[{ label: "Titles", href: "/titles" }, { label: `#${title.token_id}` }]}
        action={
          <Link href="/titles" className="btn-secondary text-sm">
            <ChevronLeft size={15} /> Back
          </Link>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Title card */}
        <div className="lg:col-span-2 space-y-5">
          <div className={`card ${title.is_revoked ? "border-[#EF4444]/30" : "border-[#13C98A]/30"}`}>
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                title.is_revoked ? "bg-[#EF4444]/20" : "bg-[#13C98A]/20"
              }`}>
                <Award size={24} className={title.is_revoked ? "text-[#EF4444]" : "text-[#13C98A]"} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Token #{title.token_id}</h2>
                  <StatusBadge status={title.is_revoked ? "REVOKED" : "ACTIVE"} />
                </div>
                <p className="text-xs text-[#AAB4CC] mt-0.5">ERC-721 Land Title NFT — Hyperledger Besu</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-1 flex items-center gap-1">
                  <User size={11} /> Owner Address
                </dt>
                <dd className="font-mono text-xs text-white break-all">{title.owner_address}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#AAB4CC] mb-1 flex items-center gap-1">
                  <MapPin size={11} /> Location
                </dt>
                <dd className="text-sm text-white">
                  {parcel?.lga ? `${parcel.lga}, ${parcel.state}` : "—"}
                  {parcel?.area_sqm && (
                    <span className="ml-2 text-xs text-[#AAB4CC]">{parcel.area_sqm.toFixed(2)} m²</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-[#AAB4CC] mb-1 flex items-center gap-1">
                  <Hash size={11} /> Issuance Transaction
                </dt>
                <dd><TxHashDisplay hash={title.tx_hash} /></dd>
              </div>

              <div>
                <dt className="text-xs text-[#AAB4CC] mb-1 flex items-center gap-1">
                  <Hash size={11} /> Block Number
                </dt>
                <dd className="font-mono text-sm text-white">{title.block_number ?? "—"}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#AAB4CC] mb-1 flex items-center gap-1">
                  <Calendar size={11} /> Issued
                </dt>
                <dd className="text-sm text-white">
                  {format(parseISO(title.issued_at), "d MMMM yyyy, HH:mm")}
                </dd>
              </div>

              {title.token_uri && (
                <div>
                  <dt className="text-xs text-[#AAB4CC] mb-1 flex items-center gap-1">
                    <ExternalLink size={11} /> Token URI
                  </dt>
                  <dd>
                    <a
                      href={title.token_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#168BFF] hover:underline font-mono"
                    >
                      {title.token_uri.slice(0, 40)}…
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Revocation details */}
          {title.is_revoked && (
            <div className="card border-[#EF4444]/30 bg-[#EF4444]/5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-[#EF4444]" />
                <h2 className="text-sm font-bold text-[#EF4444]">Revocation Details</h2>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-[#AAB4CC] mb-0.5">Statutory Ground</dt>
                  <dd className="text-sm text-white">
                    {title.revocation_ground ? GROUND_LABELS[title.revocation_ground] ?? title.revocation_ground : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#AAB4CC] mb-0.5">Revocation Transaction</dt>
                  <dd>{title.revocation_tx ? <TxHashDisplay hash={title.revocation_tx} /> : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#AAB4CC] mb-0.5">Revoked By</dt>
                  <dd className="font-mono text-xs text-white">{title.revoked_by_address ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#AAB4CC] mb-0.5">Revoked At</dt>
                  <dd className="text-sm text-white">
                    {title.revoked_at ? format(parseISO(title.revoked_at), "d MMMM yyyy, HH:mm") : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 p-3">
                <p className="text-xs text-[#EF4444]">
                  Legal basis: Land Use Act (1978), Section 28. This revocation is immutable and
                  permanently recorded on the blockchain.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {!title.is_revoked && (
            <div className="card">
              <h2 className="text-sm font-bold text-white mb-3">Title Actions</h2>
              <div className="space-y-2">
                <Link
                  href={`/titles/certificate/${title.token_id}`}
                  className="btn-secondary w-full justify-center text-sm"
                >
                  <FileText size={15} />
                  Download Certificate
                </Link>
                <Link
                  href={`/verify?token=${title.token_id}`}
                  className="btn-ghost w-full justify-center text-sm"
                >
                  <Shield size={15} />
                  Verify Publicly
                </Link>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-sm font-bold text-white mb-3">Blockchain Reference</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#AAB4CC]">Network</span>
                <span className="text-white">Hyperledger Besu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#AAB4CC]">Chain ID</span>
                <span className="font-mono text-white">1337</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#AAB4CC]">Standard</span>
                <span className="text-white">ERC-721</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
