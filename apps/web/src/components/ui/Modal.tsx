"use client";
/**
 * Modal — dark overlay dialog with header, body, and footer slots.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface ModalProps {
  open:        boolean;
  onClose:     () => void;
  title?:      string;
  description?: string;
  children:    React.ReactNode;
  footer?:     React.ReactNode;
  size?:       "sm" | "md" | "lg" | "xl" | "full";
  className?:  string;
}

const SIZE_MAP = {
  sm:   "max-w-md",
  md:   "max-w-lg",
  lg:   "max-w-2xl",
  xl:   "max-w-4xl",
  full: "max-w-[95vw]",
} as const;

export function Modal({ open, onClose, title, description, children, footer, size = "md", className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#080D24]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          "relative z-10 w-full rounded-2xl border border-[#29345A]",
          "bg-[#171A3B] shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-fade-in",
          SIZE_MAP[size],
          className
        )}
      >
        {/* Header */}
        {(title ?? description) && (
          <div className="flex items-start justify-between p-6 pb-0">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-[#AAB4CC]">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 rounded-lg p-1.5 text-[#AAB4CC] hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 pb-6 border-t border-[#29345A] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
