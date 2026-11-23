import React from 'react';
import { MapPinOff } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const NotFoundView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8F7] text-[#252B28] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E8E5] p-8 shadow-sm text-center space-y-4">
        <MapPinOff className="w-12 h-12 text-[#245C43] mx-auto" />
        <h1 className="text-3xl font-extrabold text-[#252B28] font-mono">404</h1>
        <h2 className="text-lg font-bold text-[#252B28]">Cadastral Boundary Not Found</h2>
        <p className="text-xs text-[#4A524D]">
          The requested route or deed memorial is not registered on the ANAGU ledger grid.
        </p>

        <div className="pt-2">
          <BackButton to="/" label="Return to Cadastre Overview" className="py-2.5 px-4 text-xs font-bold bg-[#245C43] text-white hover:bg-[#1B4733]" />
        </div>
      </div>
    </div>
  );
};
