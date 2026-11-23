"use client";
/**
 * useRealtimeApplications — live Supabase subscription for the current user's applications.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Application } from "@/types";

export function useRealtimeApplications(userId: string | undefined) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setApplications((data ?? []) as unknown as Application[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`applications_user_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `applicant_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setApplications((prev) => [payload.new as unknown as Application, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setApplications((prev) =>
              prev.map((a) => (a.id === (payload.new as unknown as Application).id
                ? (payload.new as unknown as Application)
                : a))
            );
          } else if (payload.eventType === "DELETE") {
            setApplications((prev) =>
              prev.filter((a) => a.id !== (payload.old as unknown as Application).id)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { applications, loading, error, refetch: fetchApplications };
}
