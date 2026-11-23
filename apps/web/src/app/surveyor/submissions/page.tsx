"use client";
import { FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="Survey Submissions">
      <div className="p-6 space-y-6">
        <PageHeader title="Survey Submissions" description="Surveyor submissions" />
        <EmptyState
          icon={<FileText size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
