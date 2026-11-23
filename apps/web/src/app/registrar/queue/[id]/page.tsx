"use client";
/**
 * R03+R04 — Application Review Detail + Approval/Rejection
 */
import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, CheckCircle2, XCircle, RotateCcw,
  MapPin, Users, Scale, FileText, Loader2, AlertCircle
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PipelineTimeline } from "@/components/ui/PipelineTimeline";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

type ApplicationFull = {
  id:              string;
  status:          string;
  owner_name:      string;
  national_id:     string;
  survey_plan_number?: string | null;
  created_at:      string;
  rejection_reason?: string | null;
  parcels?:        { id?: string; lga?: string; state?: string; area_sqm?: number; coordinates?: unknown };
  oracle_verifications?: Array<{ outcome: string; score: number; reasons: string[] }>;
  documents?:      Array<{ id: string; file_name: string; document_type: string }>;
};

function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: ["registrar-app", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id, status, owner_name, national_id, survey_plan_number, created_at, rejection_reason,
          parcels(id, lga, state, area_sqm, coordinates),
          oracle_verifications(outcome, score, reasons),
          documents(id, file_name, document_type)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as ApplicationFull;
    },
  });
}

type Action = "approve" | "reject" | "return" | null;

export default function RegistrarReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }      = use(params);
  const toast       = useToast();
  const queryClient = useQueryClient();

  const { data: app, isLoading, error } = useApplicationDetail(id);
  const [action,         setAction]       = useState<Action>(null);
  const [confirmOpen,    setConfirmOpen]   = useState(false);
  const [rejectReason,   setRejectReason]  = useState("");
  const [submitting,     setSubmitting]    = useState(false);
  const [actionComplete, setActionComplete] = useState(false);

  const parcel  = app?.parcels as { lga?: string; state?: string; area_sqm?: number } | undefined;
  const oracle  = app?.oracle_verifications?.[0];
  const docs    = app?.documents ?? [];

  const handleAction = async () => {
    if (!action || !app) return;
    if (action === "reject" && !rejectReason.trim()) {
      toast.error("Reason required", "Enter a reason for rejection.");
      return;
    }
    setSubmitting(true);
    try {
      if (action === "approve") {
        await api.patch(`/applications/${id}/approve`);
        toast.success("Application Approved", "Blockchain registration will begin shortly.");
      } else if (action === "reject") {
        await api.patch(`/applications/${id}/reject`, {
          stage: app.status,
          reason: rejectReason,
        });
        toast.error("Application Rejected", "The applicant will be notified.");
      } else if (action === "return") {
        await api.patch(`/applications/${id}/return`, { reason: rejectReason });
        toast.warning("Returned for Review", "Application sent back to applicant.");
      }
      queryClient.invalidateQueries({ queryKey: ["registrar-app", id] });
      queryClient.invalidateQueries({ queryKey: ["registrar-queue"] });
      queryClient.invalidateQueries({ queryKey: ["registrar-stats"] });
      setActionComplete(true);
      setConfirmOpen(false);
    } catch (err: unknown) {
      toast.error("Action failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;
  if (error || !app) {
    return (
      <AppLayout>
        <div className="card text-center py-12 text-[#EF4444]">
          Application not found.{" "}
          <Link href="/registrar/queue" className="text-[#6338F5] underline">Back to Queue</Link>
        </div>
      </AppLayout>
    );
  }

  const isReviewable = ["SPATIAL_VERIFIED","OWNERSHIP_VERIFIED","LEGAL_VERIFIED"].includes(app.status);

  return (
    <AppLayout pageTitle="Application Review">
      <PageHeader
        title={`Review Application #${id.slice(0, 8)}`}
        breadcrumbs={[
          { label: "Registrar",    href: "/registrar/dashboard" },
          { label: "Review Queue", href: "/registrar/queue" },
          { label: id.slice(0, 8) },
        ]}
        action={
          <Link href="/registrar/queue" className="btn-secondary text-sm">
            <ChevronLeft size={15} /> Back
          </Link>
        }
      />

      {actionComplete && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-[#13C98A]/10 border border-[#13C98A]/30 p-4">
          <CheckCircle2 size={18} className="text-[#13C98A] shrink-0" />
          <p className="text-sm text-[#13C98A] font-medium">Action completed. The pipeline has been updated.</p>
          <Link href="/registrar/queue" className="ml-auto text-xs text-[#6338F5] underline">Back to Queue</Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Application info */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Applicant & Application</h2>
              <StatusBadge status={app.status} />
            </div>
            <dl className="grid grid-cols-2 gap-4">
              {[
                ["Owner Name",    app.owner_name],
                ["National ID",   app.national_id],
                ["Survey Plan",   app.survey_plan_number ?? "—"],
                ["Location",      parcel?.lga ? `${parcel.lga}, ${parcel.state}` : "—"],
                ["Area",          parcel?.area_sqm ? `${parcel.area_sqm.toFixed(2)} m²` : "—"],
                ["Submitted",     format(parseISO(app.created_at), "d MMM yyyy, HH:mm")],
              ].map(([l, v]) => (
                <div key={l}>
                  <dt className="text-xs text-[#AAB4CC] mb-0.5">{l}</dt>
                  <dd className="text-sm text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* GIS verification result */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-[#168BFF]" />
              <h2 className="text-sm font-bold text-white">GIS Spatial Verification</h2>
              <span className={clsx("badge text-xs", app.status !== "SUBMITTED" ? "badge-success" : "badge-warning")}>
                {app.status !== "SUBMITTED" ? "Passed" : "Pending"}
              </span>
            </div>
            <p className="text-xs text-[#AAB4CC]">
              {app.status !== "SUBMITTED"
                ? "Parcel geometry and overlap checks passed. No conflicting parcels found."
                : "Spatial verification not yet completed."}
            </p>
          </div>

          {/* Ownership verification */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-[#6338F5]" />
              <h2 className="text-sm font-bold text-white">Ownership Verification</h2>
              {oracle && (
                <span className={clsx(
                  "badge text-xs",
                  oracle.outcome === "VERIFIED" ? "badge-success" :
                  oracle.outcome === "OWNERSHIP_CONFLICT" ? "badge-danger" : "badge-warning"
                )}>
                  {oracle.outcome.replace(/_/g, " ")}
                </span>
              )}
            </div>
            {oracle ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 rounded-full bg-[#29345A] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#6338F5]"
                      style={{ width: `${oracle.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums">{oracle.score}%</span>
                </div>
                {oracle.reasons?.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {oracle.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-[#AAB4CC] flex items-start gap-1.5">
                        <span className="mt-1 w-1 h-1 rounded-full bg-[#AAB4CC] shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-xs text-[#AAB4CC]">Ownership verification result not available.</p>
            )}
          </div>

          {/* Documents checklist */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-[#F0B429]" />
              <h2 className="text-sm font-bold text-white">Document Checklist ({docs.length})</h2>
            </div>
            {docs.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-[#F0B429]">
                <AlertCircle size={14} /> No documents uploaded.
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#111832]">
                    <CheckCircle2 size={14} className="text-[#13C98A] shrink-0" />
                    <span className="text-sm text-white flex-1 truncate">{doc.file_name}</span>
                    <span className="text-xs text-[#AAB4CC]">{doc.document_type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action area */}
          {isReviewable && !actionComplete && (
            <div className="card border-[#29345A]">
              <h2 className="text-sm font-bold text-white mb-4">
                <Scale size={15} className="inline mr-1 text-[#6338F5]" />
                Registrar Decision
              </h2>

              {(action === "reject" || action === "return") && (
                <div className="mb-4">
                  <label className="label">
                    {action === "reject" ? "Rejection Reason" : "Return Reason"} <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input min-h-[80px] resize-y"
                    placeholder="Provide a clear reason…"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setAction("approve"); setConfirmOpen(true); }}
                  className="btn-primary flex-1 justify-center"
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
                <button
                  onClick={() => setAction((a) => a === "reject" ? null : "reject")}
                  className="btn-danger flex-1 justify-center"
                >
                  <XCircle size={16} />
                  Reject
                </button>
                <button
                  onClick={() => setAction((a) => a === "return" ? null : "return")}
                  className="btn-secondary flex-1 justify-center"
                >
                  <RotateCcw size={16} />
                  Return for Review
                </button>
              </div>

              {(action === "reject" || action === "return") && rejectReason.trim() && (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="mt-3 w-full btn-secondary"
                >
                  Confirm {action === "reject" ? "Rejection" : "Return"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="card h-fit">
          <h2 className="text-sm font-bold text-white mb-4">Pipeline Status</h2>
          <PipelineTimeline
            currentStatus={app.status}
            rejectionReason={app.rejection_reason}
          />
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleAction}
        loading={submitting}
        severity={action === "approve" ? "normal" : "high"}
        title={
          action === "approve" ? "Approve Application" :
          action === "reject"  ? "Reject Application" :
          "Return for Review"
        }
        description={
          action === "approve"
            ? "This will trigger blockchain registration and NFT issuance."
            : action === "reject"
            ? "The applicant will be notified with the rejection reason."
            : "The application will be returned to the applicant for revision."
        }
        confirmLabel={
          action === "approve" ? "Approve & Proceed" :
          action === "reject"  ? "Confirm Rejection" : "Return Application"
        }
      />
    </AppLayout>
  );
}
