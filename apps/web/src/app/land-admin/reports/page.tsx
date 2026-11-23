"use client";
import { BarChart2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="Reports">
      <div className="p-6 space-y-6">
        <PageHeader title="Reports" description="Reports and analytics" />
        <EmptyState
          icon={<BarChart2 size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
