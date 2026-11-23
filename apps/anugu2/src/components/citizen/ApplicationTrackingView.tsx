import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LandApplication } from '../../types';
import {
  Clock,
  CheckCircle2,
  FileText,
  Users,
  Compass,
  FileCheck,
  ShieldCheck,
  Layers,
  Cpu,
  Wifi,
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const ApplicationTrackingView: React.FC = () => {
  const { applications, updateApplicationStatus, addNotification } = useApp();
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id || '');
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [amendmentNote, setAmendmentNote] = useState(
    'Certified SURCON Survey Plan and updated treasury receipt re-uploaded for deeds review.'
  );

  const selectedApp = applications.find(a => a.id === selectedAppId) || applications[0];

  if (!selectedApp) {
    return (
      <div className="rounded-xl border border-[#E5E8E5] bg-white p-6 text-sm text-[#4A524D] shadow-xs">
        You have no land applications to track yet.
      </div>
    );
  }

  const pipelineStages = [
    { key: 'submitted', label: '1. Application Submission', icon: FileText, desc: 'Identity (NIN Tier 3), tenure claim, and fee clearance.' },
    { key: 'spatial_verification', label: '2. PostGIS Spatial Verification', icon: Layers, desc: 'WGS 84 coordinates validated; ST_IsValid & ST_Intersects checked with 0.5m buffer.' },
    { key: 'community_attestation', label: '3. Community Attestation & Oracle', icon: Users, desc: '21-day public notice window; 4 cardinal abutting neighbors signoff.' },
    { key: 'legal_verification', label: '4. Legal Instrument Verification', icon: Compass, desc: 'Root of title, gazette notices, and encumbrance search verified.' },
    { key: 'registrar_approval', label: '5. Registrar Title Approval', icon: FileCheck, desc: 'Deeds Registrar executes sovereign multi-sig validation.' },
    { key: 'blockchain_registration', label: '6. Blockchain Consensus Registration', icon: Cpu, desc: 'Cadastral block finalized on Raft-BFT validator consensus.' },
    { key: 'nft_issuance', label: '7. ERC-721 NFT Title Minting', icon: ShieldCheck, desc: 'Non-transferable sovereign token minted with IPFS deed metadata.' },
    { key: 'mqtt_dispatch', label: '8. MQTT Edge Dispatch & Broadcast', icon: Wifi, desc: 'Telemetry published on land/registration/status (QoS 2) to edge nodes.' },
  ];

  const getStageIndex = (status: LandApplication['status']) => {
    switch (status) {
      case 'submitted':
        return 1;
      case 'survey_assigned':
        return 1;
      case 'survey_completed':
        return 2;
      case 'community_attestation':
        return 2;
      case 'registrar_review':
        return 4;
      case 'approved':
        return 7;
      case 'rejected':
        return -1;
      default:
        return 1;
    }
  };

  const currentStageIndex = getStageIndex(selectedApp.status);
  const needsAction = selectedApp.status === 'rejected' || selectedApp.notes.startsWith('CORRECTION REQUIRED');

  const handleResubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateApplicationStatus(
      selectedApp.id,
      'registrar_review',
      `AMENDED & RESUBMITTED: ${amendmentNote}`
    );
    addNotification({
      title: 'Application Resubmitted',
      message: `${selectedApp.applicationNumber} amended and routed back to Registrar Examination Queue.`,
      type: 'success',
    });
    setShowResubmitModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to My Dashboard" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Clock className="w-6 h-6 text-[#245C43]" />
          My Applications
        </h1>
        <p className="text-sm text-[#4A524D] mt-1 leading-relaxed">
          Track each registration through spatial validation, community review, legal examination, and digital title issuance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Applications on File */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-[#4A524D] font-bold">Applications on File</div>
          {applications.map(app => (
            <div
              key={app.id}
              onClick={() => setSelectedAppId(app.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                selectedApp.id === app.id
                  ? 'bg-[#F7F8F7] border-[#245C43] ring-1 ring-[#245C43] shadow-xs'
                  : 'bg-white border-[#E5E8E5] hover:bg-[#F7F8F7]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono font-bold text-[#252B28] text-sm">{app.applicationNumber}</span>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                    app.status === 'approved'
                      ? 'bg-[#EBF4EF] text-[#164E35] border-[#C4DFC9]'
                      : app.status === 'rejected'
                      ? 'bg-red-50 text-red-900 border-red-200'
                      : app.notes.startsWith('CORRECTION REQUIRED')
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-white text-[#252B28] border-[#CBD0C8]'
                  }`}
                >
                  {app.notes.startsWith('CORRECTION REQUIRED') ? 'correction required' : app.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm text-[#252B28] font-semibold">{app.applicantName}</div>
              <div className="text-xs text-[#4A524D] mt-0.5">{app.district}, {app.state}</div>
              {app.tenureType && (
                <div className="text-xs text-[#245C43] font-mono font-semibold mt-1.5">
                  Tenure: {app.tenureType} Right of Occupancy
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right 2 Columns: 8-Stage Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E8E5] p-6 space-y-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E8E5]">
            <div>
              <div className="text-xs font-semibold text-[#4A524D]">Application Number</div>
              <div className="text-xl font-bold font-mono text-[#252B28]">{selectedApp.applicationNumber}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#4A524D]">Date Lodged</div>
              <div className="text-sm font-mono font-semibold text-[#252B28]">{selectedApp.dateSubmitted}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#4A524D]">Neighbor Consensus</div>
              <div className="text-sm font-mono text-[#245C43] font-bold">
                {selectedApp.attestationsCount} / {selectedApp.requiredAttestations} Confirmed
              </div>
            </div>
          </div>

          {/* Rejected or Correction Required Banner */}
          {selectedApp.status === 'rejected' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-red-900 uppercase font-mono text-xs">Application Rejected</div>
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs"
                >
                  Appeal &amp; Resubmit Rectified Dossier
                </button>
              </div>
              <p>{selectedApp.notes}</p>
            </div>
          )}
          {selectedApp.notes.startsWith('CORRECTION REQUIRED') && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-900 uppercase font-mono text-xs">
                  Correction Required — Action Needed
                </div>
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs"
                >
                  Amend &amp; Resubmit Documents
                </button>
              </div>
              <p>{selectedApp.notes}</p>
            </div>
          )}

          {/* Stepper Timeline: 8 Stages */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#4A524D] font-bold flex flex-wrap items-center justify-between gap-2">
              <span>ANAGU 8-Stage Unified Pipeline Status</span>
              <span className="text-[#245C43]">
                {selectedApp.status === 'approved'
                  ? '8 of 8 Completed'
                  : selectedApp.status === 'rejected'
                  ? 'Pipeline Halted (Rejected)'
                  : needsAction
                  ? 'Paused — Correction Query Pending'
                  : `Stage ${currentStageIndex + 1} of 8 Active`}
              </span>
            </h3>

            <div className="space-y-2.5">
              {pipelineStages.map((stage, idx) => {
                const Icon = stage.icon;
                const isCompleted = currentStageIndex > idx || selectedApp.status === 'approved';
                const isCurrent = currentStageIndex === idx && selectedApp.status !== 'approved';

                return (
                  <div
                    key={stage.key}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                      isCompleted
                        ? 'bg-[#EBF4EF] border-[#C4DFC9] text-[#164E35]'
                        : isCurrent
                        ? 'bg-white border-[#245C43] ring-1 ring-[#245C43] text-[#252B28]'
                        : 'bg-[#F7F8F7] border-[#E5E8E5] text-[#4A524D]'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isCompleted
                          ? 'bg-[#245C43] text-white'
                          : isCurrent
                          ? 'bg-[#245C43] text-white'
                          : 'bg-white border border-[#CBD0C8] text-[#4A524D]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#252B28]">{stage.label}</span>
                        {isCompleted && (
                          <span className="text-xs font-mono font-bold text-[#164E35] uppercase">Validated</span>
                        )}
                        {isCurrent && (
                          <span className="text-xs font-mono font-bold text-[#245C43] uppercase">Processing</span>
                        )}
                      </div>
                      <p className="text-xs text-[#4A524D] mt-1 leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Notes & Surveyor Seal */}
          <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-2 text-sm">
            <div className="font-bold text-[#252B28]">Cadastral Processing Memorial</div>
            <p className="text-[#4A524D] leading-relaxed">{selectedApp.notes}</p>
            {selectedApp.assignedSurveyor && (
              <div className="text-xs text-[#245C43] pt-2 border-t border-[#E5E8E5] flex flex-wrap items-center justify-between gap-2">
                <span>
                  Assigned Cadastral Surveyor: <strong className="text-[#252B28]">{selectedApp.assignedSurveyor}</strong>
                </span>
                {selectedApp.surveyorSurconNo && (
                  <span className="font-mono text-[#4A524D] font-semibold">{selectedApp.surveyorSurconNo}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amendment / Resubmission Modal */}
      {showResubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#CBD0C8] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
              <h3 className="text-base font-bold text-[#252B28]">Amend &amp; Resubmit Title Dossier</h3>
              <button
                type="button"
                onClick={() => setShowResubmitModal(false)}
                className="text-[#4A524D] hover:text-[#252B28] text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleResubmit} className="space-y-4 text-sm">
              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">
                  Rectification Summary &amp; Newly Attached Instruments
                </label>
                <textarea
                  value={amendmentNote}
                  onChange={e => setAmendmentNote(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2 min-h-[40px] rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:bg-[#F7F8F7] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 min-h-[40px] rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-semibold"
                >
                  Resubmit to Deeds Examination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
