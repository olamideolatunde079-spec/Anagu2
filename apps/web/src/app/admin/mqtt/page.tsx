"use client";
import { Radio } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Page() {
  return (
    <AppLayout pageTitle="MQTT Monitor">
      <div className="p-6 space-y-6">
        <PageHeader title="MQTT Monitor" description="MQTT broker monitoring" />
        <EmptyState
          icon={<Radio size={40} />}
          title="Coming Soon"
          message="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
