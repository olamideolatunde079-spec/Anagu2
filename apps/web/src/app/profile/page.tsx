"use client";
import { useState } from "react";
import { User, Mail, Phone, Shield, Wallet, Calendar, LogOut } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function ProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AppLayout pageTitle="My Profile">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <PageHeader title="My Profile" description="Your account information and role" />

        <div className="card">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-white">
                {user?.fullName?.charAt(0) ?? "?"}
              </span>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-1">
                {user?.fullName ?? "—"}
              </h2>
              <StatusBadge status={user?.role ?? "CITIZEN"} />
              <p className="text-sm text-[#AAB4CC] mt-2">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-[#AAB4CC] uppercase tracking-wider mb-4">Account Details</h3>
          {[
            { icon: <User size={16} />,     label: "Full Name",       value: user?.fullName },
            { icon: <Mail size={16} />,     label: "Email",           value: user?.email },
            { icon: <Phone size={16} />,    label: "Phone",           value: user?.phone ?? "Not set" },
            { icon: <Shield size={16} />,   label: "National ID",     value: user?.email ?? "Not set" },
            { icon: <Wallet size={16} />,   label: "Wallet Address",  value: "Not connected" },
            { icon: <Calendar size={16} />, label: "Member Since",    value: user?.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 py-3 border-b border-[#29345A]/50 last:border-0">
              <span className="text-[#AAB4CC] shrink-0">{icon}</span>
              <span className="text-sm text-[#AAB4CC] w-32 shrink-0">{label}</span>
              <span className="text-sm text-white font-mono truncate">{value ?? "—"}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="btn-danger w-full flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </AppLayout>
  );
}
