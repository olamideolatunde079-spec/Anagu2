/**
 * Anagu — Supabase browser client
 * Project: https://wcykxpsbtbsoxxmitslk.supabase.co
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? "https://wcykxpsbtbsoxxmitslk.supabase.co";

const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? "sb_publishable_MwJtKiIDQB-46QhW1xvkXA_Lh_apL1j";

/** Browser-safe Supabase client — uses publishable (anon) key only */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

/** Subscribe to live application status changes for a specific applicant */
export function subscribeToApplicationUpdates(
  applicantId: string,
  onUpdate: (payload: Record<string, unknown>) => void,
) {
  return supabase
    .channel(`app-updates-${applicantId}`)
    .on(
      "postgres_changes",
      {
        event:  "*",
        schema: "public",
        table:  "applications",
        filter: `applicant_id=eq.${applicantId}`,
      },
      (payload) => onUpdate(payload as Record<string, unknown>),
    )
    .subscribe();
}

/** Subscribe to new title issuance events */
export function subscribeToTitleEvents(
  onEvent: (payload: Record<string, unknown>) => void,
) {
  return supabase
    .channel("title-events")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "land_titles" },
      (payload) => onEvent(payload as Record<string, unknown>),
    )
    .subscribe();
}
