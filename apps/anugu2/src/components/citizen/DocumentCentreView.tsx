import React, { useEffect, useState } from 'react';
import { Download, Files, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import { BackButton } from '../common/BackButton';

type StoredDocument = {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  fileSizeBytes: string;
  createdAt: string;
  applicationNumber: string;
};

export const DocumentCentreView: React.FC = () => {
  const { applications } = useApp();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    void Promise.all(applications.map(async application => {
      const rows = await apiRequest<Omit<StoredDocument, 'applicationNumber'>[]>(
        `/documents/${encodeURIComponent(application.id)}`,
      );
      return rows.map(row => ({ ...row, applicationNumber: application.applicationNumber }));
    })).then(groups => {
      if (active) setDocuments(groups.flat());
    }).catch(loadError => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load application documents.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [applications]);

  const downloadDocument = async (document: StoredDocument) => {
    setDownloadingId(document.id);
    setError('');
    try {
      const result = await apiRequest<{ url: string }>(
        `/documents/${encodeURIComponent(document.applicationId)}/${encodeURIComponent(document.id)}/download`,
      );
      window.location.assign(result.url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Could not download this document.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <BackButton to="/portal/dashboard" label="Back to My Dashboard" />
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#252B28]">
          <Files className="h-6 w-6 text-[#245C43]" />
          My Documents
        </h1>
        <p className="mt-1 text-sm text-[#4A524D] leading-relaxed">
          Survey plans, deeds, and supporting documents uploaded to your My ANAGU applications.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E5E8E5] bg-white shadow-xs">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-[#E5E8E5] bg-[#F7F8F7] text-xs font-bold uppercase text-[#252B28]">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E8E5]">
            {documents.map(document => (
              <tr key={document.id} className="hover:bg-[#F7F8F7] transition-colors">
                <td className="px-4 py-3 font-medium text-[#252B28]">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-[#245C43]" />
                    {document.fileName}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#252B28]">{document.applicationNumber}</td>
                <td className="px-4 py-3 text-[#4A524D]">{document.documentType}</td>
                <td className="px-4 py-3 text-[#4A524D]">{new Date(document.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void downloadDocument(document)}
                    disabled={downloadingId === document.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD0C8] bg-white hover:border-[#245C43] hover:text-[#245C43] px-3 py-1.5 min-h-[36px] text-xs font-semibold text-[#252B28] disabled:opacity-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingId === document.id ? 'Preparing…' : 'Download'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && documents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#4A524D]">
                  {applications.length === 0 ? 'No application documents are available.' : 'No documents have been uploaded for your applications.'}
                </td>
              </tr>
            )}
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#4A524D]">Loading documents…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
