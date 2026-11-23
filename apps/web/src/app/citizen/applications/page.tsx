"use client";
/**
 * C08 — Application Tracking
 */
import { useState } from "react";
import Link from "next/link";
import {
  FileText, Search, ChevronRight, Clock, PlusCircle
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PipelineTimeline } from "@/components/ui/PipelineTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useUser } from "@/hooks/useUser";
import { useRealtimeApplications } from "@/hooks/useRealtimeApplications";
import { clsx } from "clsx";
import { format, parseISO } from "date-fns";
import type { Application } from "@/types";

export default function ApplicationTrackingPage() {
  const { user } = useUser();
  const { applications, loading, error } = useRealtimeApplications(user?.id);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Application | null>(null);

  const filtered = applications.filter((a) =>
    !search || a.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout pageTitle="Application Tracking">
      <PageHeader
        title="My Applications"
        description="Real-time status updates on all your land registration applications"
        breadcrumbs={[{ label: "Applications" }]}
        action={
          <Link href="/citizen/apply" className="btn-primary text-sm">
            <PlusCircle size={15} />
            New Application
          </Link>
        }
      />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Application list */}
        <div className="lg:col-span-2">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB4CC]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID…"
              className="input pl-9 h-10 text-sm"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="md" label="Loading…" /></div>
          ) : error ? (
            <div className="text-sm text-[#EF4444] py-4">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="No applications"
              message="Submit your first application to track its progress."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelected(app)}
                  className={clsx(
                    "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                    selected?.id === app.id
                      ? "border-[#6338F5] bg-[#6338F5]/10"
                      : "border-[#29345A] hover:border-[#6338F5]/40"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#111832] flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-[#168BFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white font-mono">
                      #{app.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[#AAB4CC]">
                      <Clock size={9} className="inline mr-0.5" />
                      {format(parseISO(app.createdAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={app.status} />
                    <ChevronRight size={12} className="text-[#AAB4CC]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-white font-mono">
                    Application #{selected.id.slice(0, 8)}
                  </h2>
                  <p className="text-xs text-[#AAB4CC] mt-0.5">
                    Submitted {format(parseISO(selected.createdAt), "d MMMM yyyy")}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <PipelineTimeline
                currentStatus={selected.status}
                rejectionReason={selected.rejectionReason}
              />

              <div className="mt-5 pt-4 border-t border-[#29345A]">
                <Link
                  href={`/citizen/applications/${selected.id}`}
                  className="btn-secondary text-sm"
                >
                  View Full Details
                  <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <FileText size={32} className="text-[#29345A] mb-3" />
              <p className="text-sm text-[#AAB4CC]">Select an application to view its pipeline status</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
