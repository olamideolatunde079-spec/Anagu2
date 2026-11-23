import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CadastralPattern } from '../common/CadastralPattern';
import {
  Search,
  Layers,
  Award,
  Users,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/verify?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-white text-[#252B28] font-sans selection:bg-[#245C43] selection:text-white relative">
      <CadastralPattern />

      {/* Top Notice / Announcement Bar */}
      <div className="relative z-10 bg-[#F7F8F7] border-b border-[#E5E8E5] px-4 py-2.5 text-center text-xs text-[#4A524D] font-medium flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#245C43]" />
        <span>Official Nigeria National Land Registry &amp; Blockchain Verification Protocol</span>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24 px-4 sm:px-6 overflow-hidden border-b border-[#E5E8E5]">
        <div className="max-w-6xl mx-auto relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F8F7] border border-[#E5E8E5] text-xs font-mono font-bold text-[#245C43]">
              <ShieldCheck className="w-4 h-4 text-[#245C43]" />
              <span>SECURE · TRANSPARENT · VERIFIABLE</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#252B28] leading-[1.15]">
              Digital Land Ownership &amp; Verification in Nigeria.
            </h1>

            <p className="text-base sm:text-lg text-[#4A524D] max-w-xl font-normal leading-relaxed">
              ANAGU combines spatial GIS surveys, institutional verification, and secure Polygon blockchain titles into a trusted national land registry platform.
            </p>

            {/* Instant Title Search Form */}
            <form onSubmit={handleSearch} className="max-w-lg">
              <div className="flex items-center bg-white border border-[#CBD0C8] rounded-xl p-1.5 focus-within:border-[#245C43] focus-within:ring-2 focus-within:ring-[#245C43]/20 transition-all shadow-xs">
                <Search className="w-5 h-5 text-[#545B56] ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Enter NFT Token ID or Parcel Ref (e.g. 42)"
                  className="w-full bg-white border-0 px-3 py-2.5 text-sm text-[#252B28] placeholder-[#545B56] focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[40px] rounded-lg bg-[#245C43] text-white text-sm font-bold hover:bg-[#1B4733] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={isAuthenticated ? "/portal/register-land" : "/auth/register"}
                className="px-6 py-3 min-h-[44px] rounded-xl bg-[#245C43] text-white text-sm font-semibold hover:bg-[#1B4733] transition-colors inline-flex items-center gap-2 shadow-xs"
              >
                <span>Register Land Parcel</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/explore"
                className="px-6 py-3 min-h-[44px] rounded-xl bg-white text-[#252B28] border border-[#CBD0C8] text-sm font-semibold hover:bg-[#F7F8F7] transition-colors inline-flex items-center"
              >
                Explore Public Map
              </Link>
            </div>
          </div>

          {/* Land-Inspired Certificate Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border-2 border-[#E5E8E5] rounded-2xl p-6 shadow-xs space-y-5 relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
                <div className="text-xs text-[#245C43] font-mono font-bold tracking-wider">OFFICIAL TITLE RECORD</div>
                <div className="text-xs font-mono font-bold uppercase text-[#252B28] border border-[#CBD0C8] px-2.5 py-0.5 rounded bg-[#F7F8F7]">
                  ERC-721 NFT
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-[#4A524D] font-mono uppercase tracking-wider font-semibold">DIGITAL CERTIFICATE OF OCCUPANCY</div>
                <div className="text-2xl font-bold text-[#252B28] font-mono">TOKEN #42 · LAGOS</div>
              </div>

              <div className="space-y-3 pt-2 text-sm border-t border-[#E5E8E5]">
                <div className="flex justify-between py-1">
                  <span className="text-[#4A524D] font-medium">Registered Owner:</span>
                  <span className="font-bold text-[#252B28]">Adewale Okonkwo</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#4A524D] font-medium">Cadastral Coordinates:</span>
                  <span className="font-mono text-[#245C43] font-bold">6.4541° N, 3.3947° E</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#4A524D] font-medium">Area &amp; Zoning:</span>
                  <span className="font-bold text-[#252B28]">1,250 m² · Commercial</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#4A524D] font-medium">Verification Status:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF4EF] text-[#164E35] border border-[#C4DFC9] text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Active
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E8E5] flex items-center justify-between text-xs font-mono text-[#4A524D]">
                <span>Polygon PoS Anchored</span>
                <Link to="/verify" className="text-[#245C43] hover:underline font-bold">Verify Authenticity →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Registry Pillars */}
      <section className="py-20 px-4 sm:px-6 bg-[#F7F8F7] border-b border-[#E5E8E5] relative z-10">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold text-[#252B28]">Platform Capabilities</h2>
            <p className="text-base text-[#4A524D] leading-relaxed">
              A transparent, sovereign land administration infrastructure connecting citizens, licensed surveyors, registrars, and government executives.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-2xl border border-[#E5E8E5] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#245C43]/10 flex items-center justify-center text-[#245C43]">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#252B28]">GIS Spatial Verification</h3>
              <p className="text-sm text-[#4A524D] leading-relaxed">
                OpenStreetMap and PostGIS geometry checks prevent double-allocation and ensure precise boundary definition without overlapping claims.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-[#E5E8E5] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#245C43]/10 flex items-center justify-center text-[#245C43]">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#252B28]">Community &amp; Institutional Review</h3>
              <p className="text-sm text-[#4A524D] leading-relaxed">
                Multi-stage review workflows involving certified surveyors, legal clearance officers, and authorized deeds registrars.
              </p>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-[#E5E8E5] space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#245C43]/10 flex items-center justify-center text-[#245C43]">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#252B28]">Immutable Blockchain Titles</h3>
              <p className="text-sm text-[#4A524D] leading-relaxed">
                Approved land titles are minted as ERC-721 tokens on Polygon PoS, ensuring permanent ownership proof and statutory revocation tracking.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
