import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RevocationRecord } from '../../types';
import {
  Crown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Receipt
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const GovernorPortal: React.FC = () => {
  const { currentRole, setCurrentRole, parcels, revocations, executeGovernorRevocation } = useApp();
  const isGovernor = currentRole === 'governor';

  const [selectedParcelId, setSelectedParcelId] = useState(parcels.find(p => p.status === 'verified')?.id || parcels[0]?.id || '');
  const [revocationReason, setRevocationReason] = useState<RevocationRecord['revocationReason']>('Overriding Public Interest');
  const [gazetteRef, setGazetteRef] = useState('');
  const [compensationAmount, setCompensationAmount] = useState(0);
  const [executivePasskey, setExecutivePasskey] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleRevokeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);
    setTimeout(() => {
      executeGovernorRevocation({
        parcelId: selectedParcelId,
        reason: revocationReason,
        gazetteRef,
        compensationAmount
      });
      setIsExecuting(false);
      setShowConfirmModal(false);
    }, 800);
  };

  const targetParcel = parcels.find(p => p.id === selectedParcelId);

  if (!targetParcel) {
    return (
      <div className="rounded-xl border border-[#E5E8E5] p-6 text-sm text-[#4A524D] bg-white shadow-xs">
        No recorded land titles are available for revocation review.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[#252B28]">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E8E5]">
        <div>
          <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
            <Crown className="w-6 h-6 text-[#245C43]" />
            Executive Governor Land Administration Portal
          </h1>
          <p className="text-xs text-[#4A524D] mt-1">
            Statutory governance under the Land Use Act, 1978 · Executive Orders &amp; Revocation Memorials
          </p>
        </div>

        {!isGovernor && (
          <button
            onClick={() => setCurrentRole('governor')}
            className="px-4 py-2.5 rounded-lg bg-[#245C43] text-white font-semibold text-xs tracking-wide hover:bg-[#1B4733] transition-colors"
          >
            Switch to Governor Persona
          </button>
        )}
      </div>

      {!isGovernor && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <div className="font-bold">Role-Based Access Restricted</div>
            <p className="mt-0.5">
              Only the <strong>Executive Governor</strong> demo persona has constitutional authority to execute statutory title revocations. Use the switcher above to activate full executive controls.
            </p>
          </div>
        </div>
      )}

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Total Statutory Revocations</div>
          <div className="text-2xl font-bold font-mono text-red-700 tabular-nums">{revocations.length}</div>
          <div className="text-xs text-[#4A524D]">Memorial entries recorded on-chain</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Total Compensation Assessed</div>
          <div className="text-2xl font-bold font-mono text-[#245C43] tabular-nums">
            ₦{(revocations.reduce((acc, r) => acc + r.compensationAmount, 0) / 1000000).toFixed(0)}M
          </div>
          <div className="text-xs text-[#4A524D]">State Land Valuation Board</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Governor Consent Invariants</div>
          <div className="text-2xl font-bold font-mono text-[#252B28]">100% Multi-Sig</div>
          <div className="text-xs text-[#245C43] font-medium">Section 28 Land Use Act Enforced</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revocation Action Form */}
        <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-700" />
              Statutory Revocation Order Protocol
            </h2>
            <p className="text-xs text-[#4A524D] mt-1">
              Extinguish a right of occupancy for overriding public interest or breach of statutory condition.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[#252B28] block mb-1 font-semibold">Target Titled Parcel</label>
              <select
                value={selectedParcelId}
                onChange={e => setSelectedParcelId(e.target.value)}
                disabled={!isGovernor}
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
              >
                {parcels.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.titleNumber} - {p.ownerName} ({p.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#252B28] block mb-1 font-semibold">
                Statutory Grounds — Land Use Act (1978) Section 28
              </label>
              <select
                value={revocationReason}
                onChange={e => setRevocationReason(e.target.value as RevocationRecord['revocationReason'])}
                disabled={!isGovernor}
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
              >
                <option value="Overriding Public Interest">
                  Ground 1: Overriding Public Interest (Sec. 28(2) - Infrastructure/Highway/Public Use)
                </option>
                <option value="Breach of Statutory Condition">
                  Ground 2: Breach of Statutory Condition (Sec. 28(5) - Failure to Improve/Unapproved Use)
                </option>
              </select>
            </div>

            <div>
              <label className="text-[#252B28] block mb-1 font-semibold">Official State Gazette Notice Reference</label>
              <input
                type="text"
                value={gazetteRef}
                onChange={e => setGazetteRef(e.target.value)}
                disabled={!isGovernor}
                placeholder="e.g., NNGS-2026-44"
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#252B28] block mb-1 font-semibold">Statutory Compensation Assessment (₦)</label>
              <input
                type="number"
                value={compensationAmount}
                onChange={e => setCompensationAmount(Number(e.target.value))}
                disabled={!isGovernor}
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!isGovernor || targetParcel.status === 'revoked'}
              className="w-full mt-2 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              <span>{targetParcel.status === 'revoked' ? 'Title Already Revoked' : 'Execute Statutory Revocation'}</span>
            </button>
          </div>
        </div>

        {/* Revocation Memorials Archive */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#245C43]" />
              State Gazette Revocation Memorials
            </h2>
            <span className="text-xs font-mono text-[#4A524D]">Permanently Recorded</span>
          </div>

          <div className="space-y-3">
            {revocations.map(rev => (
              <div key={rev.id} className="p-4 rounded-lg bg-[#F7F8F7] border border-red-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-red-700 text-sm">{rev.orderNumber}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">
                    EXECUTED ORDER · GIS REVERTED
                  </span>
                </div>
                <div className="text-[#252B28] font-medium">
                  Target: <strong className="font-mono">{rev.parcelTitle}</strong> (Ex-Owner: {rev.previousOwner})
                </div>
                <div className="text-xs text-[#4A524D]">
                  Grounds: <span className="text-[#252B28] font-semibold">{rev.revocationReason}</span> · Gazette: <span className="font-mono text-[#245C43] font-semibold">{rev.gazetteNoticeNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E8E5] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
              <h3 className="text-base font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Confirm Executive Statutory Revocation
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-[#4A524D] hover:text-[#252B28] font-bold">✕</button>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-red-900 text-xs space-y-2">
              <p><strong>Warning:</strong> You are about to invoke executive power under the Land Use Act to revoke Right of Occupancy for <strong>{targetParcel.titleNumber}</strong>.</p>
              <p>This action will extinguish all conveyancing rights and record an immutable on-chain memorial.</p>
            </div>

            <form onSubmit={handleRevokeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[#252B28] block mb-1 font-semibold">Executive Cryptographic Assent Key</label>
                <input
                  type="password"
                  value={executivePasskey}
                  onChange={e => setExecutivePasskey(e.target.value)}
                  placeholder="Enter governor assent key"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:bg-[#F7F8F7] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="px-5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold"
                >
                  {isExecuting ? 'Executing Order...' : 'Confirm & Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
