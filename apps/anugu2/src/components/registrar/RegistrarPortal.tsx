import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LandApplication } from '../../types';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Award,
  User,
  MapPin,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const RegistrarPortal: React.FC = () => {
  const { applications, approveTitleDeed, updateApplicationStatus, setSelectedCertificateParcel, currentUser, addNotification } = useApp();
  const [selectedAppId, setSelectedAppId] = useState<string>((applications[1] || applications[0])?.id || '');
  const [isApproving, setIsApproving] = useState(false);
  const [queryNote, setQueryNote] = useState('Please resubmit certified Survey Plan bearing SURCON seal and treasury receipt.');
  const [showQueryModal, setShowQueryModal] = useState<'correction' | 'reject' | null>(null);

  const selectedApp = applications.find(a => a.id === selectedAppId) || applications[0];
  const pendingQueue = applications.filter(a => a.status === 'registrar_review' || a.status === 'community_attestation');

  if (!selectedApp) {
    return (
      <div className="rounded-xl border border-[#E5E8E5] bg-white p-6 text-sm text-[#4A524D] shadow-xs">
        No land applications are awaiting registrar review.
      </div>
    );
  }

  const handleApprove = () => {
    if (!selectedApp) return;
    setIsApproving(true);
    setTimeout(() => {
      const mintedParcel = approveTitleDeed(selectedApp.id);
      setIsApproving(false);
      setSelectedCertificateParcel(mintedParcel);
    }, 700);
  };

  const handleDecisionNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showQueryModal || !selectedApp) return;

    if (showQueryModal === 'reject') {
      updateApplicationStatus(selectedApp.id, 'rejected', `REJECTED BY REGISTRAR (${currentUser.name}): ${queryNote}`);
      addNotification({
        title: 'Application Rejected',
        message: `Application ${selectedApp.applicationNumber} rejected due to statutory defect.`,
        type: 'error'
      });
    } else {
      updateApplicationStatus(selectedApp.id, 'submitted', `CORRECTION REQUIRED (${currentUser.name}): ${queryNote}`);
      addNotification({
        title: 'Correction Query Dispatched',
        message: `Correction notice dispatched for ${selectedApp.applicationNumber}.`,
        type: 'warning'
      });
    }
    setShowQueryModal(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[#252B28]">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-[#245C43]" />
          Deeds Registrar Examination &amp; Approval Portal
        </h1>
        <p className="text-sm text-[#4A524D] mt-1 leading-relaxed">
          Logged in as <strong className="text-[#252B28]">{currentUser.name}</strong> (Deeds Registrar, State Bureau of Lands)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Application Queue */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-[#4A524D] font-semibold">
            Pending Deeds Examination Queue ({pendingQueue.length})
          </div>

          {applications.map(app => (
            <div
              key={app.id}
              onClick={() => setSelectedAppId(app.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedApp?.id === app.id
                  ? 'bg-[#F7F8F7] border-[#245C43] shadow-xs ring-1 ring-[#245C43]'
                  : 'bg-white border-[#E5E8E5] hover:bg-[#F7F8F7]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-[#252B28] text-xs">{app.applicationNumber}</span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                    app.status === 'approved'
                      ? 'bg-[#245C43]/10 text-[#245C43]'
                      : app.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : app.status === 'registrar_review'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-[#252B28]'
                  }`}
                >
                  {app.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs text-[#252B28] font-semibold">{app.applicantName}</div>
              <div className="text-xs text-[#4A524D] mt-0.5">{app.district}, {app.state}</div>
            </div>
          ))}
        </div>

        {/* Right 2 Columns: Application Examination Dossier */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E8E5] p-6 space-y-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E8E5]">
            <div>
              <div className="text-xs text-[#4A524D]">Dossier Under Review</div>
              <h2 className="text-xl font-bold font-mono text-[#252B28]">{selectedApp.applicationNumber}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#4A524D]">Status</span>
              <div className="text-xs font-mono font-bold uppercase text-[#245C43]">
                {selectedApp.status.replace('_', ' ')}
              </div>
            </div>
          </div>

          {(selectedApp.status === 'rejected' || selectedApp.notes.startsWith('CORRECTION REQUIRED')) && (
            <div className={`p-4 rounded-lg border text-xs space-y-1 ${
              selectedApp.status === 'rejected'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="font-bold font-mono uppercase">
                {selectedApp.status === 'rejected' ? 'Statutory Rejection Recorded' : 'Correction Query Active'}
              </div>
              <p>{selectedApp.notes}</p>
            </div>
          )}

          {/* Verification Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase text-[#4A524D] font-semibold tracking-wider">
              Statutory Examination Criteria
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C43] shrink-0" />
                <div>
                  <div className="font-semibold text-[#252B28]">NIN Identity Authenticated</div>
                  <div className="text-xs text-[#4A524D]">Biometric match verified against NIMC API</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C43] shrink-0" />
                <div>
                  <div className="font-semibold text-[#252B28]">PostGIS Spatial Check Cleared</div>
                  <div className="text-xs text-[#4A524D]">ST_IsValid &amp; 0.5m buffer non-overlapping</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C43] shrink-0" />
                <div>
                  <div className="font-semibold text-[#252B28]">Neighbor Attestations Complete</div>
                  <div className="text-xs text-[#4A524D]">4/4 Boundary neighbors signed with 0 disputes</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C43] shrink-0" />
                <div>
                  <div className="font-semibold text-[#252B28]">Stamp Duty &amp; Tax Clearance</div>
                  <div className="text-xs text-[#4A524D]">Internal Revenue receipts validated</div>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Documents */}
          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2 text-xs">
            <div className="font-semibold text-[#252B28]">Attached Legal Instruments:</div>
            <div className="space-y-1 text-[#252B28] font-mono text-xs">
              {selectedApp.documents.map((d, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-[#E5E8E5]">
                  <span className="text-[#245C43] font-medium">{d.name}</span>
                  <span className="text-[#4A524D]">{d.size} · {d.uploadedAt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E8E5]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowQueryModal('correction')}
                className="px-4 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold"
              >
                Request Correction
              </button>
              <button
                onClick={() => setShowQueryModal('reject')}
                className="px-4 py-2 rounded-lg bg-red-50 border border-red-300 text-red-900 hover:bg-red-100 text-xs font-semibold"
              >
                Reject Application
              </button>
            </div>

            {selectedApp.status !== 'approved' && selectedApp.status !== 'rejected' && (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="px-6 py-2.5 rounded-lg bg-[#245C43] text-white font-semibold text-xs tracking-wider hover:bg-[#1B4733] transition-colors flex items-center gap-2"
              >
                {isApproving ? (
                  <span>Minting C of O Token...</span>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>Approve &amp; Mint Certificate of Occupancy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Query / Rejection Modal */}
      {showQueryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E8E5] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E8E5]">
              <h3 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${showQueryModal === 'reject' ? 'text-red-700' : 'text-amber-700'}`} />
                <span>{showQueryModal === 'reject' ? 'Reject Title Application' : 'Issue Registry Correction Query'}</span>
              </h3>
              <button onClick={() => setShowQueryModal(null)} className="text-[#4A524D] hover:text-[#252B28] text-xs font-bold">✕</button>
            </div>
            <form onSubmit={handleDecisionNoteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[#252B28] block mb-1 font-semibold">Statutory Registrar Notes</label>
                <textarea
                  value={queryNote}
                  onChange={e => setQueryNote(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQueryModal(null)}
                  className="px-4 py-2 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:bg-[#F7F8F7] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg text-white font-semibold ${
                    showQueryModal === 'reject' ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-700 hover:bg-amber-800'
                  }`}
                >
                  {showQueryModal === 'reject' ? 'Confirm Rejection' : 'Dispatch Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
