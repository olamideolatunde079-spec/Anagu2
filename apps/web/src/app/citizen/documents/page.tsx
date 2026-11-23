"use client";
/**
 * C09 — Citizen Document Centre
 */
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Download } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { format, parseISO } from "date-fns";

type DocumentRecord = {
  id:            string;
  file_name:     string;
  document_type: string;
  created_at:    string;
  application_id: string;
};

function useDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ["citizen-docs", userId],
    enabled:  !!userId,
    queryFn: async () => {
      const appRes = await supabase
        .from("applications")
        .select("id")
        .eq("applicant_id", userId!);
      const appIds = (appRes.data ?? []).map((a) => a.id);
      if (!appIds.length) return [] as DocumentRecord[];

      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, document_type, created_at, application_id")
        .in("application_id", appIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRecord[];
    },
  });
}

export default function DocumentCentrePage() {
  const { user } = useUser();
  const { data, isLoading, error } = useDocuments(user?.id);
  const [search, setSearch] = useState("");

  const filtered = (data ?? []).filter((d) =>
    !search || d.file_name.toLowerCase().includes(search.toLowerCase()) ||
    d.document_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout pageTitle="Document Centre">
      <PageHeader
        title="Document Centre"
        description="All documents you have uploaded for your land applications"
        breadcrumbs={[{ label: "Documents" }]}
      />

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB4CC]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="input pl-9 h-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label="Loading documents…" />
        </div>
      ) : error ? (
        <div className="card text-center py-10 text-[#EF4444]">Failed to load documents.</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="No documents"
          message="Documents you upload during land applications will appear here."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Application</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-[#168BFF] shrink-0" />
                      <span className="text-sm text-white truncate max-w-[200px]">{doc.file_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{doc.document_type}</span>
                  </td>
                  <td className="font-mono text-xs text-[#AAB4CC]">
                    #{doc.application_id.slice(0, 8)}
                  </td>
                  <td className="text-xs text-[#AAB4CC]">
                    {format(parseISO(doc.created_at), "d MMM yyyy")}
                  </td>
                  <td>
                    <button className="btn-ghost text-xs py-1 px-2" aria-label="Download document">
                      <Download size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
