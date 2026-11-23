"use client";
/**
 * RV02+RV03+RV04 — Governor Revocation Workflow
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Shield, AlertTriangle, CheckCircle2, Loader2,
  Hash, Scale
} from "lucide-react";
import { clsx } from "clsx";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

const GROUNDS = [
  {
    value:  0 as const,
    key:    "OVERRIDING_PUBLIC_INTEREST",
    label:  "Overriding Public Interest",
    desc:   "The land is required for a public purpose such as infrastructure, urban planning, or national security.",
    legal:  "Land Use Act 1978, Section 28(2)",
  },
  {
    value:  1 as const,
    key:    "BREACH_OF_STATUTORY_CONDITION",
    label:  "Breach of Statutory Condition",
    desc:   "The titleholder has breached a condition attached to the right of occupancy.",
    legal:  "Land Use Act 1978, Section 28(5)",
  },
];

type TitleDetails = {
  id:           string;
  token_id:     string;
  tx_hash:      string;
  is_revoked:   boolean;
  owner_address: string;
  issued_at:    string;
  parcels?: { lga?: string; state?: string };
};

function useTitleLookup(tokenId: string | null) {
  return useQuery({
    queryKey:  ["title-lookup", tokenId],
    enabled:   !!tokenId && tokenId.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("land_titles")
        .select("id, token_id, tx_hash, is_revoked, owner_address, issued_at, parcels(lga, state)")
        .eq("token_id", tokenId!)
        .single();
      if (error) throw error;
      return data as unknown as TitleDetails;
    },
  });
}

export default function RevokePage() {
  const router   = useRouter();
  const toast    = useToast();
  const { user } = useUser();

  const [tokenInput, setTokenInput] = useState("");
  const [lookupToken, setLookupToken] = useState<string | null>(null);
  const [ground,     setGround]       = useState<0 | 1 | null>(null);
  const [notes,      setNotes]        = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [result,      setResult]      = useState<{ txHash: string; tokenId: string } | null>(null);

  const { data: title, isLoading: titleLoading, error: titleError } = useTitleLookup(lookupToken);

  // Guard
  if (user?.role !== "GOVERNOR") {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-20">
          <Shield size={32} className="text-[#EF4444] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-[#AAB4CC]">Governor role required for revocation.</p>
        </div>
      </AppLayout>
    );
  }

  const handleRevoke = async () => {
    if (!title || ground === null) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/titles/${title.token_id}/revoke`, {
        ground,
        governorPrivateKey: process.env.NEXT_PUBLIC_GOVERNOR_KEY ?? "",
      });
      const { txHash, tokenId } = res.data as { txHash: string; tokenId: string };
      setResult({ txHash, tokenId });
      setConfirmOpen(false);
      toast.success("Revocation Completed", `Token #${tokenId} has been revoked.`);
    } catch (err: unknown) {
      toast.error("Revocation Failed", err instanceof Error ? err.message : "Contact system administrator.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <AppLayout pageTitle="Revocation Complete">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-[#EF4444]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Revocation Completed</h2>
          <p className="text-[#AAB4CC] mb-5">
            Token #{result.tokenId} has been revoked and the event recorded on the blockchain.
          </p>
          <div className="card text-left mb-6">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-[#AAB4CC]">Token ID</dt>
                <dd className="text-sm font-mono text-[#EF4444]">#{result.tokenId}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC]">Transaction Hash</dt>
                <dd><TxHashDisplay hash={result.txHash} /></dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC]">Status</dt>
                <dd><StatusBadge status="REVOKED" /></dd>
              </div>
            </dl>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setResult(null); setLookupToken(null); setTokenInput(""); setGround(null); setNotes(""); }}
              className="btn-secondary"
            >
              New Revocation
            </button>
            <button onClick={() => router.push("/governor/history")} className="btn-primary">
              View History
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Revocation">
      {/* Warning banner */}
      <div className="mb-5 flex items-start gap-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-4">
        <AlertTriangle size={20} className="text-[#EF4444] shrink-0 mt-0.5" />
        <p className="text-sm text-[#EF4444]">
          <strong>Statutory Revocation — Consequential Action.</strong>{" "}
          This permanently revokes a blockchain-issued land title. It cannot be undone.
          Legal authority: <em>Land Use Act 1978, Section 28.</em>
        </p>
      </div>

      <PageHeader
        title="Statutory Revocation"
        description="Revoke a land title NFT under the Land Use Act (1978)"
        breadcrumbs={[
          { label: "Governor", href: "/governor/dashboard" },
          { label: "Revoke Title" },
        ]}
      />

      <div className="max-w-2xl space-y-5">
        {/* Step 1: Token lookup */}
        <div className="card">
          <h2 className="text-sm font-bold text-white mb-4">
            <Hash size={15} className="inline mr-1 text-[#168BFF]" />
            Step 1 — Look Up Token
          </h2>
          <div className="flex gap-2">
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLookupToken(tokenInput.trim())}
              className="input flex-1"
              placeholder="Enter NFT Token ID (e.g. 42)"
            />
            <button
              onClick={() => setLookupToken(tokenInput.trim())}
              className="btn-primary shrink-0"
            >
              <Search size={16} />
              Look Up
            </button>
          </div>

          {titleLoading && <p className="text-xs text-[#AAB4CC] mt-2">Looking up token…</p>}
          {titleError  && <p className="text-xs text-[#EF4444] mt-2">Token not found or error.</p>}

          {title && (
            <div className={clsx(
              "mt-4 rounded-xl border p-4",
              title.is_revoked ? "border-[#EF4444]/30 bg-[#EF4444]/10" : "border-[#13C98A]/30 bg-[#13C98A]/10"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={title.is_revoked ? "REVOKED" : "ACTIVE"} />
                <span className="text-xs font-mono text-white">Token #{title.token_id}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[#AAB4CC]">Owner Address</dt>
                  <dd className="font-mono text-white truncate">{title.owner_address}</dd>
                </div>
                <div>
                  <dt className="text-[#AAB4CC]">Location</dt>
                  <dd className="text-white">
                    {(title.parcels as { lga?: string; state?: string } | undefined)?.lga ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#AAB4CC]">Issued</dt>
                  <dd className="text-white">{format(parseISO(title.issued_at), "d MMM yyyy")}</dd>
                </div>
                <div>
                  <dt className="text-[#AAB4CC]">Issuance TX</dt>
                  <dd><TxHashDisplay hash={title.tx_hash} truncate={5} /></dd>
                </div>
              </dl>
              {title.is_revoked && (
                <p className="mt-2 text-xs text-[#EF4444] font-medium">
                  ⚠ This title is already revoked.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Ground */}
        {title && !title.is_revoked && (
          <div className="card">
            <h2 className="text-sm font-bold text-white mb-4">
              <Scale size={15} className="inline mr-1 text-[#6338F5]" />
              Step 2 — Select Statutory Ground
            </h2>
            <div className="space-y-3">
              {GROUNDS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGround(g.value)}
                  className={clsx(
                    "w-full text-left rounded-xl border p-4 transition-all",
                    ground === g.value
                      ? "border-[#EF4444] bg-[#EF4444]/10"
                      : "border-[#29345A] hover:border-[#EF4444]/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{g.label}</p>
                      <p className="text-xs text-[#AAB4CC] mt-1">{g.desc}</p>
                      <p className="text-xs text-[#6338F5] mt-1 font-medium">{g.legal}</p>
                    </div>
                    {ground === g.value && (
                      <CheckCircle2 size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Notes */}
        {title && !title.is_revoked && ground !== null && (
          <div className="card">
            <h2 className="text-sm font-bold text-white mb-3">
              Step 3 — Evidence and Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Provide supporting evidence, case reference, or explanatory notes…"
            />

            <button
              onClick={() => setConfirmOpen(true)}
              className="btn-danger w-full mt-4 justify-center"
            >
              <Shield size={16} />
              Proceed to Confirmation
            </button>
          </div>
        )}
      </div>

      {/* High-severity confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRevoke}
        loading={submitting}
        severity="critical"
        title="Confirm Statutory Revocation"
        description="You are about to permanently revoke this land title on the blockchain."
        confirmLabel="Revoke Title — I Confirm"
        cancelLabel="Cancel — Do Not Revoke"
        details={
          title && (
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#AAB4CC]">Token ID</dt>
                <dd className="font-mono text-white">#{title.token_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#AAB4CC]">Ground</dt>
                <dd className="text-white">
                  {GROUNDS.find((g) => g.value === ground)?.label ?? "—"}
                </dd>
              </div>
            </dl>
          )
        }
      />
    </AppLayout>
  );
}
