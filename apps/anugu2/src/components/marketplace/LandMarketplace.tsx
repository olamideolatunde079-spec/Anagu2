import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../hooks/useWallet';
import { initiateLandPurchase } from '../../lib/web3';
import {
  ShoppingCart, Wallet, CheckCircle2, AlertTriangle, MapPin,
  Layers, TrendingUp, Zap, X, Loader2, Award
} from 'lucide-react';
import { LeafletMap } from '../gis/LeafletMap';

const LISTING_PRICES: Record<string, string> = {
  'pcl-001': '1.25',
  'pcl-002': '0.85',
  'pcl-003': '2.10',
};

export const LandMarketplace: React.FC = () => {
  const { parcels, addNotification, currentUser } = useApp();
  const { wallet, connecting, error: walletError, connect, hasWallet } = useWallet();
  const [selectedParcel, setSelectedParcel] = useState<typeof parcels[0] | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [txState, setTxState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [priceInput, setPriceInput] = useState('');

  const listedParcels = parcels.filter(p => p.status === 'verified');

  const openBuyModal = async (parcel: typeof parcels[0]) => {
    setSelectedParcel(parcel);
    setPriceInput(LISTING_PRICES[parcel.id] ?? '0.5');
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
      <div className="bg-white rounded-xl p-6 border border-[#E5E8E5] shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#245C43] mb-1">
              ANAGU Land Marketplace · Registry-Governed Web3 Transfers
            </div>
            <h1 className="text-2xl font-bold text-[#252B28]">Land Title Marketplace</h1>
            <p className="text-sm text-[#4A524D] mt-1">
              Browse verified parcels. Click Buy Land to trigger your Web3 wallet (MetaMask, Trust Wallet, etc.)
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

      <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-[#E5E8E5]">
          <Layers className="w-4 h-4 text-[#245C43]" />
          <span className="text-sm font-semibold text-[#252B28]">Listed Parcels — OpenStreetMap</span>
          <span className="ml-auto text-xs text-[#4A524D] font-mono">Nigeria WGS-84</span>
        </div>
        <LeafletMap
          parcels={listedParcels.map(p => ({ id: p.id, title: p.titleNumber, coords: p.coordinates.map(c => ({ lat: c.lat, lng: c.lng })), color: '#245C43' }))}
          height="h-72"
          readOnly
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {listedParcels.map(parcel => {
          const price = LISTING_PRICES[parcel.id] ?? '0.50';
          const isOwner = parcel.ownerId === currentUser.id;
          return (
            <div key={parcel.id} className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs hover:border-[#245C43] transition-all overflow-hidden">
              <div className="h-28 bg-[#F7F8F7] relative flex items-center justify-center border-b border-[#E5E8E5]">
                <svg viewBox="0 0 200 100" className="w-full h-full p-4">
                  <polygon
                    points={parcel.coordinates.map((c,i) => `${40+(i%4)*40},${20+i*18}`).join(' ')}
                    fill="rgba(36,92,67,0.12)"
                    stroke="#245C43"
                    strokeWidth="1.5"
                  />
                </svg>
                <div className="absolute top-2 right-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43] border border-[#245C43]/20 font-semibold">
                    FOR SALE
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 text-xs font-mono text-[#4A524D] font-medium">{parcel.sizeSqm.toLocaleString()} m²</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#252B28] font-mono">{parcel.titleNumber}</div>
                    <div className="text-xs text-[#4A524D] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#245C43]" />{parcel.district}, {parcel.lga}
                    </div>
                  </div>
                  <Award className="w-4 h-4 text-[#245C43] shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5]">
                  <div className="text-xs text-[#4A524D]">Listing Price</div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#245C43]" />
                    <span className="text-sm font-bold text-[#252B28] font-mono">{price} ETH</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/portal/lands/${parcel.id}`} className="flex-1 py-2 rounded-lg bg-white border border-[#CBD0C8] text-[#252B28] text-xs font-semibold text-center hover:bg-[#F7F8F7] transition-colors">
                    View Details
                  </Link>
                  {!isOwner ? (
                    <button
                      onClick={() => openBuyModal(parcel)}
                      className="flex-1 py-2 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />Buy Land
                    </button>
                  ) : (
                    <div className="flex-1 py-2 rounded-lg bg-[#245C43]/10 border border-[#245C43]/30 text-[#245C43] text-xs font-semibold text-center">
                      You Own This
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
                <div className="flex justify-between"><span className="text-[#4A524D]">Token Hash</span><span className="text-[#252B28] truncate max-w-[140px]">{selectedParcel.tokenHash}</span></div>
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
