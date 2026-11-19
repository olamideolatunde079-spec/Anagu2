import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { NotificationDrawer } from './NotificationDrawer';
import { Shield, Menu, X, User, LogIn } from 'lucide-react';
import { signOut } from '../../lib/supabase';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const NAV_LINKS = [
  { to: '/',                label: 'Home',          exact: true },
  { to: '/explore',         label: 'Explore Land',  exact: false },
  { to: '/verify',          label: 'Verify Title',  exact: false },
  { to: '/portal/gis',      label: 'GIS Map',       exact: false },
  { to: '/portal/explorer', label: 'Explorer',      exact: false },
  { to: '/portal/dashboard',label: 'My ANAGU',      exact: false },
];

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { currentUser, isAuthenticated } = useApp();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPortal   = location.pathname.startsWith('/portal');
  const isActive   = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleSignOut = () => {
    signOut();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E8E5] text-[#252B28]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo + Portal sidebar toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {isPortal && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg bg-[#F7F8F7] text-[#252B28] hover:bg-[#E5E8E5] border border-[#E5E8E5] transition-colors"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
            <div className="w-9 h-9 rounded-lg bg-[#245C43] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#252B28] font-sans">
                ANAGU<span className="text-[#245C43]">!</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono uppercase tracking-wider text-[#545B56]">
                Cadastre &amp; Title Vault
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#252B28]">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`whitespace-nowrap transition-colors hover:text-[#245C43] py-1 ${
                isActive(link.to, link.exact)
                  ? 'text-[#245C43] font-bold border-b-2 border-[#245C43]'
                  : 'text-[#4A524D]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3 shrink-0">
          <NotificationDrawer />

          {isAuthenticated ? (
            <Link to="/portal/profile" className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#E5E8E5]">
              <div className="w-8 h-8 rounded-full bg-[#F7F8F7] border border-[#D5D8D4] overflow-hidden flex items-center justify-center shrink-0">
                {currentUser.avatarUrl
                  ? <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <span className="text-xs font-bold text-[#245C43]">{currentUser.name.charAt(0)}</span>
                }
              </div>
              <span className="hidden xl:block text-xs font-semibold text-[#252B28] leading-tight truncate max-w-[100px]">{currentUser.name}</span>
            </Link>
          ) : (
            <Link to="/auth/login" className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors">
              <LogIn className="w-3.5 h-3.5" />Sign In
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg bg-[#F7F8F7] text-[#252B28] hover:bg-[#E5E8E5] border border-[#E5E8E5] transition-colors"
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#E5E8E5] bg-white px-4 py-4 space-y-2">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.to, link.exact)
                  ? 'bg-[#245C43]/10 text-[#245C43] font-bold'
                  : 'text-[#252B28] hover:bg-[#F7F8F7]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#E5E8E5] mt-3">
            {isAuthenticated ? (
              <>
                <Link to="/portal/profile" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[#252B28] hover:bg-[#F7F8F7]">
                  <User className="w-4 h-4 text-[#245C43]" />My Profile
                </Link>
                <button onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 mt-1">
                  <LogIn className="w-4 h-4 rotate-180" />Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#245C43] text-white hover:bg-[#1B4733]">
                  <LogIn className="w-4 h-4" />Sign In
                </Link>
                <Link to="/auth/register" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#245C43] hover:bg-[#F7F8F7] mt-1 border border-[#E5E8E5]">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
