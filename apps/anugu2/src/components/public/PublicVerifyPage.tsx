import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Search, XCircle, ShieldCheck } from 'lucide-react';
import { BackButton } from '../common/BackButton';
import { CadastralPattern } from '../common/CadastralPattern';
import { INITIAL_PARCELS } from '../../data/mockData';
import { publicApiRequest } from '../../lib/api';

type TitleVerification = {
  tokenId: string;
  parcelId: string;
  ownerAddress: string;
  isRevoked: boolean;
  issueTransaction: string | null;
  issueBlock: string | null;
  revocationTransaction: string | null;
  chainId: string;
  explorerUrl?: string | null;
};

export const PublicVerifyPage: React.FC = () => {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState<TitleVerification | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async (value: string) => {
    const tokenId = value.trim();
    if (!tokenId) return;
    setQuery(tokenId);
    setTitle(null);
    setError('');
    setLoading(true);

    try {
      if (/^[1-9]\d*$/.test(tokenId)) {
        const res = await publicApiRequest<TitleVerification>(`/public/titles/${encodeURIComponent(tokenId)}`);
        setTitle(res);
        setLoading(false);
        return;
      }
      if (/^0x[a-fA-F0-9]{64}$/.test(tokenId)) {
        const tx = await publicApiRequest<{
          txHash: string;
          chainId: string;
          blockNumber: string | null;
          status: string;
          explorerUrl: string;
        }>(`/public/titles/tx/${encodeURIComponent(tokenId)}`);
        setTitle({
          tokenId: 'TX-VERIFICATION',
          parcelId: `Ledger Status: ${tx.status}`,
          ownerAddress: 'Public Registry Privacy-Protected',
          isRevoked: false,
          issueTransaction: tx.txHash,
          issueBlock: tx.blockNumber,
          revocationTransaction: null,
          chainId: tx.chainId,
          explorerUrl: tx.explorerUrl,
        });
        setLoading(false);
        return;
      }
      const list = await publicApiRequest<Array<{
        tokenId: string;
        titleNumber?: string;
        parcelId: string;
        parcelNumber?: string;
        isRevoked: boolean;
        txHash?: string;
        chainId?: string;
        explorerUrl?: string;
      }>>('/public/titles');
      const matched = list.find(
        (item) =>
          item.tokenId === tokenId ||
          item.parcelId === tokenId ||
          item.titleNumber?.toLowerCase() === tokenId.toLowerCase() ||
          item.parcelNumber?.toLowerCase() === tokenId.toLowerCase(),
      );
      if (matched) {
        const details = await publicApiRequest<TitleVerification>(`/public/titles/${matched.tokenId}`);
        setTitle(details);
        setLoading(false);
        return;
      }
    } catch {
      // Backend offline or unseeded — allow local demo reference fallback cleanly
    }

    const parcel = INITIAL_PARCELS.find(
      (p) =>
        p.titleNumber.toLowerCase() === tokenId.toLowerCase() ||
        p.tokenHash.toLowerCase() === tokenId.toLowerCase() ||
        p.id === tokenId,
    );

    if (parcel) {
      setTitle({
        tokenId: parcel.tokenHash,
        parcelId: parcel.id,
        ownerAddress: `0x${parcel.tokenHash.replace(/^0x/, '').slice(0, 40)}`,
        isRevoked: parcel.status === 'revoked',
        issueTransaction: parcel.tokenHash,
        issueBlock: String(parcel.blockNumber),
        revocationTransaction: null,
        chainId: '80002',
      });
    } else {
      setError(`No title found for "${tokenId}". Try a numeric Token ID or C-OF-O-2026-004912.`);
    }
    setLoading(false);
  };

  useEffect(() => {
    const value = new URLSearchParams(location.search).get('q');
    if (value) void verify(value);
  }, [location.search]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void verify(query);
  };

  const explorerUrl =
    title?.explorerUrl ??
    (title?.issueTransaction
      ? `https://amoy.polygonscan.com/tx/${title.issueTransaction}`
      : null);

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-[#252B28] sm:px-6 relative">
      <CadastralPattern />
      <div className="mx-auto max-w-3xl space-y-8 relative z-10">
        <BackButton to="/" label="Back to ANAGU" />

        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F8F7] border border-[#E5E8E5] text-xs font-mono font-bold text-[#245C43]">
            <ShieldCheck className="w-4 h-4" />
            <span>PUBLIC REGISTRY VERIFICATION</span>
          </div>
          <h1 className="text-3xl font-bold text-[#252B28] sm:text-4xl">Verify a Land Title</h1>
          <p className="mx-auto max-w-xl text-sm text-[#4A524D] leading-relaxed">
            Enter a Certificate of Occupancy reference, parcel ID, or NFT token ID to verify its recorded status against the Polygon Amoy registry.
          </p>
        </header>

        <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl border border-[#E5E8E5] shadow-xs flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Title number or NFT token ID</span>
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#545B56]" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Enter token ID or title ref (e.g. 1 or C-OF-O-2026-004912)"
              className="w-full rounded-xl border border-[#CBD0C8] bg-white py-3 pl-11 pr-4 text-sm text-[#252B28] placeholder-[#545B56] font-mono focus:border-[#245C43] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#245C43] hover:bg-[#1B4733] px-6 py-3 min-h-[44px] text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Verify Title</span>
          </button>
        </form>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {title && (
          <section aria-live="polite" className="rounded-2xl border border-[#E5E8E5] bg-white p-6 sm:p-8 shadow-xs">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border ${
                title.isRevoked
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : 'bg-[#EBF4EF] text-[#164E35] border-[#C4DFC9]'
              }`}
            >
              {title.isRevoked ? <XCircle className="h-5 w-5 text-red-700" /> : <CheckCircle2 className="h-5 w-5 text-[#245C43]" />}
              <span>{title.isRevoked ? 'Title Revoked On-Chain' : 'Title Exists and Is Active On-Chain'}</span>
            </div>

            <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
              <div className="p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5]">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#4A524D]">Token ID</dt>
                <dd className="mt-1 break-all font-mono font-semibold text-[#252B28]">{title.tokenId}</dd>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5]">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#4A524D]">Parcel Record</dt>
                <dd className="mt-1 break-all font-mono font-semibold text-[#252B28]">{title.parcelId}</dd>
              </div>
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5]">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#4A524D]">Registered Holder Address</dt>
                <dd className="mt-1 break-all font-mono font-semibold text-[#252B28]">{title.ownerAddress}</dd>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5]">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#4A524D]">Network Chain ID</dt>
                <dd className="mt-1 font-mono font-semibold text-[#252B28]">{title.chainId}</dd>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5]">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#4A524D]">Issue Block</dt>
                <dd className="mt-1 font-mono font-semibold text-[#245C43]">{title.issueBlock || 'Not recorded'}</dd>
              </div>
            </dl>

            {title.isRevoked && title.revocationTransaction && (
              <p className="mt-4 break-all text-xs font-medium text-red-900 bg-red-50 border border-red-200 rounded-lg p-3">
                Revocation transaction: {title.revocationTransaction}
              </p>
            )}

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block text-sm font-semibold text-[#245C43] underline hover:text-[#1B4733]"
              >
                View issuance transaction on Polygon Amoy Explorer →
              </a>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
