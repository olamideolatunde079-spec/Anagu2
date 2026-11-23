"use client";
import { List } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="All Applications">
      <div className="p-6 space-y-6">
        <PageHeader title="All Applications" description="All applications for registrar" />
        <EmptyState
          icon={<List size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
