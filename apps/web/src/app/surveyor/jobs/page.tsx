"use client";
import { Clipboard } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="Survey Jobs">
      <div className="p-6 space-y-6">
        <PageHeader title="Survey Jobs" description="Surveyor survey job list" />
        <EmptyState
          icon={<Clipboard size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
