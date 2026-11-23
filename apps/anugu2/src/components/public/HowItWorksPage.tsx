import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { CadastralPattern } from '../common/CadastralPattern';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Digital Application & National Identity Verification',
      desc: 'The citizen or corporate entity submits parcel particulars, purchase receipts, and National Identification Number (NIN). The identity is cryptographically pre-cleared against sovereign identity databases.',
    },
    {
      num: '02',
      title: 'Geodetic Survey & Beacon Establishment',
      desc: 'A licensed cadastral surveyor visits the parcel with differential GPS equipment, establishes concrete boundary beacons, and computes boundary closure. The plan is verified against topological collision layers.',
    },
    {
      num: '03',
      title: 'Neighbor Attestation & Notice Window',
      desc: 'The platform initiates a 21-day public notice window. All 4 adjoining boundary neighbors attest to physical boundaries, ensuring absence of land grabbing.',
    },
    {
      num: '04',
      title: 'Deeds Registry Examination & Fiscal Clearance',
      desc: 'The Deeds Registrar vets root of title, family allocations, zoning clearance, and stamp duty receipts.',
    },
    {
      num: '05',
      title: 'Executive Assent & NFT Deed Minting',
      desc: 'The State Governor executes statutory assent under the Land Use Act. The digital Certificate of Occupancy (C of O) is permanently minted onto the ledger with QR code verification.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#252B28] py-10 px-4 sm:px-6 relative">
      <CadastralPattern />
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <BackButton to="/" label="Back to Overview" />
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#252B28]">How ANAGU Operates</h1>
          <p className="text-sm sm:text-base text-[#4A524D] max-w-xl mx-auto leading-relaxed">
            A step-by-step walkthrough of the transition from physical land acquisition to an immutable blockchain title deed.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map(s => (
            <div
              key={s.num}
              className="p-6 rounded-2xl bg-white border border-[#E5E8E5] shadow-xs flex flex-col sm:flex-row items-start gap-5"
            >
              <span className="text-3xl font-bold font-mono text-[#245C43] shrink-0">{s.num}</span>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#252B28]">{s.title}</h2>
                <p className="text-sm text-[#4A524D] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link
            to="/portal/register-land"
            className="px-6 py-3 min-h-[44px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white font-semibold text-sm shadow-xs inline-flex items-center gap-2 transition-colors"
          >
            <span>Start Land Registration</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
