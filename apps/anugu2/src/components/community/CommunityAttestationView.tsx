import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CommunityAttestation, OracleOutcome } from '../../types';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MapPin,
  MessageSquare,
  FileCheck,
  Landmark,
  Compass,
  FileQuestion
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const CommunityAttestationView: React.FC = () => {
  const { communityAttestations, signNeighborAttestation } = useApp();
  const [selectedAttestationId, setSelectedAttestationId] = useState<string>(communityAttestations[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'all' | 'customary' | 'statutory'>('all');

  // Modal for signing
  const [showSignModal, setShowSignModal] = useState(false);
  const [activeNeighbor, setActiveNeighbor] = useState('');
  const [signStatus, setSignStatus] = useState<'confirmed' | 'disputed'>('confirmed');
  const [signComment, setSignComment] = useState('I hereby attest that the boundary beacons set by the surveyor correspond with historical boundary trees and markers.');

  // Per-parcel Traditional Council Verification state
  const [traditionalCouncilVerifiedMap, setTraditionalCouncilVerifiedMap] = useState<Record<string, boolean>>({
    'att-001': true,
    'att-002': true
  });

  const filteredAttestations = communityAttestations.filter(att => {
    if (activeTab === 'all') return true;
    if (activeTab === 'customary') return att.tenureType === 'Customary';
    return att.tenureType !== 'Customary';
  });

  const selectedAttestation: CommunityAttestation =
    filteredAttestations.find(a => a.id === selectedAttestationId) ||
    filteredAttestations[0] ||
    communityAttestations[0];

  const traditionalCouncilVerified = selectedAttestation
    ? traditionalCouncilVerifiedMap[selectedAttestation.id] ?? true
    : true;

  const toggleTraditionalCouncil = () => {
    if (!selectedAttestation) return;
    setTraditionalCouncilVerifiedMap(prev => ({
      ...prev,
      [selectedAttestation.id]: !(prev[selectedAttestation.id] ?? true)
    }));
  };

  // Compute Oracle Outcome based on neighbor status and disputes
  const calculateOracleOutcome = (): { outcome: OracleOutcome; color: string; desc: string } => {
    const hasDisputes = selectedAttestation.neighborAttestations.some(n => n.status === 'disputed') ||
      selectedAttestation.publicDisputes.length > 0;
    const allConfirmed = selectedAttestation.neighborAttestations.every(n => n.status === 'confirmed');
    const hasPending = selectedAttestation.neighborAttestations.some(n => n.status === 'pending');

    if (hasDisputes) {
      return {
        outcome: 'Ownership Information Conflict',
        color: 'text-red-900 bg-red-50 border-red-200',
        desc: 'Boundary conflict or overlapping ownership claim lodged during statutory notice period.'
      };
    }
    if (!traditionalCouncilVerified) {
      return {
        outcome: 'Incomplete Supporting Documents',
        color: 'text-amber-900 bg-amber-50 border-amber-200',
        desc: 'Family allotment or traditional council chieftaincy consent seal pending attestation review.'
      };
    }
    if (hasPending) {
      return {
        outcome: 'Legal Verification Pending',
        color: 'text-amber-900 bg-amber-50 border-amber-200',
        desc: 'Abutting neighbor attestations in progress. Awaiting perimeter signatures.'
      };
    }
    if (allConfirmed && traditionalCouncilVerified) {
      return {
        outcome: 'Successfully Verified',
        color: 'text-emerald-900 bg-emerald-50 border-emerald-200',
        desc: 'Unanimous 4-cardinal perimeter consensus and traditional chieftaincy verification completed.'
      };
    }
    return {
      outcome: 'Incomplete Supporting Documents',
      color: 'text-amber-900 bg-amber-50 border-amber-200',
      desc: 'Family allotment or traditional consent documentation pending deed review.'
    };
  };

  const oracleResult = calculateOracleOutcome();

  const handleOpenSign = (neighborName: string) => {
    setActiveNeighbor(neighborName);
    setShowSignModal(true);
  };

  const handleConfirmSign = (e: React.FormEvent) => {
    e.preventDefault();
    signNeighborAttestation(selectedAttestation.id, activeNeighbor, signStatus, signComment);
    setShowSignModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 bg-white text-[#252B28]">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Users className="w-6 h-6 text-[#245C43]" />
          Community Verification Oracle &amp; Boundary Attestation
        </h1>
        <p className="text-xs text-[#4A524D] mt-1">
          Reconciling statutory titles and customary land tenure through decentralized perimeter neighbor consensus and traditional council attestation.
        </p>
      </div>

      {/* Tenure Filter Strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#4A524D] font-medium">Filter Notices:</span>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === 'all' ? 'bg-[#245C43] text-white shadow-xs' : 'bg-white text-[#252B28] hover:bg-[#F7F8F7] border border-[#CBD0C8]'
          }`}
        >
          All Notices ({communityAttestations.length})
        </button>
        <button
          onClick={() => setActiveTab('customary')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === 'customary' ? 'bg-[#245C43] text-white shadow-xs' : 'bg-white text-[#252B28] hover:bg-[#F7F8F7] border border-[#CBD0C8]'
          }`}
        >
          Customary &amp; Communal ({communityAttestations.filter(a => a.tenureType === 'Customary').length})
        </button>
        <button
          onClick={() => setActiveTab('statutory')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === 'statutory' ? 'bg-[#245C43] text-white shadow-xs' : 'bg-white text-[#252B28] hover:bg-[#F7F8F7] border border-[#CBD0C8]'
          }`}
        >
          Statutory Grants ({communityAttestations.filter(a => a.tenureType !== 'Customary').length})
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Attestation Notices */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-[#4A524D] font-semibold">Active Public Notices</div>
          {filteredAttestations.map(att => (
            <div
              key={att.id}
              onClick={() => setSelectedAttestationId(att.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedAttestation?.id === att.id
                  ? 'bg-[#F7F8F7] border-[#245C43] shadow-xs ring-1 ring-[#245C43]'
                  : 'bg-white border-[#E5E8E5] hover:bg-[#F7F8F7]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-[#252B28] text-xs">{att.parcelTitle}</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                  att.tenureType === 'Customary'
                    ? 'bg-[#245C43]/10 text-[#245C43]'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {att.tenureType || 'Statutory'} Notice
                </span>
              </div>
              <div className="text-xs text-[#252B28] font-semibold">{att.applicantName}</div>
              <div className="text-xs text-[#4A524D] mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#245C43]" />
                <span className="truncate">{att.location}</span>
              </div>
              <div className="text-xs text-[#4A524D] mt-1 font-mono">
                Deadline: {att.attestationDeadline}
              </div>
            </div>
          ))}
        </div>

        {/* Right 2 Columns: Perimeter Breakdown & Oracle Verdict */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E8E5] p-6 space-y-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E8E5]">
            <div>
              <div className="text-xs text-[#4A524D]">Target Parcel</div>
              <div className="text-xl font-bold text-[#252B28] font-mono">{selectedAttestation.parcelTitle}</div>
              <div className="text-xs text-[#4A524D]">{selectedAttestation.location}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#4A524D]">Notice Expiration</div>
              <div className="text-xs font-mono font-bold text-amber-800">{selectedAttestation.attestationDeadline}</div>
            </div>
          </div>

          {/* Oracle Determination Banner */}
          <div className={`p-4 rounded-xl border ${oracleResult.color} space-y-1 text-xs`}>
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Community Oracle Outcome: {oracleResult.outcome.toUpperCase()}</span>
              </div>
              <span className="text-xs font-mono uppercase">21-Day Statutory Window</span>
            </div>
            <p className="text-xs leading-relaxed">{oracleResult.desc}</p>
          </div>

          {/* Customary / Traditional Authority Assent Card */}
          <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[#252B28] font-semibold flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-[#245C43]" />
                <span>Traditional Rulers &amp; Chieftaincy Council Verification</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                  traditionalCouncilVerified ? 'bg-[#245C43]/10 text-[#245C43]' : 'bg-amber-100 text-amber-800'
                }`}>
                  {traditionalCouncilVerified ? 'AFFIRMED BY COUNCIL' : 'SEAL PENDING'}
                </span>
                <button
                  type="button"
                  onClick={toggleTraditionalCouncil}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:bg-[#F7F8F7] text-xs font-semibold"
                >
                  {traditionalCouncilVerified ? 'Revoke Seal (Test)' : 'Affirm Council Seal'}
                </button>
              </div>
            </div>
            <p className="text-xs text-[#4A524D] leading-relaxed">
              Family Trustee and Traditional Council seal: Root of title traced to communal allotment with ancestral boundary landmarks confirmed.
            </p>
          </div>

          {/* 4 Perimeter Neighbors Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#4A524D] font-semibold flex items-center justify-between">
              <span>Perimeter Boundary Neighbors (4 Cardinals)</span>
              <span className="text-[#245C43] text-xs font-bold">
                {selectedAttestation.neighborAttestations.filter(n => n.status === 'confirmed').length} / 4 Confirmed
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedAttestation.neighborAttestations.map((neighbor, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-[#245C43] text-xs">
                      {neighbor.boundarySide} Boundary
                    </span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                        neighbor.status === 'confirmed'
                          ? 'bg-[#245C43]/10 text-[#245C43]'
                          : neighbor.status === 'disputed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {neighbor.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-[#252B28]">{neighbor.neighborName}</div>
                    {neighbor.comment ? (
                      <p className="text-xs text-[#4A524D] italic mt-1 leading-snug">
                        "{neighbor.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-[#4A524D] italic mt-1">
                        Pending attestation signature.
                      </p>
                    )}
                  </div>

                  {neighbor.status === 'pending' && (
                    <button
                      onClick={() => handleOpenSign(neighbor.neighborName)}
                      className="w-full py-1.5 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simulate Signoff as Neighbor</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Neighbor Signoff Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E8E5] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
              <h3 className="text-base font-bold text-[#252B28] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#245C43]" />
                Neighbor Boundary Attestation Signoff
              </h3>
              <button
                onClick={() => setShowSignModal(false)}
                className="text-[#4A524D] hover:text-[#252B28] font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSign} className="space-y-4 text-xs">
              <div>
                <label className="text-[#4A524D] block mb-1 font-semibold">Attesting Abutting Neighbor</label>
                <div className="font-bold text-[#252B28] text-sm">{activeNeighbor}</div>
              </div>

              <div>
                <label className="text-[#252B28] block mb-1 font-semibold">Attestation Stance</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignStatus('confirmed')}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      signStatus === 'confirmed'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-white border-[#CBD0C8] text-[#252B28]'
                    }`}
                  >
                    Confirm Boundary (No Encroachment)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignStatus('disputed')}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      signStatus === 'disputed'
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-white border-[#CBD0C8] text-[#252B28]'
                    }`}
                  >
                    File Boundary Dispute
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[#252B28] block mb-1 font-semibold">Attestation Statement / Boundary Observation</label>
                <textarea
                  value={signComment}
                  onChange={e => setSignComment(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:bg-[#F7F8F7] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#245C43] text-white font-semibold hover:bg-[#1B4733] text-xs shadow-xs"
                >
                  Record Attestation On-Chain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
