import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Award,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { BackButton } from '../common/BackButton';
import { LeafletMap } from '../gis/LeafletMap';

export const LandDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { parcels, setSelectedCertificateParcel, addNotification } = useApp();

  const parcel = parcels.find(p => p.id === id) || parcels[0];
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerNIN, setBuyerNIN] = useState('');
  const [agreedConsideration, setAgreedConsideration] = useState('');

  if (!parcel) {
    return (
      <div className="rounded-xl border border-[#E5E8E5] bg-white p-6 text-sm text-[#4A524D] shadow-xs">
        This parcel is not available in your account.
      </div>
    );
  }

  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification({
      title: 'Registry Transfer Application Lodged',
      message: `Registry-Controlled Transfer Lodged for ${parcel.titleNumber}! Application sent to Deeds Registry for Notary Vetting & Governor's Consent.`,
      type: 'success',
    });
    setShowTransferModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button & Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <BackButton to="/portal/my-lands" label="Back to My Lands" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#252B28] font-mono">{parcel.titleNumber}</h1>
              <span
                className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
                  parcel.status === 'verified'
                    ? 'bg-[#EBF4EF] text-[#164E35] border-[#C4DFC9]'
                    : 'bg-red-50 text-red-900 border-red-200'
                }`}
              >
                {parcel.status}
              </span>
            </div>
            <p className="text-xs text-[#4A524D] mt-1">
              Token ID: <span className="font-mono font-semibold text-[#245C43]">{parcel.tokenHash}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {parcel.certificateIssued && (
            <button
              type="button"
              onClick={() => setSelectedCertificateParcel(parcel)}
              className="px-4 py-2.5 min-h-[40px] rounded-xl bg-white border border-[#CBD0C8] hover:border-[#245C43] text-[#252B28] font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Award className="w-4 h-4 text-[#245C43]" />
              <span>Digital Certificate (C of O)</span>
            </button>
          )}

          {parcel.status === 'verified' && (
            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2.5 min-h-[40px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Registry Transfer</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details + GIS Geometry Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details and Beacons */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cadastre Overview Card */}
          <div className="bg-white rounded-2xl border border-[#E5E8E5] p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
              <MapPin className="w-4 h-4 text-[#245C43]" />
              Cadastral Identity &amp; Location
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Beneficiary Owner</span>
                <span className="text-[#252B28] font-semibold">{parcel.ownerName}</span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">National Identification (NIN)</span>
                <span className="text-[#245C43] font-mono font-semibold">{parcel.ownerNationalId}</span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Geographic District</span>
                <span className="text-[#252B28] font-semibold">{parcel.district}</span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">LGA &amp; State</span>
                <span className="text-[#252B28] font-semibold">
                  {parcel.lga}, {parcel.state}
                </span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Cadastral Area</span>
                <span className="text-[#252B28] font-mono font-bold">
                  {parcel.sizeSqm.toLocaleString()} m² ({parcel.sizeHectares} Ha)
                </span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Approved Land Use</span>
                <span className="text-[#252B28] font-semibold">{parcel.landUse}</span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Survey Plan Ref</span>
                <span className="text-[#245C43] font-mono font-semibold">{parcel.surveyPlanNumber}</span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Licensed Surveyor</span>
                <span className="text-[#252B28] font-medium">{parcel.surveyorName}</span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Registration Date</span>
                <span className="text-[#252B28] font-medium">{parcel.dateRegistered}</span>
              </div>
            </div>
          </div>

          {/* Beacon Coordinates Table */}
          <div className="bg-white rounded-2xl border border-[#E5E8E5] p-6 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E8E5]">
              <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#245C43]" />
                Geodetic Perimeter Beacons (WGS-84)
              </h2>
              <span className="text-xs font-mono font-semibold text-[#245C43]">Differential GPS Confirmed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-mono">
                <thead className="text-xs text-[#252B28] font-bold border-b border-[#E5E8E5] bg-[#F7F8F7] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Beacon Pillar Ref</th>
                    <th className="py-2.5 px-3">Latitude (°N)</th>
                    <th className="py-2.5 px-3">Longitude (°E)</th>
                    <th className="py-2.5 px-3">UTM Easting</th>
                    <th className="py-2.5 px-3">UTM Northing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E5]">
                  {parcel.coordinates.map((coord, i) => (
                    <tr key={coord.id || i} className="hover:bg-[#F7F8F7]">
                      <td className="py-2.5 px-3 text-[#245C43] font-bold">{coord.beaconNumber}</td>
                      <td className="py-2.5 px-3 text-[#252B28]">{coord.lat.toFixed(6)}°</td>
                      <td className="py-2.5 px-3 text-[#252B28]">{coord.lng.toFixed(6)}°</td>
                      <td className="py-2.5 px-3 text-[#4A524D]">{coord.easting || '552,140'} m</td>
                      <td className="py-2.5 px-3 text-[#4A524D]">{coord.northing || '711,920'} m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Encumbrances & Memorials */}
          <div className="bg-white rounded-2xl border border-[#E5E8E5] p-6 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
              <ShieldCheck className="w-4 h-4 text-[#245C43]" />
              Encumbrances &amp; Statutory Memorials
            </h2>
            {parcel.encumbrances.length === 0 ? (
              <p className="text-sm text-[#164E35] bg-[#EBF4EF] border border-[#C4DFC9] rounded-xl p-3.5 font-medium">
                ✓ Clean Title: Zero liens, mortgages, or statutory easements recorded against this deed.
              </p>
            ) : (
              <div className="space-y-2">
                {parcel.encumbrances.map((enc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-sm font-medium">
                    {enc}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: OpenStreetMap Parcel Geometry & IPFS Hash */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E8E5] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E8E5]">
              <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#245C43]" />
                Cadastral Boundary Map
              </h2>
              <span className="text-xs font-mono font-semibold text-[#245C43]">EPSG:4326</span>
            </div>

            <LeafletMap
              parcels={[
                {
                  id: parcel.id,
                  title: parcel.titleNumber,
                  coords: parcel.coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
                  color: '#245C43',
                },
              ]}
              center={
                parcel.coordinates[0]
                  ? { lat: parcel.coordinates[0].lat, lng: parcel.coordinates[0].lng }
                  : { lat: 6.4541, lng: 3.3947 }
              }
              height="h-56"
              readOnly
            />

            <Link
              to="/portal/gis"
              className="block w-full py-2.5 text-center rounded-xl bg-[#F7F8F7] border border-[#CBD0C8] text-[#252B28] hover:border-[#245C43] hover:text-[#245C43] text-xs font-semibold transition-colors"
            >
              Open in Full GIS Spatial Engine
            </Link>
          </div>

          {/* Cryptographic Ledger Invariants */}
          <div className="bg-white rounded-2xl border border-[#E5E8E5] p-5 space-y-3 text-xs font-mono shadow-xs">
            <h3 className="text-xs uppercase font-bold text-[#252B28] tracking-wider">
              Cryptographic Invariants
            </h3>
            <div>
              <span className="text-[#4A524D] block font-sans font-semibold">Smart Contract Standard</span>
              <span className="text-[#252B28] font-bold">ERC-721-STATE-CADASTRE</span>
            </div>
            <div>
              <span className="text-[#4A524D] block font-sans font-semibold">IPFS Document CID</span>
              <span className="text-[#245C43] font-semibold break-all">{parcel.ipfsDocumentHash}</span>
            </div>
            <div>
              <span className="text-[#4A524D] block font-sans font-semibold">Block Height</span>
              <span className="text-[#245C43] font-bold">#{parcel.blockNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Registry-Controlled Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#CBD0C8] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
              <h3 className="text-base font-bold text-[#252B28] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#245C43]" />
                Apply for Registry-Controlled Transfer
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-[#4A524D] hover:text-[#252B28] text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <span>
                <strong>Statutory Notice:</strong> Under the Land Use Act, direct peer-to-peer NFT conveyances are blocked by protocol smart contracts. Title transfer requires Deeds Registry verification, Stamp Duty clearance, and Governor's Consent.
              </span>
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-4 text-sm">
              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">
                  Purchaser / Assignee Full Legal Name
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="e.g. Alh. Farouk Dantata"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">
                  Purchaser National ID (NIN) or RC Number
                </label>
                <input
                  type="text"
                  value={buyerNIN}
                  onChange={e => setBuyerNIN(e.target.value)}
                  placeholder="e.g. NIN-9912-3849-0012"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] font-mono focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">
                  Agreed Consideration (Transaction Value in ₦)
                </label>
                <input
                  type="text"
                  value={agreedConsideration}
                  onChange={e => setAgreedConsideration(e.target.value)}
                  placeholder="e.g. 350,000,000"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] font-mono focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 min-h-[40px] rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] hover:bg-[#F7F8F7] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 min-h-[40px] rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-semibold"
                >
                  Submit Transfer Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
