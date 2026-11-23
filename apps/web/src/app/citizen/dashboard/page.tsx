"use client";
/**
 * C01 — Citizen Dashboard
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark, PlusCircle, Activity, FileText,
  MapPin, Clock, CheckCircle2, ChevronRight, ArrowRight
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import type { Application } from "@/types";
import { format, parseISO } from "date-fns";

function useCitizenStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["citizen-stats", userId],
    enabled:  !!userId,
    queryFn: async () => {
      if (!userId) return { lands: 0, titles: 0, inProgress: 0, recent: [] };

      const [appsRes, titlesRes] = await Promise.all([
        supabase.from("applications").select("id, status, created_at, applicant_id").eq("applicant_id", userId),
        supabase.from("land_titles").select("id").eq("owner_user_id", userId).eq("is_revoked", false),
      ]);

      const apps   = (appsRes.data   ?? []) as unknown as Application[];
      const titles = titlesRes.data  ?? [];

      const inProgress = apps.filter((a) =>
        !["COMPLETED","REJECTED","CANCELLED"].includes(a.status)
      ).length;

      return {
        lands:      apps.filter((a) => a.status === "COMPLETED").length,
        titles:     titles.length,
        inProgress,
        recent:     apps.slice(0, 5),
      };
    },
  });
}

export default function CitizenDashboard() {
  const { user, loading: userLoading } = useUser();
  const { data, isLoading } = useCitizenStats(user?.id);

  if (userLoading) {
    return (
      <AppLayout>
        <PageLoader />
      </AppLayout>
    );
  }

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <AppLayout pageTitle="Dashboard">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your land registration overview"
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="My Lands"
          value={data?.lands ?? "—"}
          icon={<Landmark size={20} />}
          loading={isLoading}
          accentColor="text-[#168BFF]"
        />
        <MetricCard
          label="Verified Titles"
          value={data?.titles ?? "—"}
          icon={<CheckCircle2 size={20} />}
          loading={isLoading}
          accentColor="text-[#13C98A]"
        />
        <MetricCard
          label="In Progress"
          value={data?.inProgress ?? "—"}
          icon={<Activity size={20} />}
          loading={isLoading}
          accentColor="text-[#F0B429]"
        />
        <MetricCard
          label="Total Applications"
          value={data?.recent?.length ?? "—"}
          icon={<FileText size={20} />}
          loading={isLoading}
          accentColor="text-[#6338F5]"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card flex flex-col gap-3">
          <h2 className="text-base font-semibold text-white mb-1">Quick Actions</h2>
          <Link
            href="/citizen/apply"
            className="flex items-center gap-3 rounded-xl border border-[#6338F5]/40 bg-[#6338F5]/10 p-4 hover:border-[#6338F5] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
              <PlusCircle size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Register New Land</div>
              <div className="text-xs text-[#AAB4CC]">Start a land title application</div>
            </div>
            <ArrowRight size={16} className="text-[#6338F5] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/citizen/applications"
            className="flex items-center gap-3 rounded-xl border border-[#29345A] p-4 hover:border-[#168BFF]/50 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#168BFF]/10 flex items-center justify-center shrink-0">
              <Activity size={20} className="text-[#168BFF]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Track Applications</div>
              <div className="text-xs text-[#AAB4CC]">View pipeline status</div>
            </div>
            <ChevronRight size={16} className="text-[#AAB4CC]" />
          </Link>

          <Link
            href="/verify"
            className="flex items-center gap-3 rounded-xl border border-[#29345A] p-4 hover:border-[#13C98A]/50 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#13C98A]/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-[#13C98A]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Verify a Title</div>
              <div className="text-xs text-[#AAB4CC]">Public title lookup</div>
            </div>
            <ChevronRight size={16} className="text-[#AAB4CC]" />
          </Link>
        </div>

        {/* Recent applications */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Applications</h2>
            <Link href="/citizen/applications" className="text-xs text-[#6338F5] hover:underline">
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-[#29345A]/30 animate-pulse" />
              ))}
            </div>
          ) : data?.recent?.length === 0 ? (
            <EmptyState
              icon={<FileText size={24} />}
              title="No applications yet"
              message="Submit your first land application to get started."
              action={
                <Link href="/citizen/apply" className="btn-primary text-sm">
                  <PlusCircle size={14} />
                  New Application
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {(data?.recent ?? []).map((app) => (
                <Link
                  key={app.id}
                  href={`/citizen/applications/${app.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[#29345A] p-3 hover:border-[#6338F5]/50 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#111832] flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-[#168BFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      Application #{app.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[#AAB4CC]">
                      <Clock size={10} className="inline mr-1" />
                      {format(parseISO(app.createdAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
