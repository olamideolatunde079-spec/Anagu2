import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { Shield, ChevronDown, Check, UserCheck, Compass, FileCheck, Landmark, Crown, Terminal } from 'lucide-react';

const ROLES_INFO: { role: UserRole; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  {
    role: 'citizen',
    label: 'Citizen / Landowner',
    icon: UserCheck,
    desc: 'Register land parcels, track applications, view digital NFT deeds & certificates',
  },
  {
    role: 'surveyor',
    label: 'Licensed Surveyor',
    icon: Compass,
    desc: 'Take boundary beacon coordinates, run GIS validation, lodge cadastral plans',
  },
  {
    role: 'registrar',
    label: 'Deeds Registrar',
    icon: FileCheck,
    desc: 'Review title applications, verify attestations, execute cryptographic signoffs',
  },
  {
    role: 'admin',
    label: 'Land Administrator',
    icon: Landmark,
    desc: 'Supervise state cadastre, dispute records, zoning overlays & custody trail',
  },
  {
    role: 'governor',
    label: 'Executive Governor',
    icon: Crown,
    desc: 'Statutory land revocations under Land Use Act, public interest orders',
  },
  {
    role: 'sysadmin',
    label: 'System Administrator',
    icon: Terminal,
    desc: 'Manage roles, permission matrices, consensus nodes, immutable audit trail',
  },
];

export const RoleSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { currentRole, setCurrentRole, addNotification } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const activeRole = ROLES_INFO.find(r => r.role === currentRole) || ROLES_INFO[0];
  const Icon = activeRole.icon;

  const handleSelectRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    setIsOpen(false);
    const sel = ROLES_INFO.find(r => r.role === newRole);
    addNotification({
      title: `Switched Persona: ${sel?.label}`,
      message: `Active view and role-based permissions updated for ${sel?.label}.`,
      type: 'info',
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl border border-[#CBD0C8] bg-white text-[#252B28] hover:border-[#245C43] transition-colors ${
          compact ? 'px-2.5 py-1.5 text-xs min-h-[38px]' : 'px-3 py-1.5 text-xs font-medium min-h-[40px]'
        }`}
        title="Switch simulated user persona"
      >
        <span className="p-1 rounded bg-[#245C43]/10 text-[#245C43] shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <div className="text-left min-w-0">
          <div className="text-xs text-[#545B56] font-normal leading-none mb-0.5">Role</div>
          <div className="font-semibold text-[#252B28] flex items-center gap-1">
            <span className="truncate max-w-[90px] sm:max-w-none">{activeRole.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#4A524D] shrink-0" />
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#CBD0C8] rounded-2xl shadow-lg p-2.5 z-50">
            <div className="px-3 py-2 border-b border-[#E5E8E5] mb-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#252B28] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#245C43]" />
                  Simulate Role-Based Access
                </span>
                <span className="text-xs text-[#245C43] font-mono font-semibold">Demo Persona</span>
              </div>
              <p className="text-xs text-[#4A524D] mt-1 leading-relaxed">
                Select a user role to experience tailored workflows, dashboards, and access boundaries.
              </p>
            </div>

            <div className="space-y-1">
              {ROLES_INFO.map(item => {
                const ItemIcon = item.icon;
                const isSelected = item.role === currentRole;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleSelectRole(item.role)}
                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-[#EBF4EF] border border-[#C4DFC9] text-[#164E35] font-semibold'
                        : 'hover:bg-[#F7F8F7] text-[#252B28]'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                        isSelected ? 'bg-[#245C43] text-white' : 'bg-[#F7F8F7] text-[#4A524D] border border-[#E5E8E5]'
                      }`}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#252B28]">{item.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#245C43]" />}
                      </div>
                      <p className="text-xs text-[#4A524D] leading-snug mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
