/**
 * ANAGU authentication.
 * Registration and login are handled by the NestJS backend.
 */

import { publicApiRequest } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  nationalId?: string | null;
  phone?: string | null;
  walletAddress?: string | null;
}

interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

const AUTH_STORAGE_KEY = 'anagu.auth';
const AUTH_CHANGE_EVENT = 'anagu-auth-change';

function saveAuth(result: AuthResult): void {
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export async function signUpAndIn(
  email: string,
  password: string,
  meta: Record<string, unknown>,
): Promise<{ error: string | null }> {
  try {
    const result = await publicApiRequest<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        fullName: String(meta.full_name ?? ''),
        nationalId: meta.nin ? String(meta.nin) : undefined,
        phone: meta.phone ? String(meta.phone) : undefined,
      }),
    });

    if (!result.accessToken || !result.user) {
      return { error: 'Registration succeeded, but the server did not return a login session.' };
    }

    saveAuth(result);
    return { error: null };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  try {
    const result = await publicApiRequest<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (!result.accessToken || !result.user) {
      return { error: 'The server did not return a valid login session.' };
    }

    saveAuth(result);
    return { error: null };
  } catch (error) {
    const message = getErrorMessage(error);

    if (message.toLowerCase().includes('unauthorized')) {
      return { error: 'Incorrect email or password.' };
    }

    return { error: message };
  }
}

export function signOut(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/**
 * Password reset has not yet been implemented in the NestJS backend.
 * Return an error instead of pretending an email was sent.
 */
export async function sendPasswordReset(
  _email: string,
  _redirectTo?: string,
): Promise<{ error: Error | null }> {
  return {
    error: new Error('Password reset is not available yet. Please contact ANAGU support.'),
  };
}
