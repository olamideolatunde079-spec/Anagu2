/**
 * Anagu — Supabase server-side client
 * Uses the secret/service-role key for server components and API routes.
 * Never expose this to the browser.
 */
import { createClient } from "@supabase/supabase-js";

function getServerEnv(name: string) {
  return process.env[name];
}

function getSupabaseUrl() {
  const url = getServerEnv("SUPABASE_URL") ?? getServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) {
    throw new Error("SUPABASE_URL is not configured for the server.");
  }
  return url;
}

export function createServerAuthClient() {
  const key =
    getServerEnv("SUPABASE_PUBLISHABLE_KEY") ??
    getServerEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!key) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured for the server.");
  }

  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServerClient() {
  const key = getServerEnv("SUPABASE_SECRET_KEY");

  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY is not configured for the server.");
  }

  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
