import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, ShieldCheck, MapPin, Mail, Phone, CreditCard } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const ProfileView: React.FC = () => {
  const { currentUser, currentRole } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to My Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <User className="w-6 h-6 text-[#245C43]" />
          My Profile
        </h1>
        <p className="text-sm text-[#4A524D] mt-1">
          Personal identity details, verification status, and linked wallet information in My ANAGU.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl border border-[#E5E8E5] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#E5E8E5]">
          <div className="w-20 h-20 rounded-full bg-[#F7F8F7] border-2 border-[#CBD0C8] overflow-hidden flex items-center justify-center shrink-0">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-2xl font-bold text-[#245C43]">{currentUser.name.charAt(0)}</span>
            )}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-[#252B28]">{currentUser.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-semibold border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>KYC VERIFIED</span>
              </span>
            </div>
            <div className="text-xs text-[#245C43] font-semibold capitalize">{currentRole} · {currentUser.organization || 'Federal Cadastre Network'}</div>
            <div className="text-xs text-[#4A524D] font-mono mt-1">
              National ID (NIN): <span className="text-[#252B28] font-bold">{currentUser.nationalId}</span>
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-1">
            <span className="text-[#4A524D] text-xs block font-medium">Email Address</span>
            <span className="text-[#252B28] font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#245C43]" />
              {currentUser.email}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-1">
            <span className="text-[#4A524D] text-xs block font-medium">Telephone</span>
            <span className="text-[#252B28] font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#245C43]" />
              {currentUser.phone || '+234 800 000 0000'}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-1">
            <span className="text-[#4A524D] text-xs block font-medium">Sovereign Wallet Address</span>
            <span className="text-[#245C43] font-mono font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#245C43]" />
              {currentUser.walletAddress}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-1">
            <span className="text-[#4A524D] text-xs block font-medium">Residential / Corporate Address</span>
            <span className="text-[#252B28] font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#245C43]" />
              {currentUser.address || 'Victoria Island Extension, Lagos State'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
