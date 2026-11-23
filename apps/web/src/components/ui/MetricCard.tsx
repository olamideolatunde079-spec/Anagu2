/**
 * MetricCard — dark card with icon, stat, label, and optional trend.
 */
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";

interface MetricCardProps {
  label:       string;
  value:       string | number;
  icon?:       React.ReactNode;
  trend?:      { direction: "up" | "down" | "flat"; label: string };
  accentColor?: string; // tailwind text colour class
  className?:  string;
  loading?:    boolean;
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  accentColor = "text-[#168BFF]",
  className,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={clsx("metric-card animate-pulse", className)}>
        <div className="h-8 w-8 rounded-lg bg-[#29345A] mb-3" />
        <div className="h-8 w-24 rounded bg-[#29345A] mb-2" />
        <div className="h-4 w-32 rounded bg-[#29345A]" />
      </div>
    );
  }

  return (
    <div className={clsx("metric-card", className)}>
      {icon && (
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#29345A]/60", accentColor)}>
          {icon}
        </div>
      )}
      <div className="metric-value tabular-nums">{value}</div>
      <div className="metric-label mt-0.5">{label}</div>
      {trend && (
        <div className={clsx(
          "flex items-center gap-1 mt-2 text-xs font-medium",
          trend.direction === "up"   ? "text-[#13C98A]" :
          trend.direction === "down" ? "text-[#EF4444]" : "text-[#AAB4CC]"
        )}>
          {trend.direction === "up"   ? <TrendingUp  size={12} /> :
           trend.direction === "down" ? <TrendingDown size={12} /> : <Minus size={12} />}
          {trend.label}
        </div>
      )}
    </div>
  );
}
