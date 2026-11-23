/**
 * PageHeader — page title, breadcrumbs, and optional action button.
 */
import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { clsx } from "clsx";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title:        string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?:      React.ReactNode;
  className?:   string;
}

export function PageHeader({ title, description, breadcrumbs, action, className }: PageHeaderProps) {
  return (
    <div className={clsx("mb-6", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-[#AAB4CC] mb-2" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            <Home size={12} />
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-[#29345A]" />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-white transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#AAB4CC]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-[#AAB4CC]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
