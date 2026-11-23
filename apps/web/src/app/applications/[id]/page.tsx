"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { applicationsApi, auditApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/layout/Navbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Application {
  id: string;
  status: string;
  ownerName: string;
  nationalId: string;
  surveyPlanNumber?: string;
  legalClearanceHash?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditEvent {
  id: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  actorRole?: string;
  createdAt: string;
}

const PIPELINE_STAGES = [
  "SUBMITTED",
  "SPATIAL_VERIFIED",
  "OWNERSHIP_VERIFIED",
  "LEGAL_VERIFIED",
  "APPROVED",
  "BLOCKCHAIN_REGISTERED",
  "NFT_ISSUED",
  "COMPLETED",
];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [appRes, auditRes] = await Promise.all([
        applicationsApi.getOne(id),
        auditApi.getTrail("application", id),
      ]);
      setApp(appRes.data);
      setAudit(auditRes.data);
    } catch (e: any) {
      setError("Could not load application.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // ── Supabase realtime: live status updates ───────────────────────
    const channel = supabase
      .channel(`app-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "applications", filter: `id=eq.${id}` },
        (payload: any) => {
          setApp((prev) => prev ? { ...prev, ...payload.new } : prev);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const currentStageIdx = app ? PIPELINE_STAGES.indexOf(app.status) : -1;

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );

  if (error || !app) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="card text-red-600">{error ?? "Application not found."}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application</h1>
            <p className="text-sm text-gray-500 font-mono mt-1">{app.id}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {app.status === "REJECTED" && app.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ❌ Rejected: {app.rejectionReason}
          </div>
        )}

        {/* Pipeline progress */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4 text-gray-800">Registration Pipeline</h2>
          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
            <div
              className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-700"
              style={{
                width: `${currentStageIdx >= 0
                  ? (currentStageIdx / (PIPELINE_STAGES.length - 1)) * 100
                  : 0}%`,
              }}
            />
            <div className="flex justify-between relative">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage} className="flex flex-col items-center gap-1 w-16">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10
                      ${i <= currentStageIdx ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}
                  >
                    {i < currentStageIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs text-center leading-tight ${i <= currentStageIdx ? "text-primary font-medium" : "text-gray-400"}`}>
                    {stage.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4 text-gray-800">Application Details</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Owner Name",          app.ownerName],
              ["National ID",         app.nationalId],
              ["Survey Plan No.",     app.surveyPlanNumber ?? "—"],
              ["Legal Clearance",     app.legalClearanceHash ?? "—"],
              ["Submitted",           new Date(app.createdAt).toLocaleString()],
              ["Last Updated",        new Date(app.updatedAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500 font-medium">{label}</dt>
                <dd className="text-gray-800 font-mono text-xs mt-0.5 break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Audit trail */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4 text-gray-800">
            Audit Trail
            <span className="ml-2 text-xs text-gray-400 font-normal">(immutable)</span>
          </h2>
          {audit.length === 0 ? (
            <p className="text-sm text-gray-400">No audit events yet.</p>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-4 pl-4">
              {audit.map((ev) => (
                <li key={ev.id} className="relative">
                  <div className="absolute -left-2 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{ev.eventType.replace(/_/g, " ")}</span>
                      {ev.fromStatus && ev.toStatus && (
                        <span className="text-xs text-gray-500 ml-2">
                          {ev.fromStatus} → {ev.toStatus}
                        </span>
                      )}
                      {ev.actorRole && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {ev.actorRole}
                        </span>
                      )}
                    </div>
                    <time className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {new Date(ev.createdAt).toLocaleString()}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}
