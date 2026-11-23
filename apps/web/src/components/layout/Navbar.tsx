"use client";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleSignOut = () => {
    clearAuth();
    router.push("/(auth)/login");
  };

  return (
    <nav className="bg-primary text-white px-6 py-3 flex items-center justify-between shadow-md">
      <Link href="/dashboard" className="text-xl font-bold tracking-tight">
        Anagu
      </Link>
      <div className="flex items-center gap-6 text-sm">
        {isAuthenticated && (
          <>
            <Link href="/dashboard"      className="hover:text-blue-200 transition-colors">Dashboard</Link>
            <Link href="/applications/new" className="hover:text-blue-200 transition-colors">+ Apply</Link>
            {(user?.role === "REGISTRAR" || user?.role === "LAND_ADMINISTRATOR") && (
              <Link href="/admin/revoke" className="hover:text-blue-200 transition-colors">Admin</Link>
            )}
            <span className="text-blue-300 border-l border-blue-600 pl-4">
              {user?.fullName} <span className="text-blue-400">({user?.role})</span>
            </span>
            <button onClick={handleSignOut} className="hover:text-red-300 transition-colors">
              Sign out
            </button>
          </>
        )}
        {!isAuthenticated && (
          <Link href="/(auth)/login" className="hover:text-blue-200 transition-colors">Sign in</Link>
        )}
      </div>
    </nav>
  );
}
