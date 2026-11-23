/**
 * LoadingSpinner — dark-themed animated spinner.
 */
import { clsx } from "clsx";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}

const SIZE_MAP = {
  xs: "h-3 w-3 border",
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
  xl: "h-16 w-16 border-[3px]",
} as const;

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <span role="status" className={clsx("inline-flex flex-col items-center gap-2", className)}>
      <span
        className={clsx(
          "animate-spin rounded-full border-[#29345A] border-t-[#6338F5]",
          SIZE_MAP[size]
        )}
        aria-hidden="true"
      />
      {label && <span className="text-sm text-[#AAB4CC]">{label}</span>}
      {!label && <span className="sr-only">Loading…</span>}
    </span>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-[#AAB4CC]">{label}</p>
    </div>
  );
}
