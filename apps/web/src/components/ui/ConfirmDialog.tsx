"use client";
/**
 * ConfirmDialog — high-severity confirmation modal.
 * Used especially for revocation actions.
 */
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { clsx } from "clsx";

interface ConfirmDialogProps {
  open:         boolean;
  onClose:      () => void;
  onConfirm:    () => void | Promise<void>;
  loading?:     boolean;
  title:        string;
  description:  string;
  severity?:    "normal" | "high" | "critical";
  confirmLabel?: string;
  cancelLabel?:  string;
  details?:     React.ReactNode;
}

const SEVERITY_CONFIG = {
  normal: {
    iconBg:  "bg-[#6338F5]/20",
    icon:    <AlertTriangle size={22} className="text-[#6338F5]" />,
    btnCls:  "btn-primary",
  },
  high: {
    iconBg: "bg-[#F0B429]/15",
    icon:   <AlertTriangle size={22} className="text-[#F0B429]" />,
    btnCls: "btn-danger",
  },
  critical: {
    iconBg: "bg-[#EF4444]/15",
    icon:   <AlertTriangle size={22} className="text-[#EF4444]" />,
    btnCls: "btn-danger",
  },
} as const;

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  title,
  description,
  severity = "normal",
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  details,
}: ConfirmDialogProps) {
  const cfg = SEVERITY_CONFIG[severity];

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center", cfg.iconBg)}>
          {cfg.icon}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-[#AAB4CC]">{description}</p>
        </div>

        {details && (
          <div className="w-full rounded-xl bg-[#111832] border border-[#29345A] p-4 text-left text-sm">
            {details}
          </div>
        )}

        {severity === "critical" && (
          <div className="w-full rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-3 text-left">
            <p className="text-xs text-[#EF4444] font-medium">
              ⚠ This action is consequential and irreversible. It will be recorded permanently on the blockchain.
            </p>
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(cfg.btnCls, "flex-1 justify-center")}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
