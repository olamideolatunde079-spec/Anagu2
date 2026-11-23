import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Award,
  Search,
  Filter,
  FilePlus,
  Eye,
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const MyLandsView: React.FC = () => {
  const { parcels, currentUser, setSelectedCertificateParcel } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLandUse, setFilterLandUse] = useState<string>('all');

  const myParcels = parcels.filter(p => p.ownerId === currentUser.id);

  const filtered = myParcels.filter(p => {
    const matchesSearch =
      p.titleNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.district.toLowerCase().includes(search.toLowerCase()) ||
      p.state.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesUse = filterLandUse === 'all' || p.landUse === filterLandUse;

    return matchesSearch && matchesStatus && matchesUse;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to My Dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#245C43]" />
            My Lands
          </h1>
          <p className="text-sm text-[#4A524D] mt-1 leading-relaxed">
            View and manage your verified land parcels, survey boundaries, and digital Certificates of Occupancy in My ANAGU.
          </p>
        </div>

        <Link
          to="/portal/register-land"
          className="px-4 py-2.5 min-h-[40px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 shadow-xs self-start sm:self-auto"
        >
          <FilePlus className="w-4 h-4" />
          <span>Register New Land</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#545B56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by title deed ref, district or state..."
            className="w-full bg-white border border-[#CBD0C8] rounded-lg pl-9 pr-3 py-2 text-sm text-[#252B28] placeholder-[#545B56] focus:outline-none focus:border-[#245C43]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[#252B28]">
            <Filter className="w-4 h-4 text-[#4A524D]" />
            <span className="font-medium text-[#4A524D]">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-sm text-[#252B28] focus:border-[#245C43] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified Active</option>
              <option value="community_review">Community Review</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-[#252B28]">
            <span className="font-medium text-[#4A524D]">Land Use:</span>
            <select
              value={filterLandUse}
              onChange={e => setFilterLandUse(e.target.value)}
              className="bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-sm text-[#252B28] focus:border-[#245C43] focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
              <option value="Mixed Use">Mixed Use</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parcels Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E8E5] space-y-3 shadow-xs">
          <p className="text-sm text-[#4A524D] font-medium">No titled parcels match your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(parcel => (
            <div
              key={parcel.id}
              className="bg-white rounded-2xl border border-[#E5E8E5] hover:border-[#245C43] transition-colors flex flex-col justify-between overflow-hidden shadow-xs"
            >
              <div className="p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[#252B28] text-sm">{parcel.titleNumber}</span>
                  <span
                    className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded font-semibold border ${
                      parcel.status === 'verified'
                        ? 'bg-[#EBF4EF] text-[#164E35] border-[#C4DFC9]'
                        : parcel.status === 'community_review'
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-red-50 text-red-900 border-red-200'
                    }`}
                  >
                    {parcel.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-sm text-[#252B28]">
                  <div className="font-semibold text-[#252B28]">{parcel.district}</div>
                  <div className="text-[#4A524D] text-xs mt-0.5">{parcel.lga}, {parcel.state} State</div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] text-xs font-mono">
                  <div>
                    <span className="text-[#4A524D] block font-sans font-medium">Area</span>
                    <span className="text-[#252B28] font-bold text-sm">{parcel.sizeSqm.toLocaleString()} m²</span>
                  </div>
                  <div>
                    <span className="text-[#4A524D] block font-sans font-medium">Zoning</span>
                    <span className="text-[#252B28] font-semibold text-sm">{parcel.landUse}</span>
                  </div>
                  <div>
                    <span className="text-[#4A524D] block font-sans font-medium">Beacons</span>
                    <span className="text-[#252B28] font-semibold text-sm">{parcel.coordinates.length} Pillars</span>
                  </div>
                  <div>
                    <span className="text-[#4A524D] block font-sans font-medium">Valuation</span>
                    <span className="text-[#245C43] font-bold text-sm">₦{(parcel.marketValuation / 1000000).toFixed(0)}M</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-[#F7F8F7] border-t border-[#E5E8E5] flex items-center justify-between gap-2">
                <Link
                  to={`/portal/lands/${parcel.id}`}
                  className="px-3.5 py-2 min-h-[38px] rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] text-xs font-semibold hover:border-[#245C43] hover:text-[#245C43] transition-colors inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Deed</span>
                </Link>

                {parcel.certificateIssued && (
                  <button
                    type="button"
                    onClick={() => setSelectedCertificateParcel(parcel)}
                    className="px-3.5 py-2 min-h-[38px] rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>C of O Certificate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
