import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/common/ToastContainer';
import { CommandPalette } from './components/common/CommandPalette';
import { InstagramOAuthModal } from './components/common/InstagramOAuthModal';
import { SupportWidget } from './components/common/SupportWidget';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { 
  TermsPage, 
  PrivacyPage, 
  ForgotPasswordPage 
} from './pages/public/StaticPages';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// App Workspace Pages (Streamlined CampusConnect)
import { DashboardPage } from './pages/app/DashboardPage';
import { InboxPage } from './pages/app/InboxPage';
import { CommentsPage } from './pages/app/CommentsPage';
import { InsightsPage } from './pages/app/InsightsPage';
import { AccountsPage } from './pages/app/AccountsPage';
import { NotificationsPage } from './pages/app/NotificationsPage';
import { SettingsPage } from './pages/app/SettingsPage';

const AppContent: React.FC = () => {
  const { currentRoute, isAuthenticated } = useApp();

  const isAppRoute = currentRoute.startsWith('/app');

  // If visiting /app while not authenticated, direct to LoginPage
  if (isAppRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased font-sans">
        <main className="flex-1">
          <LoginPage />
        </main>
        <ToastContainer />
      </div>
    );
  }

  // Authenticated Workspace Router
  if (isAppRoute && isAuthenticated) {
    let PageComponent = DashboardPage;

    if (currentRoute === '/app/inbox') PageComponent = InboxPage;
    else if (currentRoute === '/app/comments') PageComponent = CommentsPage;
    else if (currentRoute === '/app/insights') PageComponent = InsightsPage;
    else if (currentRoute === '/app/accounts') PageComponent = AccountsPage;
    else if (currentRoute === '/app/notifications') PageComponent = NotificationsPage;
    else if (currentRoute === '/app/settings') PageComponent = SettingsPage;
    else PageComponent = DashboardPage;

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row antialiased font-sans">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <AppSidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            <PageComponent />
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Modals & Overlays */}
        <InstagramOAuthModal />
        <CommandPalette />
        <SupportWidget />
        <ToastContainer />
      </div>
    );
  }

  // Public Marketing & Auth Router
  let PublicComponent = LandingPage;

  if (currentRoute === '/terms') PublicComponent = TermsPage;
  else if (currentRoute === '/privacy') PublicComponent = PrivacyPage;
  else if (currentRoute === '/login') PublicComponent = LoginPage;
  else if (currentRoute === '/register') PublicComponent = RegisterPage;
  else if (currentRoute === '/forgot-password') PublicComponent = ForgotPasswordPage;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased font-sans">
      {currentRoute !== '/login' && currentRoute !== '/register' && currentRoute !== '/forgot-password' && (
        <Navbar />
      )}

      <main className="flex-1">
        <PublicComponent />
      </main>

      {currentRoute !== '/login' && currentRoute !== '/register' && currentRoute !== '/forgot-password' && (
        <Footer />
      )}

      {/* Support widget & Instagram Modal */}
      <InstagramOAuthModal />
      <SupportWidget />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
