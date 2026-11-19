import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Landmark, Search, Filter } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const LandAdminPortal: React.FC = () => {
  const { parcels, setSelectedCertificateParcel } = useApp();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (location.pathname.endsWith('/disputes')) setStatusFilter('revoked');
    else setStatusFilter('all');
  }, [location.pathname]);

  const filtered = parcels.filter(p => {
    const matchSearch =
      p.titleNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      p.district.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Landmark className="w-6 h-6 text-[#245C43]" />
          Land Administrator Master Cadastre Registry
        </h1>
        <p className="text-xs text-[#4A524D] mt-1">
          Federal & State Cadastre Supervision · Chain of Custody & Boundary Ledger
        </p>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#4A524D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search master titles, owner names or districts..."
            className="w-full bg-[#F7F8F7] border border-[#CBD0C8] rounded-lg pl-9 pr-3 py-2 text-xs text-[#252B28] placeholder-[#4A524D] focus:bg-white focus:border-[#245C43] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#4A524D] font-medium">
          <Filter className="w-3.5 h-3.5 text-[#4A524D]" />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-[#CBD0C8] rounded-lg px-2.5 py-1.5 text-xs text-[#252B28] focus:border-[#245C43] focus:outline-none"
          >
            <option value="all">All Titles</option>
            <option value="verified">Verified Active</option>
            <option value="community_review">Community Review</option>
            <option value="revoked">Statutorily Revoked</option>
          </select>
        </div>
      </div>

      {/* Master Registry Table */}
      <div className="bg-white rounded-xl border border-[#E5E8E5] p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-xs font-mono uppercase text-[#4A524D] border-b border-[#E5E8E5] bg-[#F7F8F7]">
              <tr>
                <th className="py-3 px-3">Title Deed Ref</th>
                <th className="py-3 px-3">Owner / Beneficiary</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Land Use</th>
                <th className="py-3 px-3">Cadastral Area</th>
                <th className="py-3 px-3">Valuation</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E5]">
              {filtered.map(parcel => (
                <tr key={parcel.id} className="hover:bg-[#F7F8F7] transition-colors">
                  <td className="py-3.5 px-3 font-mono font-bold text-[#252B28]">{parcel.titleNumber}</td>
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-[#252B28]">{parcel.ownerName}</div>
                    <div className="text-xs text-[#4A524D] font-mono">{parcel.ownerNationalId}</div>
                  </td>
                  <td className="py-3.5 px-3 text-[#4A524D]">
                    {parcel.district}, {parcel.state}
                  </td>
                  <td className="py-3.5 px-3 text-[#252B28] font-medium">{parcel.landUse}</td>
                  <td className="py-3.5 px-3 font-mono text-[#252B28]">
                    {parcel.sizeSqm.toLocaleString()} m² ({parcel.sizeHectares} Ha)
                  </td>
                  <td className="py-3.5 px-3 font-mono font-semibold text-[#245C43]">
                    ₦{(parcel.marketValuation / 1000000).toFixed(0)}M
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`text-xs font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        parcel.status === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : parcel.status === 'community_review'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {parcel.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {parcel.certificateIssued && (
                      <button
                        onClick={() => setSelectedCertificateParcel(parcel)}
                        className="px-2.5 py-1 rounded-md bg-[#245C43]/10 text-[#245C43] hover:bg-[#245C43] hover:text-white font-bold text-xs transition-colors border border-[#245C43]/20"
                      >
                        C of O
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
