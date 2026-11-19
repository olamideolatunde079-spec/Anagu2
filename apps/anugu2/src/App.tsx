import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Common Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { CadastralPattern } from './components/common/CadastralPattern';
import { NFTCertificateModal } from './components/blockchain/NFTCertificateModal';

// Public Pages
import { LandingPage } from './components/public/LandingPage';
import { PublicVerifyPage } from './components/public/PublicVerifyPage';
import { ExploreLandPage } from './components/public/ExploreLandPage';
import { AboutPage } from './components/public/AboutPage';
import { FeaturesPage } from './components/public/FeaturesPage';
import { HowItWorksPage } from './components/public/HowItWorksPage';
import { ContactPage } from './components/public/ContactPage';

// Auth Pages
import { LoginPage, RegisterPage, ForgotPasswordPage, AccessDeniedPage } from './components/auth/AuthScreens';

// Citizen Portal
import { CitizenDashboard } from './components/citizen/CitizenDashboard';
import { MyLandsView } from './components/citizen/MyLandsView';
import { LandDetailView } from './components/citizen/LandDetailView';
import { LandRegistrationWizard } from './components/citizen/LandRegistrationWizard';
import { DocumentCentreView } from './components/citizen/DocumentCentreView';
import { ApplicationTrackingView } from './components/citizen/ApplicationTrackingView';
import { TransactionHistoryView } from './components/citizen/TransactionHistoryView';

// GIS Spatial Engine
import { GISWorkspace } from './components/gis/GISWorkspace';

// Blockchain & NFT
import { BlockchainExplorer } from './components/blockchain/BlockchainExplorer';
import { NFTIssuanceView } from './components/blockchain/NFTIssuanceView';

// Community Attestation
import { CommunityAttestationView } from './components/community/CommunityAttestationView';

// Role Portals
import { SurveyorPortal } from './components/surveyor/SurveyorPortal';
import { RegistrarPortal } from './components/registrar/RegistrarPortal';
import { LandAdminPortal } from './components/administrator/LandAdminPortal';
import { GovernorPortal } from './components/governor/GovernorPortal';
import { SysAdminPortal } from './components/sysadmin/SysAdminPortal';

// Monitoring & Analytics
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { MonitoringView } from './components/monitoring/MonitoringView';

// Shared Pages
import { ProfileView } from './components/shared/ProfileView';
import { SettingsView } from './components/shared/SettingsView';
import { HelpFAQView } from './components/shared/HelpFAQView';
import { NotFoundView } from './components/shared/NotFoundView';
// Admin Portal (separate /admin route — password protected)
import { AdminPortal } from './components/admin/AdminPortal';

// Dynamic Role Dashboard Dispatcher
const RoleDashboardDispatcher: React.FC = () => {
  const { currentRole } = useApp();

  switch (currentRole) {
    case 'surveyor':
      return <SurveyorPortal />;
    case 'registrar':
      return <RegistrarPortal />;
    case 'admin':
      return <LandAdminPortal />;
    case 'governor':
      return <GovernorPortal />;
    case 'sysadmin':
      return <SysAdminPortal />;
    case 'citizen':
    default:
      return <CitizenDashboard />;
  }
};

const RequireAuth: React.FC = () => {
  const { authLoading, isAuthenticated } = useApp();
  const location = useLocation();

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center text-sm">Restoring your secure session…</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

const RequireRole: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { currentRole } = useApp();
  return roles.includes(currentRole)
    ? <>{children}</>
    : <Navigate to="/auth/access-denied" replace />;
};

const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { selectedCertificateParcel, setSelectedCertificateParcel } = useApp();
  const location = useLocation();

  const isPortal = location.pathname.startsWith('/portal');
  const isDashboard = location.pathname === '/portal/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#252B28] font-sans selection:bg-[#245C43] selection:text-white relative">
      {/* Top Navigation Bar */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* 3. Main Body Structure */}
      <div className="flex-1 flex w-full relative z-10">
        {/* Render Sidebar if in /portal */}
        {isPortal && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 w-full min-w-0 relative bg-white ${
            isPortal ? 'p-3 sm:p-5 lg:p-8' : ''
          }`}
        >
          {isDashboard && <CadastralPattern />}
          <div className="relative z-10">
            <Routes>
            {/* Admin Portal — completely separate password-protected URL */}
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/admin/*" element={<AdminPortal />} />

            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/verify" element={<PublicVerifyPage />} />
            <Route path="/explore" element={<ExploreLandPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/access-denied" element={<AccessDeniedPage />} />

            <Route element={<RequireAuth />}>
            {/* Portal Root -> Dispatches by Active Role */}
            <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="/portal/dashboard" element={<RoleDashboardDispatcher />} />

            {/* Citizen Portal Pages */}
            <Route path="/portal/my-lands" element={<MyLandsView />} />
            <Route path="/portal/lands/:id" element={<LandDetailView />} />
            <Route path="/portal/register-land" element={<LandRegistrationWizard />} />
            <Route path="/portal/documents" element={<DocumentCentreView />} />
            <Route path="/portal/applications" element={<ApplicationTrackingView />} />
            <Route path="/portal/transactions" element={<TransactionHistoryView />} />

            {/* GIS Workspace */}
            <Route path="/portal/gis" element={<GISWorkspace />} />

            {/* Blockchain & NFT */}
            <Route path="/portal/explorer" element={<BlockchainExplorer />} />
            <Route path="/portal/nft-issuance" element={<NFTIssuanceView />} />
            <Route path="/portal/nft-registry" element={<NFTIssuanceView />} />

            {/* Community Attestation */}
            <Route path="/portal/community" element={<CommunityAttestationView />} />

            {/* Role-Specific Direct Routes */}
            <Route path="/portal/surveyor/*" element={<RequireRole roles={['surveyor']}><SurveyorPortal /></RequireRole>} />
            <Route path="/portal/registrar/*" element={<RequireRole roles={['registrar']}><RegistrarPortal /></RequireRole>} />
            <Route path="/portal/admin/*" element={<RequireRole roles={['admin']}><LandAdminPortal /></RequireRole>} />
            <Route path="/portal/governor/*" element={<RequireRole roles={['governor']}><GovernorPortal /></RequireRole>} />
            <Route path="/portal/sysadmin/*" element={<RequireRole roles={['sysadmin']}><SysAdminPortal /></RequireRole>} />

            {/* Analytics & Monitoring */}
            <Route path="/portal/analytics" element={<AnalyticsView />} />
            <Route path="/portal/monitoring" element={<MonitoringView />} />

            {/* Shared Utility */}
            <Route path="/portal/profile" element={<ProfileView />} />
            <Route path="/portal/settings" element={<SettingsView />} />
            <Route path="/portal/help" element={<HelpFAQView />} />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<NotFoundView />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* 4. Global Footer on Public Routes */}
      {!isPortal && <Footer />}

      {/* 5. Global NFT Certificate Modal */}
      {selectedCertificateParcel && (
        <NFTCertificateModal
          parcel={selectedCertificateParcel}
          onClose={() => setSelectedCertificateParcel(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </BrowserRouter>
  );
}
