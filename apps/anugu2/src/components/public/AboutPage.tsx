import React from 'react';
import { ShieldCheck, Scale, Landmark, Globe } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8F7] text-[#252B28] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <BackButton to="/" label="Back to Overview" />
        </div>

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#245C43]/10 border border-[#245C43]/20 text-xs font-mono text-[#245C43] font-semibold">
            <Landmark className="w-3.5 h-3.5" />
            <span>Institutional Governance & Mission</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#252B28]">
            About the ANAGU Cadastre Protocol
          </h1>
          <p className="text-sm text-[#4A524D] max-w-2xl mx-auto leading-relaxed">
            ANAGU was architected to eliminate fraudulent conveyances, overlapping titles, and administrative delays across sovereign land registries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-3">
            <ShieldCheck className="w-8 h-8 text-[#245C43]" />
            <h2 className="text-base font-bold text-[#252B28]">The Core Mission</h2>
            <p className="text-xs text-[#4A524D] leading-relaxed">
              Guaranteeing indisputable property rights for every citizen, commercial enterprise, and government through mathematical consensus and geodetic truth.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-3">
            <Scale className="w-8 h-8 text-amber-700" />
            <h2 className="text-base font-bold text-[#252B28]">Constitutional Harmony</h2>
            <p className="text-xs text-[#4A524D] leading-relaxed">
              Fully compliant with the Land Use Act of 1978. Smart contracts protect statutory gubernatorial oversight while removing manual bottlenecks.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-3">
            <Globe className="w-8 h-8 text-[#245C43]" />
            <h2 className="text-base font-bold text-[#252B28]">Universal Cadastre Grid</h2>
            <p className="text-xs text-[#4A524D] leading-relaxed">
              Built on standard WGS-84 coordinate systems and open geospatial standards, allowing interoperability with national mapping agencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
