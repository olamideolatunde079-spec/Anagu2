"use client";
/**
 * B03 — Digital Land Title Certificate
 */
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download, Landmark, Shield, QrCode, Award } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import Link from "next/link";

type CertTitle = {
  token_id:      string;
  tx_hash:       string;
  owner_address: string;
  issued_at:     string;
  is_revoked:    boolean;
  parcels?: { lga?: string; state?: string; area_sqm?: number };
  applications?: { owner_name?: string; national_id?: string };
};

function useCertTitle(tokenId: string) {
  return useQuery({
    queryKey: ["cert-title", tokenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("land_titles")
        .select("token_id, tx_hash, owner_address, issued_at, is_revoked, parcels(lga, state, area_sqm), applications(owner_name, national_id)")
        .eq("token_id", tokenId)
        .single();
      if (error) throw error;
      return data as unknown as CertTitle;
    },
  });
}

export default function CertificatePage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = use(params);
  const { data: title, isLoading, error } = useCertTitle(tokenId);

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;
  if (error || !title) {
    return (
      <AppLayout>
        <div className="card text-center py-12 text-[#EF4444]">
          Certificate not available.
          <Link href="/titles" className="ml-2 text-[#6338F5] underline">Back</Link>
        </div>
      </AppLayout>
    );
  }

  const parcel = title.parcels as { lga?: string; state?: string; area_sqm?: number } | undefined;
  const app    = title.applications as { owner_name?: string; national_id?: string } | undefined;

  return (
    <AppLayout pageTitle="Digital Certificate">
      <div className="max-w-2xl mx-auto">
        {/* Actions */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-white">Digital Land Title Certificate</h1>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-secondary text-sm">
              <Printer size={15} />
              Print
            </button>
            <button className="btn-primary text-sm">
              <Download size={15} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div
          id="certificate"
          className="rounded-3xl overflow-hidden border-2 border-[#6338F5]/30 print:border-gray-300"
          style={{
            background: "linear-gradient(145deg, #111832 0%, #171A3B 60%, #0D1035 100%)",
            boxShadow: "0 0 60px rgba(99,56,245,0.2)",
          }}
        >
          {/* Header strip */}
          <div
            className="h-2"
            style={{ background: "linear-gradient(90deg, #6338F5 0%, #168BFF 100%)" }}
          />

          <div className="p-8 sm:p-12">
            {/* Logo + branding */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <Landmark size={24} className="text-white" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-white">ANAGU!</div>
                  <div className="text-xs text-[#AAB4CC]">Land Administration Framework</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#AAB4CC]">Certificate of Title</div>
                <div className="text-xs text-[#6338F5] font-mono">NFT #{title.token_id}</div>
              </div>
            </div>

            {/* Title text */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6338F5]/40 bg-[#6338F5]/10 px-4 py-1.5 mb-3">
                <Award size={14} className="text-[#13C98A]" />
                <span className="text-xs text-[#13C98A] font-semibold">VERIFIED DIGITAL LAND TITLE</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">Certificate of Occupancy</h2>
              <p className="text-sm text-[#AAB4CC] mt-1">Issued under the Land Use Act (1978)</p>
            </div>

            {/* Divider */}
            <div className="border-t border-[#29345A] mb-6" />

            {/* Details grid */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div>
                <div className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-3">
                  Registered Owner
                </div>
                <div className="text-base font-bold text-white mb-0.5">
                  {app?.owner_name ?? "—"}
                </div>
                <div className="text-xs text-[#AAB4CC]">
                  NIN: {app?.national_id ?? "—"}
                </div>
                <div className="text-xs font-mono text-[#168BFF] mt-1 break-all">
                  {title.owner_address}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-3">
                  Land Particulars
                </div>
                <div className="text-base font-bold text-white mb-0.5">
                  {parcel?.lga ?? "—"}, {parcel?.state ?? "—"}
                </div>
                {parcel?.area_sqm && (
                  <div className="text-xs text-[#AAB4CC]">
                    Area: {parcel.area_sqm.toFixed(4)} m²
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-3">
                  Issue Date
                </div>
                <div className="text-base font-bold text-white">
                  {format(parseISO(title.issued_at), "d MMMM yyyy")}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-3">
                  Token ID
                </div>
                <div className="text-2xl font-extrabold text-[#13C98A] font-mono">
                  #{title.token_id}
                </div>
              </div>
            </div>

            {/* TX hash */}
            <div className="rounded-xl bg-[#111832] border border-[#29345A] p-4 mb-6">
              <div className="text-xs font-semibold text-[#AAB4CC] uppercase tracking-wider mb-2">
                Blockchain Transaction Hash
              </div>
              <TxHashDisplay hash={title.tx_hash} className="text-sm" />
            </div>

            {/* QR + disclaimer */}
            <div className="flex items-start gap-6">
              {/* QR placeholder */}
              <div className="w-20 h-20 rounded-xl border border-[#29345A] bg-white flex items-center justify-center shrink-0">
                <QrCode size={40} className="text-[#111832]" />
              </div>
              <div className="flex-1 text-xs text-[#29345A] leading-relaxed">
                <p className="font-semibold text-[#AAB4CC] mb-1">Verification</p>
                Scan the QR code or visit anagu.gov.ng/verify to confirm this title&apos;s authenticity.
                This is a prototype/demonstration certificate. It is not a legally issued government document.
              </div>
            </div>

            {/* Status warning if revoked */}
            {title.is_revoked && (
              <div className="mt-6 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 p-4 text-center">
                <Shield size={18} className="text-[#EF4444] mx-auto mb-1" />
                <p className="text-sm font-bold text-[#EF4444]">THIS TITLE HAS BEEN REVOKED</p>
              </div>
            )}
          </div>

          {/* Footer strip */}
          <div
            className="h-1.5"
            style={{ background: "linear-gradient(90deg, #168BFF 0%, #6338F5 100%)" }}
          />
        </div>
      </div>
    </AppLayout>
  );
}
