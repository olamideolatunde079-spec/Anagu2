"use client";
import { useQuery } from "@tanstack/react-query";
import { Award, ExternalLink, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import { format } from "date-fns";
import type { LandTitle } from "@/types";

export default function TitlesPage() {
  const { user } = useUser();

  const { data: titles = [], isLoading } = useQuery<LandTitle[]>({
    queryKey: ["titles", user?.id],
    queryFn: async () => {
      const q = supabase.from("land_titles").select("*").order("issued_at", { ascending: false });
      if (user?.role === "CITIZEN") q.eq("owner_user_id", user.id);
      const { data } = await q;
      return (data ?? []) as LandTitle[];
    },
    enabled: !!user,
  });

  return (
    <AppLayout pageTitle="NFT Land Titles">
      <div className="p-6 space-y-6">
        <PageHeader
          title="NFT Land Titles"
          description="ERC-721 blockchain-anchored land title records"
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card animate-pulse h-48" />)}
          </div>
        ) : titles.length === 0 ? (
          <EmptyState icon={<Award size={40} />} title="No titles yet" message="Approved applications will appear here as NFT land titles." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {titles.map(title => (
              <div key={title.id} className="card space-y-4 hover:shadow-glow transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[#6338F5]/20 flex items-center justify-center">
                    <Award size={24} className="text-[#6338F5]" />
                  </div>
                  <StatusBadge status={title.isRevoked ? "REVOKED" : "NFT_ISSUED"} />
                </div>
                <div>
                  <div className="text-xs text-[#AAB4CC] mb-1">Token ID</div>
                  <div className="text-2xl font-bold text-white tabular-nums">#{title.tokenId}</div>
                </div>
                {title.isRevoked && (
                  <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 rounded-lg px-3 py-2">
                    <AlertTriangle size={12} /> Revoked under LUA 1978 s.28
                  </div>
                )}
                <div className="text-xs text-[#AAB4CC]">
                  <TxHashDisplay hash={title.txHash} />
                </div>
                <div className="text-xs text-[#AAB4CC]">
                  Issued {title.issuedAt ? format(new Date(title.issuedAt), "dd MMM yyyy") : "—"}
                </div>
                <Link href={`/titles/${title.tokenId}`} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                  <ExternalLink size={14} /> View Title
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
