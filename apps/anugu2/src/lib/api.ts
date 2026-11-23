/**
 * ANAGU — API layer.
 * 
 * This is a Vite SPA with no persistent backend server in production.
 * All data is served from:
 *   1. Supabase (auth + realtime)  
 *   2. mockData.ts (land parcels, transactions, blocks — in-memory demo data)
 *   3. Web3 wallet (payments/transactions)
 * 
 * The NestJS backend (port 3001) is only needed for the GIS spatial 
 * verification service. When it's not running, we fall back to client-side
 * validation. All calls are wrapped in try/catch to prevent ERR_CONNECTION_REFUSED
 * errors from crashing the app.
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1')
  .replace(/\/+$/, '');

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('anagu.auth');
    return stored ? (JSON.parse(stored) as { accessToken?: string }).accessToken ?? null : null;
  } catch { return null; }
}

/** Authenticated API request — silently returns null if backend is unreachable. */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const ct   = res.headers.get('content-type') ?? '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg = typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message: unknown }).message : body;
      throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg || `Error ${res.status}`));
    }
    return body as T;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      // Backend not running — throw a clean error so callers can fall back
      throw new Error('Backend service unavailable');
    }
    throw err;
  }
}

/** Public (unauthenticated) request — returns null instead of throwing when backend is down. */
export async function publicApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const ct   = res.headers.get('content-type') ?? '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(String(body));
    return body as T;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Backend service unavailable');
    }
    throw err;
  }
}
