/**
 * PipelineTimeline — 8-stage vertical timeline for land registration.
 */
import {
  Send, MapPin, Users, Scale, CheckCircle, Link2, Award, Bell,
  Loader2, XCircle, Clock
} from "lucide-react";
import { clsx } from "clsx";
import type { ApplicationStatus } from "@/types";

interface Stage {
  key:   ApplicationStatus | string;
  label: string;
  icon:  React.ReactNode;
  desc:  string;
}

const STAGES: Stage[] = [
  { key: "SUBMITTED",             label: "Application Submitted",   icon: <Send    size={16} />, desc: "Your land application has been received." },
  { key: "SPATIAL_VERIFIED",      label: "Spatial Verification",    icon: <MapPin  size={16} />, desc: "GIS geometry and overlap checks passed." },
  { key: "OWNERSHIP_VERIFIED",    label: "Ownership Verification",  icon: <Users   size={16} />, desc: "Community and institutional ownership confirmed." },
  { key: "LEGAL_VERIFIED",        label: "Legal Verification",      icon: <Scale   size={16} />, desc: "Legal documentation reviewed and cleared." },
  { key: "APPROVED",              label: "Registrar Approval",      icon: <CheckCircle size={16} />, desc: "Registrar has approved the application." },
  { key: "BLOCKCHAIN_REGISTERED", label: "Blockchain Registration", icon: <Link2  size={16} />, desc: "Land record anchored to the blockchain." },
  { key: "NFT_ISSUED",            label: "NFT Title Issuance",      icon: <Award   size={16} />, desc: "Digital land title NFT minted to owner." },
  { key: "COMPLETED",             label: "Title Issued",            icon: <Bell    size={16} />, desc: "MQTT notification sent. Registration complete." },
];

const ORDER = STAGES.map((s) => s.key);

function stageStatus(
  stageKey: string,
  currentStatus: string,
): "done" | "active" | "pending" | "rejected" {
  const currentIdx = ORDER.indexOf(currentStatus);
  const stageIdx   = ORDER.indexOf(stageKey);

  if (currentStatus === "REJECTED" || currentStatus === "CANCELLED") {
    if (stageIdx < currentIdx) return "done";
    if (stageIdx === currentIdx) return "rejected";
    return "pending";
  }

  if (stageIdx < currentIdx)  return "done";
  if (stageIdx === currentIdx) return "active";
  return "pending";
}

interface PipelineTimelineProps {
  currentStatus: string;
  rejectionReason?: string | null;
  className?: string;
}

export function PipelineTimeline({ currentStatus, rejectionReason, className }: PipelineTimelineProps) {
  return (
    <ol className={clsx("flex flex-col gap-0", className)} aria-label="Application pipeline progress">
      {STAGES.map((stage, idx) => {
        const status = stageStatus(stage.key, currentStatus);
        const isLast = idx === STAGES.length - 1;

        return (
          <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <div
                className={clsx(
                  "absolute left-4 top-9 bottom-0 w-px",
                  status === "done" ? "bg-[#13C98A]/50" : "bg-[#29345A]"
                )}
                aria-hidden="true"
              />
            )}

            {/* Dot */}
            <div className={clsx(
              "timeline-dot relative z-10 shrink-0",
              status === "done"     && "done",
              status === "active"   && "active",
              status === "rejected" && "!border-[#EF4444] !bg-[#EF4444]/20",
            )}>
              {status === "done"     && <CheckCircle size={14} className="text-[#13C98A]" />}
              {status === "active"   && <Loader2     size={14} className="text-[#6338F5] animate-spin" />}
              {status === "rejected" && <XCircle     size={14} className="text-[#EF4444]" />}
              {status === "pending"  && <Clock       size={14} className="text-[#29345A]" />}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "text-sm font-medium",
                  status === "done"     && "text-white",
                  status === "active"   && "text-[#6338F5]",
                  status === "rejected" && "text-[#EF4444]",
                  status === "pending"  && "text-[#AAB4CC]",
                )}>
                  {stage.label}
                </span>
                {status === "active" && (
                  <span className="badge badge-purple text-[10px] py-0.5 px-2">In Progress</span>
                )}
              </div>
              <p className={clsx(
                "text-xs mt-0.5",
                status === "pending" ? "text-[#29345A]" : "text-[#AAB4CC]"
              )}>
                {stage.desc}
              </p>
              {status === "rejected" && rejectionReason && (
                <p className="text-xs mt-1 text-[#EF4444]">Reason: {rejectionReason}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
