import { getAuth, saveAuth, signOut } from './supabase';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/+$/, '');

async function tryRefreshAccessToken(): Promise<string | null> {
  const current = getAuth();
  if (!current?.refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      signOut();
      return null;
    }
    const refreshed = await res.json();
    if (!refreshed?.accessToken || !refreshed?.user) return null;
    saveAuth({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? current.refreshToken,
      user: {
        id: refreshed.user.id,
        email: refreshed.user.email,
        fullName: refreshed.user.fullName,
        role: refreshed.user.role,
        nationalId: refreshed.user.nationalId ?? null,
        walletAddress: refreshed.user.walletAddress ?? null,
      },
    });
    return refreshed.accessToken as string;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const auth = getAuth();
  const token = auth?.accessToken ?? null;
  if (!token) throw new Error('Not authenticated');

  const buildHeaders = (bearerToken: string) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${bearerToken}`);
    if (typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  };

  try {
    let res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(token) });
    if (res.status === 401 && auth?.refreshToken) {
      const nextToken = await tryRefreshAccessToken();
      if (nextToken) {
        res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(nextToken) });
      }
    }

    const ct = res.headers.get('content-type') ?? '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: unknown }).message
          : body;
      throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg || `Error ${res.status}`));
    }
    return body as T;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Backend service unavailable');
    }
    throw err;
  }
}

export async function publicApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const ct = res.headers.get('content-type') ?? '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: unknown }).message
          : body;
      throw new Error(String(msg || `Error ${res.status}`));
    }
    return body as T;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Backend service unavailable');
    }
    throw err;
  }
}
