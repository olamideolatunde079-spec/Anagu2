"use client";
/**
 * AppLayout — authenticated application shell.
 * - Persistent left sidebar on desktop (256px)
 * - Collapsible sidebar on tablet
 * - Drawer on mobile
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { Sidebar, type UserRole } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useUser } from "@/hooks/useUser";
import { PageLoader } from "@/components/ui/LoadingSpinner";

interface AppLayoutProps {
  children:   React.ReactNode;
  pageTitle?: string;
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const router = useRouter();
  const { user, loading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-midnight)" }}>
        <PageLoader label="Loading ANAGU…" />
      </div>
    );
  }

  if (!user) return null;

  const role = (user.role ?? "CITIZEN") as UserRole;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-midnight)" }}>

      {/* ── Desktop sidebar (always visible ≥ lg) ─────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[#29345A]">
        <Sidebar role={role} />
      </aside>

      {/* ── Mobile sidebar drawer ─────────────────────────────────── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#080D24]/70 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-[#29345A] lg:hidden flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#29345A]" style={{ background: "var(--surface-navy)" }}>
              <span className="font-bold text-white text-lg">ANAGU<span className="text-[#6338F5]">!</span></span>
              <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1.5" aria-label="Close navigation">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar role={role} onClose={() => setSidebarOpen(false)} />
            </div>
          </aside>
        </>
      )}

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          user={user}
          pageTitle={pageTitle}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          showMenuBtn
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
