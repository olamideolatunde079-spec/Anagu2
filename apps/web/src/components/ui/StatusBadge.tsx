/**
 * StatusBadge — coloured pill showing application, parcel, or title status.
 * Uses ANAGU dark design tokens.
 */

interface StatusConfig {
  cls: string;
  dot: string;
  label: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  SUBMITTED:             { cls: "badge-info",    dot: "bg-[#168BFF]", label: "Submitted" },
  SPATIAL_VERIFIED:      { cls: "badge-info",    dot: "bg-[#168BFF]", label: "Spatial Verified" },
  OWNERSHIP_VERIFIED:    { cls: "badge-purple",  dot: "bg-[#6338F5]", label: "Ownership Verified" },
  LEGAL_VERIFIED:        { cls: "badge-purple",  dot: "bg-[#6338F5]", label: "Legal Verified" },
  APPROVED:              { cls: "badge-success", dot: "bg-[#13C98A]", label: "Approved" },
  BLOCKCHAIN_REGISTERED: { cls: "badge-success", dot: "bg-[#13C98A]", label: "Blockchain Registered" },
  NFT_ISSUED:            { cls: "badge-success", dot: "bg-[#13C98A]", label: "NFT Issued" },
  COMPLETED:             { cls: "badge-success", dot: "bg-[#13C98A]", label: "Completed" },
  REJECTED:              { cls: "badge-danger",  dot: "bg-[#EF4444]", label: "Rejected" },
  CANCELLED:             { cls: "badge-neutral", dot: "bg-[#AAB4CC]", label: "Cancelled" },
  REVOKED:               { cls: "badge-danger",  dot: "bg-[#EF4444]", label: "Revoked" },
  PENDING:               { cls: "badge-warning", dot: "bg-[#F0B429]", label: "Pending" },
  ACTIVE:                { cls: "badge-success", dot: "bg-[#13C98A]", label: "Active" },
  DISPUTED:              { cls: "badge-warning", dot: "bg-[#F0B429]", label: "Disputed" },
};

interface StatusBadgeProps {
  status: string;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status] ?? {
    cls: "badge-neutral",
    dot: "bg-[#AAB4CC]",
    label: status.replace(/_/g, " "),
  };

  return (
    <span className={`badge ${cfg.cls}`}>
      {showDot && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      )}
      {cfg.label}
    </span>
  );
}
