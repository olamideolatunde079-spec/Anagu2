"use client";
import { LayoutDashboard } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="System Dashboard">
      <div className="p-6 space-y-6">
        <PageHeader title="System Dashboard" description="System admin overview" />
        <EmptyState
          icon={<LayoutDashboard size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
