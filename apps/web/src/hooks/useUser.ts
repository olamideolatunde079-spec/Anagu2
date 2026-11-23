"use client";
/**
 * useUser — returns the current Supabase auth user + role from app_metadata.
 */
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppUser = User & {
  role: string;
  fullName: string;
};

export function useUser() {
  const [user, setUser]       = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u ? mapUser(u) : null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u ? mapUser(u) : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

function mapUser(u: User): AppUser {
  const meta = u.user_metadata as Record<string, string> | undefined;
  return Object.assign(u, {
    role:     (u.app_metadata as Record<string, string>)?.role ?? "CITIZEN",
    fullName: meta?.full_name ?? meta?.fullName ?? u.email ?? "",
  }) as AppUser;
}
