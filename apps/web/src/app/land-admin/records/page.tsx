"use client";
import { BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="Land Records">
      <div className="p-6 space-y-6">
        <PageHeader title="Land Records" description="All land records" />
        <EmptyState
          icon={<BookOpen size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
