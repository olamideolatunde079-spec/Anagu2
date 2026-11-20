import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../hooks/useWallet';
import { initiateLandPurchase } from '../../lib/web3';
import { Parcel } from '../../types';
import {
  ShoppingCart, Wallet, CheckCircle2, AlertTriangle, MapPin,
  Layers, TrendingUp, Zap, X, Loader2, Award, Search, Filter, Eye, Phone, ShieldCheck
} from 'lucide-react';
import { LeafletMap } from '../gis/LeafletMap';

const LISTING_PRICES: Record<string, { eth: string; naira: number }> = {
  'pcl-001': { eth: '1.25', naira: 285000000 },
  'pcl-002': { eth: '0.85', naira: 410000000 },
  'pcl-003': { eth: '2.10', naira: 550000000 },
};

export const LandMarketplace: React.FC = () => {
  const { parcels, addNotification, currentUser } = useApp();
  const { wallet, connecting, error: walletError, connect, hasWallet } = useWallet();
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [txState, setTxState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [priceInput, setPriceInput] = useState('');

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedLandUse, setSelectedLandUse] = useState('All');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'size'>('price-asc');

  const listedParcels = parcels.filter(p => p.status === 'verified' || p.isDemo);

  const filteredParcels = listedParcels.filter(p => {
    const matchesSearch =
      p.titleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lga.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesState = selectedState === 'All' || p.state === selectedState;
    const matchesLandUse = selectedLandUse === 'All' || p.landUse === selectedLandUse;
    return matchesSearch && matchesState && matchesLandUse;
  }).sort((a, b) => {
    const priceA = a.askingPriceNaira || a.marketValuation || 100000000;
    const priceB = b.askingPriceNaira || b.marketValuation || 100000000;
    if (sortBy === 'price-asc') return priceA - priceB;
    if (sortBy === 'price-desc') return priceB - priceA;
    return b.sizeSqm - a.sizeSqm;
  });

  const openDetailsModal = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setDetailsModalOpen(true);
  };

  const openBuyModal = async (parcel: Parcel) => {
    setSelectedParcel(parcel);
    const pInfo = LISTING_PRICES[parcel.id] ?? { eth: '0.50', naira: parcel.marketValuation || 150000000 };
    setPriceInput(pInfo.eth);
    setTxState('idle'); setTxHash(''); setTxError('');
    setBuyModalOpen(true);
    if (!wallet.connected) await connect();
  };

  const handleBuy = async () => {
    if (!selectedParcel || !wallet.connected || !wallet.address) return;
    setTxState('pending'); setTxError('');
    try {
      const result = await initiateLandPurchase({
        tokenId: selectedParcel.id,
        sellerAddress: '0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73',
        priceEth: priceInput,
        parcelTitle: selectedParcel.titleNumber,
      });
      if (result.success) {
        setTxHash(result.txHash); setTxState('success');
        addNotification({ title: 'Purchase Submitted', message: `Payment for ${selectedParcel.titleNumber} transmitted. Awaiting Registrar approval.`, type: 'success' });
      } else { setTxState('error'); setTxError(result.error ?? 'Transaction failed'); }
    } catch (err: any) { setTxState('error'); setTxError(err.message ?? 'Transaction failed'); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 bg-white text-[#252B28]">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 border border-[#E5E8E5] shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#245C43] mb-1">
              ANAGU Land Marketplace · Registry-Governed Web3 & GIS Land Titles
            </div>
            <h1 className="text-2xl font-bold text-[#252B28]">Verified Land & Title Marketplace</h1>
            <p className="text-sm text-[#4A524D] mt-1">
              Browse verified Nigerian land parcels with cadastral GIS boundary geometry, title verification, and Web3 secure transactions.
            </p>
          </div>
          {wallet.connected ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#245C43]/10 border border-[#245C43]/30">
              <Wallet className="w-4 h-4 text-[#245C43]" />
              <div className="text-xs">
                <div className="text-[#245C43] font-semibold">{wallet.walletName}</div>
                <div className="text-[#4A524D] font-mono">{wallet.address?.slice(0,6)}…{wallet.address?.slice(-4)} · {wallet.balance} ETH</div>
              </div>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="px-4 py-2.5 min-h-[40px] rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              <span>{connecting ? 'Connecting…' : hasWallet ? 'Connect Wallet' : 'Install MetaMask'}</span>
            </button>
          )}
        </div>
        {walletError && <p className="text-xs text-red-700 mt-2 font-medium">{walletError}</p>}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#F7F8F7] rounded-xl p-4 border border-[#E5E8E5] flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#4A524D]" />
          <input
            type="text"
            placeholder="Search by title number, district, LGA, or state..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#CBD0C8] rounded-lg pl-10 pr-4 py-2 text-xs text-[#252B28] focus:border-[#245C43] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            aria-label="Filter by State"
            className="bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-xs text-[#252B28] focus:border-[#245C43] focus:outline-none"
          >
            <option value="All">All States</option>
            <option value="Lagos">Lagos</option>
            <option value="Ogun">Ogun</option>
            <option value="FCT Abuja">FCT Abuja</option>
            <option value="Rivers">Rivers</option>
          </select>
          <select
            value={selectedLandUse}
            onChange={e => setSelectedLandUse(e.target.value)}
            aria-label="Filter by Land Use"
            className="bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-xs text-[#252B28] focus:border-[#245C43] focus:outline-none"
          >
            <option value="All">All Land Uses</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
            <option value="Mixed Use">Mixed Use</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            aria-label="Sort listings"
            className="bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-xs text-[#252B28] focus:border-[#245C43] focus:outline-none font-mono"
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="size">Largest Size</option>
          </select>
        </div>
      </div>

      {/* GIS Map Overview */}
      <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-[#E5E8E5]">
          <Layers className="w-4 h-4 text-[#245C43]" />
          <span className="text-sm font-semibold text-[#252B28]">Live Cadastral GIS Map — Verified Marketplace Parcels</span>
          <span className="ml-auto text-xs text-[#4A524D] font-mono">Nigeria WGS-84 / PostGIS</span>
        </div>
        <LeafletMap
          parcels={filteredParcels.map(p => ({
            id: p.id,
            title: p.titleNumber,
            coords: p.coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
            color: '#245C43'
          }))}
          height="h-80"
          readOnly
        />
      </div>

      {/* Marketplace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParcels.map(parcel => {
          const priceInfo = LISTING_PRICES[parcel.id] ?? { eth: '0.50', naira: parcel.marketValuation || 150000000 };
          const isOwner = parcel.ownerId === currentUser.id;
          const coverImage = parcel.coverPhoto || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
          const askingNaira = parcel.askingPriceNaira || priceInfo.naira;

          return (
            <div key={parcel.id} className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs hover:border-[#245C43] transition-all overflow-hidden flex flex-col">
              {/* Image & Badges */}
              <div className="h-48 relative overflow-hidden bg-[#F7F8F7]">
                <img
                  src={coverImage}
                  alt={parcel.titleNumber}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {parcel.isDemo && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/90 text-white font-bold tracking-wider shadow-xs">
                      DEMO
                    </span>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#245C43] text-white font-bold tracking-wider shadow-xs">
                    FOR SALE
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 text-xs font-mono text-white font-medium flex items-center gap-1.5 drop-shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {parcel.district}, {parcel.lga}, {parcel.state}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#252B28] font-mono">{parcel.titleNumber}</div>
                      <div className="text-xs text-[#4A524D] mt-0.5 font-medium">{parcel.landUse} · {parcel.sizeSqm.toLocaleString()} m² ({parcel.sizeHectares} Ha)</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#245C43]/10 text-[#245C43]" title="Registry Verified C of O">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  {parcel.description && (
                    <p className="text-xs text-[#4A524D] line-clamp-2 leading-relaxed">{parcel.description}</p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-[#E5E8E5]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-[#4A524D]">Asking Price</div>
                      <div className="text-sm font-bold text-[#252B28] font-mono">₦{askingNaira.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-[#4A524D]">Crypto Equiv</div>
                      <div className="text-xs font-bold text-[#245C43] font-mono flex items-center gap-1 justify-end">
                        <TrendingUp className="w-3 h-3" />{priceInfo.eth} ETH
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openDetailsModal(parcel)}
                      className="py-2 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] text-xs font-semibold text-center hover:bg-[#F7F8F7] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#245C43]" />View Details
                    </button>
                    {!isOwner ? (
                      <button
                        onClick={() => openBuyModal(parcel)}
                        className="py-2 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />Buy Land
                      </button>
                    ) : (
                      <div className="py-2 rounded-lg bg-[#245C43]/10 border border-[#245C43]/30 text-[#245C43] text-xs font-semibold text-center flex items-center justify-center">
                        You Own This
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredParcels.length === 0 && (
        <div className="text-center py-16 bg-[#F7F8F7] rounded-xl border border-[#E5E8E5]">
          <p className="text-sm font-semibold text-[#252B28]">No land listings match your search criteria.</p>
          <p className="text-xs text-[#4A524D] mt-1">Try resetting your filters or search query.</p>
        </div>
      )}

      {/* Land Details Modal with Gallery & GIS Map */}
      {detailsModalOpen && selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-xl border border-[#E5E8E5] shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#E5E8E5] shrink-0">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#245C43]">Parcel Details & GIS Verification</div>
                <h2 className="text-lg font-bold text-[#252B28] font-mono">{selectedParcel.titleNumber}</h2>
              </div>
              <button onClick={() => setDetailsModalOpen(false)} className="p-1.5 rounded-lg bg-[#F7F8F7] text-[#4A524D] hover:text-[#252B28]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Photo Gallery */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#4A524D] uppercase tracking-wider">Property Photographs</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 h-64 rounded-xl overflow-hidden border border-[#E5E8E5]">
                    <img
                      src={selectedParcel.coverPhoto || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'}
                      alt="Cover"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-3 flex flex-col justify-between">
                    {selectedParcel.galleryPhotos?.map((photo, idx) => (
                      <div key={idx} className="h-[122px] rounded-xl overflow-hidden border border-[#E5E8E5]">
                        <img src={photo} alt={`Gallery ${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )) || (
                      <div className="h-full rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] flex items-center justify-center text-xs text-[#4A524D]">
                        No additional gallery photos
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                  <div className="text-[10px] text-[#4A524D] uppercase font-semibold">Location</div>
                  <div className="text-xs font-bold text-[#252B28] mt-0.5">{selectedParcel.district}, {selectedParcel.lga}, {selectedParcel.state}</div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                  <div className="text-[10px] text-[#4A524D] uppercase font-semibold">Land Area</div>
                  <div className="text-xs font-bold text-[#252B28] mt-0.5 font-mono">{selectedParcel.sizeSqm.toLocaleString()} m² ({selectedParcel.sizeHectares} Ha)</div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                  <div className="text-[10px] text-[#4A524D] uppercase font-semibold">Land Use</div>
                  <div className="text-xs font-bold text-[#252B28] mt-0.5">{selectedParcel.landUse}</div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                  <div className="text-[10px] text-[#4A524D] uppercase font-semibold">Asking Price</div>
                  <div className="text-xs font-bold text-[#245C43] mt-0.5 font-mono">₦{(selectedParcel.askingPriceNaira || 285000000).toLocaleString()}</div>
                </div>
              </div>

              {/* Description & Metadata */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#4A524D] uppercase tracking-wider">Description & Registry Metadata</h3>
                <p className="text-xs text-[#252B28] leading-relaxed bg-[#F7F8F7] p-4 rounded-xl border border-[#E5E8E5]">
                  {selectedParcel.description || 'Verified land title registered under the Nigerian Land Use Act. Backed by immutable on-chain proof and PostGIS cadastral boundary verification.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono pt-2">
                  <div className="flex justify-between p-2.5 rounded bg-white border border-[#E5E8E5]">
                    <span className="text-[#4A524D]">Survey Plan No:</span>
                    <span className="text-[#252B28] font-semibold">{selectedParcel.surveyPlanNumber}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-white border border-[#E5E8E5]">
                    <span className="text-[#4A524D]">Surveyor:</span>
                    <span className="text-[#252B28] font-semibold">{selectedParcel.surveyorName}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-white border border-[#E5E8E5]">
                    <span className="text-[#4A524D]">Owner:</span>
                    <span className="text-[#245C43] font-semibold">{selectedParcel.ownerName}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-white border border-[#E5E8E5]">
                    <span className="text-[#4A524D]">Token Hash:</span>
                    <span className="text-[#252B28] font-semibold truncate max-w-[160px]">{selectedParcel.tokenHash}</span>
                  </div>
                </div>
              </div>

              {/* GIS Map Boundary View */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#4A524D] uppercase tracking-wider">Cadastral GIS Boundary Polygon</h3>
                <LeafletMap
                  parcels={[{
                    id: selectedParcel.id,
                    title: selectedParcel.titleNumber,
                    coords: selectedParcel.coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
                    color: '#245C43'
                  }]}
                  height="h-64"
                  readOnly
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E5E8E5] bg-[#F7F8F7] shrink-0">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setDetailsModalOpen(false); openBuyModal(selectedParcel); }}
                className="px-5 py-2 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5" />Proceed to Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Modal */}
      {buyModalOpen && selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E8E5] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#E5E8E5]">
              <div>
                <h2 className="text-base font-bold text-[#252B28]">Purchase Land Title</h2>
                <p className="text-xs text-[#4A524D] font-mono">{selectedParcel.titleNumber}</p>
              </div>
              <button onClick={() => setBuyModalOpen(false)} className="p-1.5 rounded-lg bg-[#F7F8F7] text-[#4A524D] hover:text-[#252B28]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2 text-xs font-mono">
                <div className="flex justify-between"><span className="text-[#4A524D]">Location</span><span className="text-[#252B28] font-medium">{selectedParcel.district}, {selectedParcel.lga}</span></div>
                <div className="flex justify-between"><span className="text-[#4A524D]">Area</span><span className="text-[#252B28] font-medium">{selectedParcel.sizeSqm.toLocaleString()} m²</span></div>
                <div className="flex justify-between"><span className="text-[#4A524D]">Current Owner</span><span className="text-[#245C43] font-medium">{selectedParcel.ownerName}</span></div>
                <div className="flex justify-between"><span className="text-[#4A524D]">Asking Price</span><span className="text-[#252B28] font-medium">₦{(selectedParcel.askingPriceNaira || 285000000).toLocaleString()}</span></div>
              </div>
              <div>
                <label className="block text-xs text-[#4A524D] mb-1 font-semibold">Purchase Price (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  disabled={txState !== 'idle'}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2.5 text-[#252B28] font-mono text-sm focus:border-[#245C43] focus:outline-none"
                />
              </div>
              {!wallet.connected && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-700" />Connect your wallet to continue.
                  <button onClick={connect} className="ml-2 text-[#245C43] underline font-semibold">{connecting ? 'Connecting…' : 'Connect Now'}</button>
                </div>
              )}
              {wallet.connected && txState === 'idle' && (
                <div className="p-3 rounded-lg bg-[#245C43]/10 border border-[#245C43]/20 text-[#245C43] text-xs">
                  <Wallet className="w-3.5 h-3.5 inline mr-1" />
                  <span className="font-mono">{wallet.address?.slice(0,10)}…</span>
                  <span className="ml-2 text-[#4A524D]">({wallet.balance} ETH · {wallet.walletName})</span>
                </div>
              )}
              {txState === 'pending' && (
                <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-[#245C43] animate-spin mx-auto" />
                  <p className="text-sm text-[#245C43] font-semibold">Confirm in {wallet.walletName}…</p>
                  <p className="text-xs text-[#4A524D]">Your wallet popup is waiting for approval.</p>
                </div>
              )}
              {txState === 'success' && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#245C43] mx-auto" />
                  <p className="text-sm text-[#245C43] font-semibold">Payment Submitted!</p>
                  <p className="text-xs text-[#4A524D] font-mono truncate">{txHash}</p>
                  <p className="text-xs text-[#4A524D]">Registrar will review and execute title transfer on-chain.</p>
                </div>
              )}
              {txState === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-red-700" />{txError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setBuyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] text-xs font-semibold hover:bg-[#F7F8F7] transition-colors"
                >
                  {txState === 'success' ? 'Close' : 'Cancel'}
                </button>
                {txState === 'idle' && wallet.connected && (
                  <button
                    onClick={handleBuy}
                    className="flex-1 py-2.5 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" />Buy with {wallet.walletName}
                  </button>
                )}
              </div>
              <p className="text-xs text-[#4A524D] text-center">All transfers governed by Nigeria Land Use Act (1978). Payment initiates Registry review.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
