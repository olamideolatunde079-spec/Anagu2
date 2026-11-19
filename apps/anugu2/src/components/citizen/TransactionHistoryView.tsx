import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Receipt, Search, Filter } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const TransactionHistoryView: React.FC = () => {
  const { transactions } = useApp();
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(tx => {
    const matchesSearch =
      tx.hash.toLowerCase().includes(search.toLowerCase()) ||
      tx.parcelTitle.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to My Dashboard" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <Receipt className="w-6 h-6 text-[#245C43]" />
          My Transactions
        </h1>
        <p className="text-sm text-[#4A524D] mt-1 leading-relaxed">
          Verifiable blockchain ledger records of your title registrations, survey attestations, and registry transfers.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#545B56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tx hash or parcel reference..."
            className="w-full bg-white border border-[#CBD0C8] rounded-lg pl-9 pr-3 py-2 text-sm text-[#252B28] placeholder-[#545B56] font-mono focus:border-[#245C43] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-[#252B28]">
          <Filter className="w-4 h-4 text-[#4A524D]" />
          <span className="font-medium text-[#4A524D]">Type:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-sm text-[#252B28] focus:border-[#245C43] focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="TITLE_REGISTRATION">Title Registrations</option>
            <option value="SURVEY_ATTESTATION">Survey Attestations</option>
            <option value="REVOCATION_ORDER">Revocation Orders</option>
            <option value="COMMUNITY_SIGN">Community Signoffs</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8E5] p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono min-w-[680px]">
            <thead className="text-xs uppercase text-[#252B28] font-bold border-b border-[#E5E8E5] bg-[#F7F8F7]">
              <tr>
                <th className="py-3 px-3">Tx Hash</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Block #</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">From</th>
                <th className="py-3 px-3">Parcel Reference</th>
                <th className="py-3 px-3">Gas Fee</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E5]">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-[#F7F8F7] transition-colors">
                  <td className="py-3 px-3 text-[#245C43] font-semibold truncate max-w-[150px]">{tx.hash}</td>
                  <td className="py-3 px-3 text-[#252B28] font-sans font-semibold text-xs">{tx.type}</td>
                  <td className="py-3 px-3 text-[#245C43] font-bold">#{tx.blockNumber}</td>
                  <td className="py-3 px-3 text-[#4A524D] text-xs">{tx.timestamp}</td>
                  <td className="py-3 px-3 text-[#252B28] text-xs truncate max-w-[120px]">{tx.from}</td>
                  <td className="py-3 px-3 text-[#252B28] font-bold text-xs">{tx.parcelTitle}</td>
                  <td className="py-3 px-3 text-[#4A524D] text-xs">{tx.gasFee}</td>
                  <td className="py-3 px-3">
                    <span className="text-xs font-sans font-semibold px-2.5 py-0.5 rounded bg-[#EBF4EF] text-[#164E35] border border-[#C4DFC9]">
                      Confirmed
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center font-sans text-sm text-[#4A524D]">
                    No transactions match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
