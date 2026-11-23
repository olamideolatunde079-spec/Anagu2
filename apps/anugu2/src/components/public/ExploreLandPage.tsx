import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../hooks/useWallet';
import { initiateLandPurchase } from '../../lib/web3';
import { LeafletMap } from '../gis/LeafletMap';
import {
  Search, MapPin, Layers, ShoppingCart,
  Wallet, CheckCircle2, AlertTriangle, X, Loader2, Eye
} from 'lucide-react';

const LISTING_PRICES: Record<string, string> = {
  'pcl-001': '1.25',
  'pcl-002': '0.85',
  'pcl-003': '2.10',
};

export const ExploreLandPage: React.FC = () => {
  const { parcels, addNotification, currentUser, isAuthenticated } = useApp();
  const { wallet, connecting, connect, hasWallet } = useWallet();
  const navigate = useNavigate();

  const [search,          setSearch]          = useState('');
  const [filterStatus,    setFilterStatus]    = useState<string>('all');
  const [selectedParcel,  setSelectedParcel]  = useState(parcels[0] ?? null);
  const [buyModalOpen,    setBuyModalOpen]    = useState(false);
  const [buyTarget,       setBuyTarget]       = useState<typeof parcels[0] | null>(null);
  const [txState,         setTxState]         = useState<'idle'|'pending'|'success'|'error'>('idle');
  const [txHash,          setTxHash]          = useState('');
  const [txError,         setTxError]         = useState('');
  const [priceInput,      setPriceInput]      = useState('');

  const listed = useMemo(() => {
    let list = parcels.filter(p => p.status === 'verified' || p.status === 'community_review');
    if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.titleNumber.toLowerCase().includes(q) ||
        p.lga.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [parcels, search, filterStatus]);

  const openBuy = async (parcel: typeof parcels[0]) => {
    if (!isAuthenticated) { navigate('/auth/login'); return; }
    setBuyTarget(parcel);
    setPriceInput(LISTING_PRICES[parcel.id] ?? '0.5');
    setTxState('idle'); setTxHash(''); setTxError('');
    setBuyModalOpen(true);
    if (!wallet.connected) await connect();
  };

  const handleBuy = async () => {
    if (!buyTarget || !wallet.connected || !wallet.address) return;
    setTxState('pending'); setTxError('');
    try {
      const result = await initiateLandPurchase({
        tokenId: buyTarget.id,
        sellerAddress: '0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73',
        priceEth: priceInput,
        parcelTitle: buyTarget.titleNumber,
      });
      if (result.success) {
        setTxHash(result.txHash); setTxState('success');
        addNotification({ title: 'Purchase Submitted', message: `Payment for ${buyTarget.titleNumber} sent. Awaiting Registrar approval.`, type: 'success' });
      } else { setTxState('error'); setTxError(result.error ?? 'Transaction failed'); }
    } catch (err: any) { setTxState('error'); setTxError(err.message ?? 'Transaction failed'); }
  };

  return (
    <div className="min-h-screen bg-white text-[#252B28]">
      {/* Header bar */}
      <div className="border-b border-[#E5E8E5] bg-[#F7F8F7] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#252B28]">Explore Land &amp; Property Listings</h1>
            <p className="text-sm text-[#4A524D] mt-1 font-normal">
              {listed.length} verified parcel records available for public search, cadastral inspection, and blockchain transfer.
            </p>
          </div>
          <div>
            {wallet.connected ? (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#CBD0C8] text-xs font-mono shadow-xs">
                <Wallet className="w-4 h-4 text-[#245C43]" />
                <span className="text-[#245C43] font-bold">{wallet.address?.slice(0,6)}…</span>
                <span className="text-[#4A524D] font-medium">({wallet.balance} ETH)</span>
              </div>
            ) : (
              <button onClick={connect} disabled={connecting}
                className="px-4 py-2.5 rounded-xl bg-[#245C43] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#1B4733] transition-colors shadow-xs">
                {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                {connecting ? 'Connecting…' : hasWallet ? 'Connect Wallet' : 'Connect Web3'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search & filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#545B56]" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title number, LGA, state, district or owner..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD0C8] text-sm text-[#252B28] placeholder-[#545B56] focus:outline-none focus:border-[#245C43] focus:ring-2 focus:ring-[#245C43]/15 shadow-xs"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#CBD0C8] text-sm text-[#252B28] font-medium focus:outline-none focus:border-[#245C43] shadow-xs">
            <option value="all">All Verification Statuses</option>
            <option value="verified">Verified Active</option>
            <option value="community_review">In Community Review</option>
          </select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left: Parcel Cards */}
          <div className="xl:col-span-5 space-y-3 max-h-[72vh] overflow-y-auto pr-1">
            {listed.length === 0 && (
              <div className="text-center text-[#4A524D] py-16 text-sm bg-[#F7F8F7] rounded-2xl border border-[#E5E8E5]">
                No land parcels match your search query.
              </div>
            )}
            {listed.map(parcel => {
              const price = LISTING_PRICES[parcel.id] ?? null;
              const isOwner = parcel.ownerId === currentUser?.id;
              const isSelected = selectedParcel?.id === parcel.id;
              return (
                <div key={parcel.id}
                  onClick={() => setSelectedParcel(parcel)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#245C43] bg-white ring-2 ring-[#245C43]/20 shadow-xs'
                      : 'border-[#E5E8E5] bg-white hover:border-[#CBD0C8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-bold text-[#252B28] font-mono">{parcel.titleNumber}</div>
                      <div className="flex items-center gap-1.5 text-xs text-[#4A524D] mt-0.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#245C43]" />
                        {parcel.district}, {parcel.lga}, {parcel.state}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#EBF4EF] text-[#164E35] border border-[#C4DFC9] uppercase">
                      {parcel.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#4A524D] mb-3 font-mono">
                    <span className="font-medium">{parcel.sizeSqm.toLocaleString()} m² · {parcel.landUse}</span>
                    <span className="font-bold text-[#252B28] text-sm">₦{(parcel.marketValuation / 1_000_000).toFixed(0)}M</span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#E5E8E5]">
                    <Link to={`/portal/lands/${parcel.id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 py-2 rounded-lg bg-[#F7F8F7] text-[#252B28] text-xs font-semibold text-center hover:bg-[#E5E8E5] flex items-center justify-center gap-1.5 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Link>
                    {!isOwner && price && (
                      <button onClick={e => { e.stopPropagation(); openBuy(parcel); }}
                        className="flex-1 py-2 rounded-lg bg-[#245C43] text-white text-xs font-bold hover:bg-[#1B4733] flex items-center justify-center gap-1.5 transition-colors shadow-xs">
                        <ShoppingCart className="w-3.5 h-3.5" /> Buy · {price} ETH
                      </button>
                    )}
                    {isOwner && (
                      <div className="flex-1 py-2 rounded-lg bg-[#EBF4EF] text-[#164E35] border border-[#C4DFC9] text-xs font-bold text-center">
                        Your Parcel
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: OSM Leaflet Map */}
          <div className="xl:col-span-7">
            <div className="sticky top-20 bg-white border border-[#E5E8E5] rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-mono text-[#4A524D] pb-2 border-b border-[#E5E8E5]">
                <span className="flex items-center gap-1.5 text-[#252B28] font-bold">
                  <Layers className="w-4 h-4 text-[#245C43]" />
                  {selectedParcel ? `${selectedParcel.titleNumber} — ${selectedParcel.district}, ${selectedParcel.lga}` : 'Select a parcel'}
                </span>
                <span className="font-medium">OpenStreetMap · WGS-84</span>
              </div>
              <LeafletMap
                center={selectedParcel?.coordinates[0]
                  ? { lat: selectedParcel.coordinates[0].lat, lng: selectedParcel.coordinates[0].lng }
                  : { lat: 6.4541, lng: 3.3947 }}
                parcels={listed.map(p => ({
                  id: p.id,
                  title: p.titleNumber,
                  coords: p.coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
                  color: p.id === selectedParcel?.id ? '#245C43' : '#545B56',
                }))}
                height="h-[56vh]"
                readOnly
              />
              {selectedParcel && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                  <div className="bg-[#F7F8F7] p-3 rounded-xl border border-[#E5E8E5]">
                    <span className="text-[#545B56] block text-xs font-bold">AREA</span>
                    <span className="font-bold text-[#252B28] text-sm">{selectedParcel.sizeSqm.toLocaleString()} m²</span>
                  </div>
                  <div className="bg-[#F7F8F7] p-3 rounded-xl border border-[#E5E8E5]">
                    <span className="text-[#545B56] block text-xs font-bold">VALUATION</span>
                    <span className="font-bold text-[#245C43] text-sm">₦{(selectedParcel.marketValuation / 1_000_000).toFixed(0)}M</span>
                  </div>
                  <div className="bg-[#F7F8F7] p-3 rounded-xl border border-[#E5E8E5]">
                    <span className="text-[#545B56] block text-xs font-bold">LAND USE</span>
                    <span className="font-bold text-[#252B28] text-sm">{selectedParcel.landUse}</span>
                  </div>
                  <div className="bg-[#F7F8F7] p-3 rounded-xl border border-[#E5E8E5]">
                    <span className="text-[#545B56] block text-xs font-bold">STATE</span>
                    <span className="font-bold text-[#252B28] text-sm">{selectedParcel.state}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      {buyModalOpen && buyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E8E5] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
              <div>
                <h3 className="text-base font-bold text-[#252B28]">Initiate Land Acquisition</h3>
                <p className="text-xs text-[#4A524D] font-mono">{buyTarget.titleNumber}</p>
              </div>
              <button onClick={() => setBuyModalOpen(false)} className="p-1.5 rounded-lg bg-[#F7F8F7] text-[#252B28] hover:bg-[#E5E8E5]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-1.5 font-mono">
                <div className="flex justify-between"><span className="text-[#4A524D] font-medium">District</span><span className="text-[#252B28] font-bold">{buyTarget.district}, {buyTarget.lga}</span></div>
                <div className="flex justify-between"><span className="text-[#4A524D] font-medium">Registered Owner</span><span className="text-[#245C43] font-bold">{buyTarget.ownerName}</span></div>
                <div className="flex justify-between"><span className="text-[#4A524D] font-medium">Token ID</span><span className="text-[#252B28] font-bold">#{buyTarget.id}</span></div>
              </div>

              <div>
                <label className="block text-xs text-[#252B28] font-bold mb-1">Acquisition Price (ETH)</label>
                <input type="number" step="0.001" value={priceInput} onChange={e => setPriceInput(e.target.value)} disabled={txState !== 'idle'}
                  className="w-full bg-white border border-[#CBD0C8] rounded-xl px-3 py-2 text-[#252B28] font-mono text-sm focus:border-[#245C43] focus:outline-none" />
              </div>

              {txState === 'pending' && (
                <div className="p-4 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-[#245C43] animate-spin mx-auto" />
                  <p className="text-xs text-[#245C43] font-bold">Awaiting Web3 wallet confirmation…</p>
                </div>
              )}
              {txState === 'success' && (
                <div className="p-4 text-center space-y-2 bg-[#EBF4EF] border border-[#C4DFC9] rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-[#164E35] mx-auto" />
                  <p className="text-xs font-bold text-[#164E35]">Acquisition Transaction Submitted</p>
                  <p className="text-xs font-mono text-[#4A524D] truncate">{txHash}</p>
                </div>
              )}
              {txState === 'error' && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-700" /> {txError}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setBuyModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#F7F8F7] text-[#252B28] text-xs font-bold hover:bg-[#E5E8E5]">
                {txState === 'success' ? 'Close' : 'Cancel'}
              </button>
              {txState === 'idle' && (
                <button onClick={handleBuy} className="flex-1 py-2.5 rounded-xl bg-[#245C43] text-white text-xs font-bold hover:bg-[#1B4733] flex items-center justify-center gap-1.5 shadow-xs">
                  <ShoppingCart className="w-3.5 h-3.5" /> Submit Purchase
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
