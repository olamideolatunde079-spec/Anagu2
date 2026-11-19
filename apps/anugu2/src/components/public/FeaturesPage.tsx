import React from 'react';
import { Layers, Award, Users, Compass, ShieldCheck, Zap, Wifi } from 'lucide-react';
import { BackButton } from '../common/BackButton';
import { CadastralPattern } from '../common/CadastralPattern';

export const FeaturesPage: React.FC = () => {
  const features = [
    {
      icon: Layers,
      title: 'Topological Boundary Collision Engine',
      desc: 'Automatic polygon intersection matrix ensures that newly surveyed parcels cannot overlap with pre-existing registered titles, waterways, or utility right-of-ways.',
    },
    {
      icon: Award,
      title: 'Sovereign NFT Title Deeds (ERC-721)',
      desc: 'Digital Certificate of Occupancy minted as non-fungible tokens. Each deed carries surveyed beacon coordinates, state seal, and legal memorials.',
    },
    {
      icon: Users,
      title: 'Decentralized Community Attestation',
      desc: 'Abutting cardinal neighbors receive automated notice and sign off on boundary lines, preventing silent encroachment and multi-year court boundary disputes.',
    },
    {
      icon: Compass,
      title: 'Precision WGS-84 Coordinate Logging',
      desc: 'Differential GPS and RTK field beacon telemetry are cryptographically signed by certified surveyors and logged to the consensus ledger.',
    },
    {
      icon: Wifi,
      title: 'MQTT Offline Edge Synchronization',
      desc: 'Field geomatics tools work seamlessly in remote areas without internet coverage, caching signed beacons in local storage and syncing reliably upon reconnection.',
    },
    {
      icon: ShieldCheck,
      title: 'Gubernatorial Consent Smart Contracts',
      desc: 'State statutory assent is required for all ownership transfers, preventing illegal black-market deeds while speeding up legitimate conveyances from years to days.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#252B28] py-10 px-4 sm:px-6 relative">
      <CadastralPattern />
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <BackButton to="/" label="Back to Overview" />
        </div>

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F8F7] border border-[#E5E8E5] text-xs font-mono font-bold text-[#245C43]">
            <Zap className="w-3.5 h-3.5 text-[#245C43]" />
            <span>STATE-OF-THE-ART CADASTRAL ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#252B28]">Platform Capabilities &amp; Features</h1>
          <p className="text-sm sm:text-base text-[#4A524D] max-w-2xl mx-auto leading-relaxed">
            Engineered from first principles to meet the real-world operational challenges of modern land administration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white border border-[#E5E8E5] shadow-xs space-y-3 hover:border-[#245C43]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#EBF4EF] border border-[#C4DFC9] flex items-center justify-center text-[#245C43]">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[#252B28]">{f.title}</h2>
                <p className="text-sm text-[#4A524D] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
