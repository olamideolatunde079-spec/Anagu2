import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Award,
  Clock,
  Receipt,
  FilePlus,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { currentUser, parcels, applications, transactions, setSelectedCertificateParcel } = useApp();

  const myParcels = parcels.filter(p => p.ownerId === currentUser.id);
  const myApplications = applications.filter(a => a.applicantId === currentUser.id);
  const totalValuation = myParcels.reduce((acc, p) => acc + (p.status !== 'revoked' ? p.marketValuation : 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[#252B28] relative">

      {/* Welcome Banner */}
      <div className="bg-white border border-[#E5E8E5] rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#245C43] mb-1">
            My ANAGU · Personal Workspace
          </div>
          <h1 className="text-2xl font-bold text-[#252B28]">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-sm text-[#4A524D] mt-1">
            National ID: <span className="font-mono font-medium text-[#252B28]">{currentUser.nationalId}</span> · Wallet: <span className="font-mono text-[#4A524D]">{currentUser.walletAddress}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/portal/register-land"
            className="px-4 py-2.5 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" />
            <span>Register New Parcel</span>
          </Link>
          <Link
            to="/portal/gis"
            className="px-4 py-2.5 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] text-xs font-semibold hover:bg-[#F7F8F7] transition-colors flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-[#245C43]" />
            <span>Open GIS Map</span>
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#4A524D]">
            <span>Verified Title Deeds</span>
            <Award className="w-4 h-4 text-[#245C43]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#252B28] tabular-nums">
            {myParcels.filter(p => p.status === 'verified').length}
          </div>
          <div className="text-xs text-[#245C43] font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cryptographically Active</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#4A524D]">
            <span>Portfolio Valuation</span>
            <TrendingUp className="w-4 h-4 text-[#245C43]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#252B28] tabular-nums">
            ₦{(totalValuation / 1000000).toFixed(1)}M
          </div>
          <div className="text-xs text-[#4A524D]">Estimated market asset value</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#4A524D]">
            <span>Pending Applications</span>
            <Clock className="w-4 h-4 text-[#245C43]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#252B28] tabular-nums">
            {myApplications.filter(a => a.status !== 'approved' && a.status !== 'rejected').length}
          </div>
          <div className="text-xs text-[#4A524D]">In survey or community review</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#4A524D]">
            <span>Guarded Beacons</span>
            <MapPin className="w-4 h-4 text-[#245C43]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#252B28] tabular-nums">
            {myParcels.reduce((acc, p) => acc + p.coordinates.length, 0)}
          </div>
          <div className="text-xs text-[#4A524D]">WGS-84 Pillars recorded</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Titled Land Assets */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#245C43]" />
              My Lands
            </h2>
            <Link to="/portal/my-lands" className="text-xs text-[#245C43] hover:underline flex items-center gap-1 font-semibold">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {myParcels.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-center space-y-2">
                <p className="text-sm font-medium text-[#252B28]">No titled parcels in My ANAGU yet.</p>
                <p className="text-xs text-[#4A524D]">Start by submitting a new land parcel registration or verifying an existing title.</p>
              </div>
            ) : myParcels.map(parcel => (
              <div key={parcel.id} className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#252B28] text-sm">{parcel.titleNumber}</span>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-white text-[#245C43] border border-[#CBD0C8] font-semibold">
                      {parcel.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#4A524D]">
                    {parcel.district}, {parcel.lga}, {parcel.state} State · <span className="text-[#245C43] font-medium">{parcel.landUse}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {parcel.certificateIssued && (
                    <button onClick={() => setSelectedCertificateParcel(parcel)} className="px-3 py-1.5 rounded-lg bg-[#245C43]/10 border border-[#245C43]/30 text-[#245C43] text-xs font-semibold hover:bg-[#245C43]/20 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      <span>C of O</span>
                    </button>
                  )}
                  <Link to={`/portal/lands/${parcel.id}`} className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] text-xs font-semibold hover:bg-[#F7F8F7]">
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Applications */}
        <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#245C43]" />
              My Applications
            </h2>
            <Link to="/portal/applications" className="text-xs text-[#245C43] hover:underline font-semibold">View</Link>
          </div>

          <div className="space-y-3">
            {myApplications.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-center space-y-2">
                <p className="text-sm font-medium text-[#252B28]">No active applications.</p>
                <Link to="/portal/register-land" className="inline-block text-xs font-semibold text-[#245C43] hover:underline">
                  Register a Land Parcel →
                </Link>
              </div>
            ) : myApplications.map(app => (
              <div key={app.id} className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#252B28]">{app.applicationNumber}</span>
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-white border border-[#CBD0C8] text-[#245C43] font-semibold">
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-[#4A524D]">{app.district}, {app.state}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#4A524D] font-mono">
                    <span>Attestations:</span>
                    <span className="text-[#245C43] font-bold">{app.attestationsCount} / {app.requiredAttestations}</span>
                  </div>
                  <div className="w-full bg-[#E5E8E5] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#245C43] h-full transition-all" style={{ width: `${(app.attestationsCount / app.requiredAttestations) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-6 space-y-4 relative z-10">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
          <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#245C43]" />
            My Transactions
          </h2>
          <Link to="/portal/explorer" className="text-xs text-[#245C43] hover:underline font-semibold">Block Explorer</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8F7] text-xs font-semibold text-[#252B28] border-b border-[#E5E8E5]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Transaction Hash</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Block</th>
                <th className="py-2.5 px-4 font-semibold">Parcel Ref</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E5] font-mono">
              {transactions.slice(0, 3).map(tx => (
                <tr key={tx.id} className="hover:bg-[#F7F8F7] transition-colors">
                  <td className="py-2.5 px-4 text-[#245C43] font-medium">{tx.hash}</td>
                  <td className="py-2.5 px-4 text-[#252B28] font-sans">{tx.type}</td>
                  <td className="py-2.5 px-4 text-[#245C43]">#{tx.blockNumber}</td>
                  <td className="py-2.5 px-4 text-[#252B28]">{tx.parcelTitle}</td>
                  <td className="py-2.5 px-4">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43] font-semibold">Confirmed</span>
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
