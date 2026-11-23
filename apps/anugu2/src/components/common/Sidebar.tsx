import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  MapPin,
  FilePlus,
  Files,
  Clock,
  Receipt,
  Layers,
  Cpu,
  Award,
  Users,
  Compass,
  FileCheck,
  Landmark,
  Crown,
  Terminal,
  Activity,
  BarChart3,
  User,
  Settings,
  HelpCircle,
  ShieldAlert,
  ChevronRight,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentRole, currentUser } = useApp();

  const getRoleNavItems = () => {
    switch (currentRole) {
      case 'surveyor':
        return [
          { to: '/portal/surveyor', label: 'Surveyor Dashboard', icon: LayoutDashboard },
          { to: '/portal/surveyor/jobs', label: 'Field Survey Jobs', icon: Compass },
          { to: '/portal/gis', label: 'GIS Beacon Plotter', icon: Layers },
          { to: '/portal/surveyor/submit', label: 'Lodge Cadastral Plan', icon: FileCheck }
        ];
      case 'registrar':
        return [
          { to: '/portal/registrar', label: 'Registrar Dashboard', icon: LayoutDashboard },
          { to: '/portal/registrar/queue', label: 'Application Queue', icon: Clock },
          { to: '/portal/registrar/review', label: 'Deed Examination', icon: FileCheck },
          { to: '/portal/nft-issuance', label: 'NFT Issuance Vault', icon: Award }
        ];
      case 'admin':
        return [
          { to: '/portal/admin', label: 'Administrator Portal', icon: LayoutDashboard },
          { to: '/portal/admin/records', label: 'Master Title Registry', icon: Landmark },
          { to: '/portal/admin/history', label: 'Chain of Custody', icon: Clock },
          { to: '/portal/admin/disputes', label: 'Boundary Conflict Log', icon: ShieldAlert }
        ];
      case 'governor':
        return [
          { to: '/portal/governor', label: 'Governor Dashboard', icon: LayoutDashboard },
          { to: '/portal/governor/revocations', label: 'Statutory Revocations', icon: Crown },
          { to: '/portal/governor/confirm', label: 'Executive Signoff', icon: FileCheck },
          { to: '/portal/governor/gazette', label: 'Gazette Notice Memorial', icon: Files }
        ];
      case 'sysadmin':
        return [
          { to: '/portal/sysadmin', label: 'SysAdmin Control', icon: LayoutDashboard },
          { to: '/portal/sysadmin/users', label: 'User Directory & KYC', icon: Users },
          { to: '/portal/sysadmin/permissions', label: 'Role Permissions', icon: Terminal },
          { to: '/portal/sysadmin/audit', label: 'Tamper-Evident Audit', icon: Receipt },
          { to: '/portal/sysadmin/consensus', label: 'Consensus Nodes', icon: Cpu }
        ];
      case 'citizen':
      default:
        return [
          { to: '/portal/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
          { to: '/portal/my-lands', label: 'My Lands', icon: MapPin },
          { to: '/portal/register-land', label: 'Register Land Parcel', icon: FilePlus },
          { to: '/portal/documents', label: 'My Documents', icon: Files },
          { to: '/portal/applications', label: 'My Applications', icon: Clock },
          { to: '/portal/transactions', label: 'My Transactions', icon: Receipt }
        ];
    }
  };

  const sharedNavItems = [
    { to: '/portal/gis', label: 'GIS & Spatial Engine', icon: Layers },
    { to: '/portal/explorer', label: 'Blockchain Explorer', icon: Cpu },
    { to: '/portal/nft-registry', label: 'NFT Title Deeds', icon: Award },
    { to: '/portal/community', label: 'Community Attestation', icon: Users },
    { to: '/portal/analytics', label: 'Cadastral Analytics', icon: BarChart3 },
    { to: '/portal/monitoring', label: 'System Health & MQTT', icon: Activity }
  ];

  const utilityNavItems = [
    { to: '/portal/profile', label: 'My Profile', icon: User },
    { to: '/portal/settings', label: 'Account Security', icon: Settings },
    { to: '/portal/help', label: 'Cadastral Guide & FAQ', icon: HelpCircle }
  ];

  const roleItems = getRoleNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] bg-white border-r border-[#E5E8E5] text-[#252B28] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'
        } flex flex-col justify-between overflow-y-auto`}
      >
        <div className="p-4 space-y-6">
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-[#E5E8E5]">
            <span className="text-xs font-bold tracking-wider text-[#252B28] font-mono uppercase">
              Navigation Menu
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#F7F8F7] text-[#252B28] hover:bg-[#E5E8E5]"
              aria-label="Close navigation drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Persona Box */}
          <div className="p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase font-mono tracking-wider text-[#245C43] font-bold">
                Active Role
              </span>
              <span className="w-2 h-2 rounded-full bg-[#245C43]" />
            </div>
            <div className="text-sm font-bold text-[#252B28] truncate">{currentUser.name}</div>
            <div className="text-xs text-[#545B56] truncate capitalize font-mono mt-0.5">
              {currentRole} · {currentUser.walletAddress?.slice(0, 8)}…
            </div>
          </div>

          {/* Role Navigation */}
          <div>
            <div className="px-2 mb-2 text-xs font-mono uppercase tracking-wider text-[#545B56] font-bold">
              {currentRole === 'citizen' ? 'My ANAGU' : `${currentRole} Workspace`}
            </div>
            <nav className="space-y-1">
              {roleItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#245C43] text-white font-semibold shadow-xs'
                          : 'text-[#252B28] hover:bg-[#F7F8F7]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#545B56] shrink-0" />
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Shared Protocol Modules */}
          <div>
            <div className="px-2 mb-2 text-xs font-mono uppercase tracking-wider text-[#545B56] font-bold">
              Cadastre Tools
            </div>
            <nav className="space-y-1">
              {sharedNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#245C43] text-white font-semibold'
                          : 'text-[#252B28] hover:bg-[#F7F8F7]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#545B56] shrink-0" />
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Utility Footer */}
        <div className="p-4 border-t border-[#E5E8E5] space-y-1 bg-[#F7F8F7]">
          {utilityNavItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#245C43] text-white font-semibold'
                      : 'text-[#545B56] hover:text-[#252B28] hover:bg-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
};
