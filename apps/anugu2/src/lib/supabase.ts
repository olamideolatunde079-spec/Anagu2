import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/+$/, '');
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseClient: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON
    ? createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  nationalId?: string | null;
  walletAddress?: string | null;
}

const AUTH_STORAGE_KEY = 'anagu.auth';
const AUTH_CHANGE_EVENT = 'anagu-auth-change';

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export function saveAuth(result: AuthResult): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getAuth(): AuthResult | null {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthResult;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function subscribeToAuth(callback: () => void): () => void {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export async function signUpAndIn(
  email: string,
  password: string,
  meta: Record<string, unknown>,
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        fullName: String(meta.full_name ?? email.split('@')[0] ?? 'Citizen'),
        phone: meta.phone ? String(meta.phone) : undefined,
        nationalId: meta.nin ? String(meta.nin) : undefined,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.message;
      return { error: Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Registration failed.') };
    }

    if (!data?.accessToken || !data?.user) {
      return { error: 'Invalid response from authentication server.' };
    }

    saveAuth({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName ?? '',
        role: data.user.role ?? 'CITIZEN',
        nationalId: data.user.nationalId ?? null,
        walletAddress: data.user.walletAddress ?? null,
      },
    });
    return { error: null };
  } catch (err) {
    return {
      error:
        err instanceof TypeError
          ? 'Backend authentication server is unreachable. Start the ANAGU API on port 3001.'
          : err instanceof Error
          ? err.message
          : 'Registration failed.',
    };
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) {
        return { error: 'Incorrect email or password.' };
      }
      const msg = data?.message;
      return { error: Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Sign-in failed.') };
    }

    if (!data?.accessToken || !data?.user) {
      return { error: 'Invalid authentication server response.' };
    }

    saveAuth({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName ?? data.user.email?.split('@')[0] ?? 'User',
        role: data.user.role ?? 'CITIZEN',
        nationalId: data.user.nationalId ?? null,
        walletAddress: data.user.walletAddress ?? null,
      },
    });
    return { error: null };
  } catch (err) {
    return {
      error:
        err instanceof TypeError
          ? 'Backend authentication server is unreachable. Start the ANAGU API on port 3001.'
          : err instanceof Error
          ? err.message
          : 'Sign-in failed.',
    };
  }
}

export function signOut(): void {
  const current = getAuth();
  if (current?.accessToken) {
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${current.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    }).catch(() => null);
  }
  supabaseClient?.auth.signOut().catch(() => null);
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export async function sendPasswordReset(
  email: string,
  redirectTo?: string,
): Promise<{ error: Error | null }> {
  if (!supabaseClient) {
    return {
      error: new Error(
        'Self-service email recovery requires SMTP/auth provider configuration; contact your ANAGU administrator.',
      ),
    };
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo:
      redirectTo ??
      (typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined),
  });
  return { error: error ? new Error(error.message) : null };
}
