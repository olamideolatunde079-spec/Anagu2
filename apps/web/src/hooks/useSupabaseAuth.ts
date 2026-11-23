'use client';

/**
 * useSupabaseAuth — wraps Supabase auth state and syncs with the Zustand auth store.
 *
 * On sign-in:  persists the JWT to localStorage via useAuthStore.setAuth()
 *              so that the axios API client picks it up automatically.
 * On sign-out: clears both Supabase session and the Zustand store.
 */
import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { AuthUser } from '@/lib/auth-store';

export function useSupabaseAuth() {
  const [session,  setSession]  = useState<Session | null>(null);
  const [loading,  setLoading]  = useState(true);

  const { setAuth, clearAuth, user: storedUser } = useAuthStore();

  // ── Bootstrap: read existing session on mount ─────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        syncToStore(data.session);
      }
      setLoading(false);
    });

    // Listen for future auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          syncToStore(newSession);
        } else {
          clearAuth();
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync Supabase session → Zustand + localStorage ────────────────────
  function syncToStore(s: Session) {
    const supaUser: User = s.user;
    const authUser: AuthUser = {
      id:       supaUser.id,
      email:    supaUser.email ?? '',
      fullName: (supaUser.user_metadata?.full_name as string) ?? '',
      role:     (supaUser.app_metadata?.role as string) ?? 'CITIZEN',
    };
    setAuth(s.access_token, authUser);
  }

  // ── Sign in ────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Sign out ───────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    clearAuth();
  }, [clearAuth]);

  return {
    user:    storedUser,
    session,
    signIn,
    signOut,
    loading,
  };
}
