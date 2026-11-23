"use client";
/**
 * Smart Dashboard — redirects to role-specific dashboard.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageLoader } from "@/components/ui/LoadingSpinner";

const ROLE_ROUTES: Record<string, string> = {
  CITIZEN:            "/citizen/dashboard",
  SURVEYOR:           "/gis/workspace",
  REGISTRAR:          "/registrar/dashboard",
  LAND_ADMINISTRATOR: "/land-admin/dashboard",
  GOVERNOR:           "/governor/dashboard",
  SYSTEM:             "/admin/dashboard",
};

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role) {
      router.replace(ROLE_ROUTES[user.role] ?? "/citizen/dashboard");
    }
  }, [user, loading, router]);

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="flex items-center justify-center h-64">
        <PageLoader label="Loading your dashboard…" />
      </div>
    </AppLayout>
  );
}
