"use client";
import { Settings } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="System Settings">
      <div className="p-6 space-y-6">
        <PageHeader title="System Settings" description="Platform configuration" />
        <EmptyState
          icon={<Settings size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
