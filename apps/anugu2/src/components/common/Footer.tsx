import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F7F8F7] text-[#4A524D] text-sm border-t border-[#E5E8E5] py-12 px-4 sm:px-6 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#245C43] flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-[#252B28] font-sans">
              ANAGU<span className="text-[#245C43]">!</span>
            </span>
          </div>
          <p className="text-[#4A524D] text-xs leading-relaxed">
            Sovereign blockchain-powered land administration and geodetic title verification platform.
          </p>
          <div className="text-xs text-[#245C43] font-mono font-semibold">
            SECURE · TRANSPARENT · TRUSTED
          </div>
        </div>

        <div>
          <div className="font-bold text-[#252B28] mb-3 text-xs uppercase tracking-wider font-mono">
            Public Registry
          </div>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/verify" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">Public Title Verification</Link></li>
            <li><Link to="/explore" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">Explore Recorded Land</Link></li>
            <li><Link to="/how-it-works" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">How It Works</Link></li>
            <li><Link to="/features" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">Platform Features</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold text-[#252B28] mb-3 text-xs uppercase tracking-wider font-mono">
            Workspaces
          </div>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/portal/dashboard" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">My ANAGU</Link></li>
            <li><Link to="/portal/surveyor" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">Surveyor Console</Link></li>
            <li><Link to="/portal/registrar" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">Registrar Queue</Link></li>
            <li><Link to="/portal/governor" className="text-[#4A524D] hover:text-[#245C43] font-medium transition-colors">Governor Portal</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold text-[#252B28] mb-3 text-xs uppercase tracking-wider font-mono">
            Compliance
          </div>
          <p className="text-xs text-[#4A524D] leading-relaxed mb-3">
            Compliant with Section 28 of the Land Use Act (1978) and Open Geospatial Consortium (OGC) cadastral standards.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[#164E35] bg-[#EBF4EF] border border-[#C4DFC9] px-2.5 py-1 rounded-md font-mono text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Cryptographic State Cadastre</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-[#E5E8E5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4A524D] font-medium">
        <div>© 2026 ANAGU Land Administration Protocol. All statutory rights reserved.</div>
        <div className="flex items-center gap-6">
          <Link to="/about" className="hover:text-[#245C43] transition-colors">About</Link>
          <Link to="/features" className="hover:text-[#245C43] transition-colors">Features</Link>
          <Link to="/contact" className="hover:text-[#245C43] transition-colors">Contact</Link>
          <Link to="/portal/help" className="hover:text-[#245C43] transition-colors">FAQ</Link>
        </div>
      </div>
    </footer>
  );
};
