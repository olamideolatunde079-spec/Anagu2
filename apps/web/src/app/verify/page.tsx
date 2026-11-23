"use client";
/**
 * P05 — Public Title Verification
 * No auth required. Only shows public information.
 */
import { useState } from "react";
import { Search, CheckCircle2, XCircle, AlertCircle, Loader2, Landmark } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { TxHashDisplay } from "@/components/ui/TxHashDisplay";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

type PublicTitle = {
  token_id:    string;
  is_revoked:  boolean;
  issued_at:   string;
  revoked_at?: string | null;
  revocation_ground?: string | null;
  tx_hash:     string;
  parcels?: { lga?: string; state?: string };
};

type SearchState = "idle" | "loading" | "found" | "not_found" | "revoked" | "error";

const GROUND_LABELS: Record<string, string> = {
  OVERRIDING_PUBLIC_INTEREST:   "Overriding Public Interest",
  BREACH_OF_STATUTORY_CONDITION:"Breach of Statutory Condition",
};

export default function PublicVerificationPage() {
  const [input,  setInput]   = useState("");
  const [state,  setState]   = useState<SearchState>("idle");
  const [title,  setTitle]   = useState<PublicTitle | null>(null);
  const [error,  setError]   = useState<string | null>(null);

  const search = async () => {
    const q = input.trim();
    if (!q) return;
    setState("loading");
    setTitle(null);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from("land_titles")
        .select("token_id, is_revoked, issued_at, revoked_at, revocation_ground, tx_hash, parcels(lga, state)")
        .eq("token_id", q)
        .single();

      if (err || !data) {
        setState("not_found");
        return;
      }

      const t = data as unknown as PublicTitle;
      setTitle(t);
      setState(t.is_revoked ? "revoked" : "found");
    } catch {
      setError("Service unavailable. Please try again later.");
      setState("error");
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-24">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#29345A] bg-[#111832] px-4 py-1.5 text-xs text-[#AAB4CC] mb-5">
            <Landmark size={12} className="text-[#13C98A]" />
            Public Title Registry
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3">
            Verify a Land Title
          </h1>
          <p className="text-[#AAB4CC]">
            Enter an NFT token ID to verify the authenticity and status of a land title.
            No registration required.
          </p>
        </div>

        {/* Search bar */}
        <div className="card mb-6">
          <label htmlFor="token-search" className="label text-sm mb-2">
            NFT Token ID
          </label>
          <div className="flex gap-2">
            <input
              id="token-search"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="input flex-1"
              placeholder="Enter token ID, e.g. 42"
              autoFocus
            />
            <button
              onClick={search}
              disabled={state === "loading" || !input.trim()}
              className="btn-primary shrink-0"
            >
              {state === "loading"
                ? <Loader2 size={16} className="animate-spin" />
                : <><Search size={16} /> Verify</>}
            </button>
          </div>
        </div>

        {/* Results */}
        {state === "found" && title && (
          <div className="card border-[#13C98A]/30 bg-[#13C98A]/5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#13C98A]/20 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-[#13C98A]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Title Verified — Active</h2>
                <p className="text-xs text-[#13C98A]">This is a valid, non-revoked blockchain title.</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Token ID</dt>
                <dd className="font-mono font-bold text-[#13C98A]">#{title.token_id}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Status</dt>
                <dd className="text-white">Active</dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Location</dt>
                <dd className="text-white">
                  {(title.parcels as { lga?: string; state?: string } | undefined)?.lga ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Issue Date</dt>
                <dd className="text-white">{format(parseISO(title.issued_at), "d MMMM yyyy")}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Transaction Hash</dt>
                <dd><TxHashDisplay hash={title.tx_hash} /></dd>
              </div>
            </dl>
            <div className="mt-5 p-3 rounded-xl bg-[#111832] border border-[#29345A]">
              <p className="text-xs text-[#AAB4CC]">
                This title has been verified against the ANAGU blockchain registry.
                Private owner details are not disclosed in public verification.
              </p>
            </div>
          </div>
        )}

        {state === "revoked" && title && (
          <div className="card border-[#EF4444]/30 bg-[#EF4444]/5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/20 flex items-center justify-center">
                <XCircle size={24} className="text-[#EF4444]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Title Revoked</h2>
                <p className="text-xs text-[#EF4444]">This title has been legally revoked.</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Token ID</dt>
                <dd className="font-mono font-bold text-[#EF4444]">#{title.token_id}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Status</dt>
                <dd className="text-[#EF4444] font-semibold">Revoked</dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Revocation Ground</dt>
                <dd className="text-white text-xs">
                  {title.revocation_ground ? GROUND_LABELS[title.revocation_ground] ?? title.revocation_ground : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#AAB4CC] mb-0.5">Revoked On</dt>
                <dd className="text-white">
                  {title.revoked_at ? format(parseISO(title.revoked_at), "d MMM yyyy") : "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {state === "not_found" && (
          <div className="card border-[#F0B429]/30 bg-[#F0B429]/5 text-center py-10">
            <AlertCircle size={32} className="text-[#F0B429] mx-auto mb-3" />
            <h2 className="text-base font-bold text-white mb-1">Title Not Found</h2>
            <p className="text-sm text-[#AAB4CC]">
              No title was found with token ID <strong className="text-white font-mono">#{input}</strong>.
              Double-check the ID and try again.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="card border-[#EF4444]/30 bg-[#EF4444]/5 text-center py-10">
            <AlertCircle size={32} className="text-[#EF4444] mx-auto mb-3" />
            <p className="text-sm text-[#EF4444]">{error}</p>
          </div>
        )}

        {/* Info note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#AAB4CC]">
            Looking to register land?{" "}
            <Link href="/register" className="text-[#6338F5] hover:underline">Create an account</Link>
            {" "}to start the application process.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
