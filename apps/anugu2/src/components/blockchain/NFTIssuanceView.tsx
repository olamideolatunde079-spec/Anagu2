import React from 'react';
import { useApp } from '../../context/AppContext';
import { Award, Lock } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const NFTIssuanceView: React.FC = () => {
  const { parcels, setSelectedCertificateParcel } = useApp();
  const issuedTokens = parcels.filter(p => p.certificateIssued);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Award className="w-6 h-6 text-[#245C43]" />
          Digital Title Deed & Issuance Registry
        </h1>
        <p className="text-xs text-[#4A524D] mt-1">
          Cryptographically registered Certificate of Occupancy (C of O) tokens anchored to official state land gazette.
        </p>
      </div>

      {/* Protocol Architecture Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-[#252B28]">Registry-Controlled Smart Contract Architecture</div>
          <p className="text-[#4A524D] mt-1 leading-relaxed">
            Unlike standard crypto tokens, ANAGU Title Deeds enforce statutory restrictions in smart contract logic: titles cannot be transferred directly peer-to-peer. Every assignment requires Registrar validation, stamp duty verification, and Executive Governor consent pursuant to Section 22 of the Land Use Act.
          </p>
        </div>
      </div>

      {/* Grid of Minted NFT Deeds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {issuedTokens.map(parcel => (
          <div
            key={parcel.id}
            className="bg-white rounded-xl border border-[#E5E8E5] overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            {/* Top Certificate Preview Strip */}
            <div className="p-5 bg-[#F7F8F7] border-b border-[#E5E8E5] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43] border border-[#245C43]/20 font-bold">
                  ERC-721 TITLE DEED
                </span>
                <span className="text-xs font-mono text-emerald-800 font-semibold">Block #{parcel.blockNumber}</span>
              </div>
              <h2 className="text-base font-bold text-[#252B28] font-mono">{parcel.titleNumber}</h2>
              <div className="text-xs text-[#4A524D]">
                Grantee: <strong className="text-[#252B28]">{parcel.ownerName}</strong>
              </div>
            </div>

            {/* Token Body */}
            <div className="p-5 space-y-3 text-xs">
              <div className="space-y-1 font-mono text-xs">
                <div className="text-[#4A524D] font-medium">Token Hash Digest:</div>
                <div className="text-[#245C43] truncate bg-[#F7F8F7] p-1.5 rounded border border-[#E5E8E5] font-semibold">{parcel.tokenHash}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-xs font-mono">
                <div>
                  <span className="text-[#4A524D] block text-xs uppercase font-semibold">Cadastral Area</span>
                  <span className="text-[#252B28] font-bold">{parcel.sizeSqm.toLocaleString()} m²</span>
                </div>
                <div>
                  <span className="text-[#4A524D] block text-xs uppercase font-semibold">Zoning</span>
                  <span className="text-[#252B28] font-semibold">{parcel.landUse}</span>
                </div>
              </div>

              <div className="text-xs text-[#4A524D]">
                {parcel.district}, {parcel.lga}, {parcel.state} State
              </div>
            </div>

            {/* Footer Button */}
            <div className="p-4 bg-white border-t border-[#E5E8E5]">
              <button
                onClick={() => setSelectedCertificateParcel(parcel)}
                className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Award className="w-4 h-4" />
                <span>View Full Certificate (C of O)</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      {issuedTokens.length === 0 && (
        <div className="rounded-xl border border-[#E5E8E5] bg-white p-8 text-center text-sm text-[#4A524D]">
          No digital title deeds have been issued to this account yet.
        </div>
      )}
    </div>
  );
};
