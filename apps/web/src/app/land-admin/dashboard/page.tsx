"use client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Award, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { format } from "date-fns";

export default function LandAdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["land-admin-stats"],
    queryFn: async () => {
      const [apps, titles, parcels] = await Promise.all([
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("land_titles").select("id", { count: "exact", head: true }),
        supabase.from("parcels").select("id", { count: "exact", head: true }),
      ]);
      return { applications: apps.count ?? 0, titles: titles.count ?? 0, parcels: parcels.count ?? 0 };
    },
  });

  const { data: recentApps = [] } = useQuery({
    queryKey: ["land-admin-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("id,owner_name,status,created_at").order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  return (
    <AppLayout pageTitle="Land Admin Dashboard">
      <div className="p-6 space-y-6">
        <PageHeader title="Land Administrator Dashboard" description="Overview of all land records and registry activity" />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard icon={<FileText size={20} />} label="Total Applications" value={String(stats?.applications ?? "—")} />
          <MetricCard icon={<Award size={20} />} label="Titles Issued" value={String(stats?.titles ?? "—")} />
          <MetricCard icon={<BookOpen size={20} />} label="Registered Parcels" value={String(stats?.parcels ?? "—")} />
        </div>

        <div className="card-navy">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Applications</h2>
            <Link href="/land-admin/records" className="text-xs text-[#6338F5] hover:underline">View all →</Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Owner</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {recentApps.map((a: any) => (
                <tr key={a.id}>
                  <td className="font-medium text-white">{a.owner_name}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="text-[#AAB4CC] text-xs">{a.created_at ? format(new Date(a.created_at), "dd MMM yyyy") : "—"}</td>
                </tr>
              ))}
              {recentApps.length === 0 && (
                <tr><td colSpan={3} className="text-center text-[#AAB4CC] py-8">No applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
