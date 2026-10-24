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

// Public & Community Pages
import { LandingPage } from './pages/public/LandingPage';
import { UniversityCommunityPage } from './pages/public/UniversityCommunityPage';
import { 
  TermsPage, 
  PrivacyPage, 
  ForgotPasswordPage 
} from './pages/public/StaticPages';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Student Portal Pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { SubmitPhotoPage } from './pages/student/SubmitPhotoPage';
import { OnboardingPage } from './pages/student/OnboardingPage';

// Admin Portal Page
import { AdminPortalPage } from './pages/admin/AdminPortalPage';

// Instagram Workspace Pages
import { DashboardPage } from './pages/app/DashboardPage';
import { InboxPage } from './pages/app/InboxPage';
import { CommentsPage } from './pages/app/CommentsPage';
import { InsightsPage } from './pages/app/InsightsPage';
import { AccountsPage } from './pages/app/AccountsPage';
import { NotificationsPage } from './pages/app/NotificationsPage';
import { SettingsPage } from './pages/app/SettingsPage';

const AppContent: React.FC = () => {
  const { 
    currentRoute, 
    isAuthenticated, 
    getUniversityBySlug, 
    selectedUniversity, 
    universities 
  } = useApp();

  // 1. Resolve University Community route (/university/:slug, /u/:slug, /ig/:slug, /:slug, or ?uni= query)
  const isDirectCampusSlug = (() => {
    if (currentRoute === '/' || currentRoute === '') {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const uniParam = sp?.get('uni') || sp?.get('university');
      if (uniParam) {
        return getUniversityBySlug(uniParam);
      }
      return undefined;
    }
    const cleanPath = currentRoute.replace(/^\//, '').split('/')[0].split('?')[0];
    const reservedRoutes = ['admin', 'login', 'register', 'terms', 'privacy', 'forgot-password', 'app'];
    if (reservedRoutes.includes(cleanPath)) return undefined;
    return getUniversityBySlug(cleanPath);
  })();

  const isCampusRoute = currentRoute.startsWith('/university/') || 
                       currentRoute.startsWith('/u/') || 
                       currentRoute.startsWith('/ig/') ||
                       isDirectCampusSlug !== undefined;

  if (isCampusRoute) {
    const slug = currentRoute
      .replace('/university/', '')
      .replace('/u/', '')
      .replace('/ig/', '')
      .replace(/^\//, '')
      .split('/')[0]
      .split('?')[0];

    const matchedUniversity = isDirectCampusSlug || getUniversityBySlug(slug) || selectedUniversity || universities[0];

    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased font-sans">
        <main className="flex-1">
          <UniversityCommunityPage university={matchedUniversity} />
        </main>
        <ToastContainer />
        <SupportWidget />
        <CommandPalette />
      </div>
    );
  }

  // 2. Hidden Dedicated Admin Operations Portal (/admin and /admin/*)
  if (currentRoute.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased font-sans">
        <main className="flex-1">
          <AdminPortalPage />
        </main>
        <ToastContainer />
      </div>
    );
  }

  // 3. Student Photo Submission Page (/app/submit)
  if (currentRoute === '/app/submit') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased font-sans">
        <Navbar />
        <main className="flex-1">
          <SubmitPhotoPage />
        </main>
        <Footer />
        <ToastContainer />
        <SupportWidget />
        <CommandPalette />
      </div>
    );
  }

  // 4. Student Onboarding Page (/app/onboarding)
  if (currentRoute === '/app/onboarding') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased font-sans">
        <Navbar />
        <main className="flex-1">
          <OnboardingPage />
        </main>
        <Footer />
        <ToastContainer />
      </div>
    );
  }

  // 5. Protected workspace routes: Retains the original AppSidebar + AppHeader dashboard layout
  const isAppRoute = currentRoute.startsWith('/app') || currentRoute.startsWith('/business/dashboard') || currentRoute === '/student';

  if (isAppRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased font-sans">
        <Navbar />
        <main className="flex-1">
          <LoginPage />
        </main>
        <Footer />
        <ToastContainer />
      </div>
    );
  }

  if (isAppRoute && isAuthenticated) {
    let PageComponent = DashboardPage;

    if (currentRoute === '/app/inbox') PageComponent = InboxPage as any;
    else if (currentRoute === '/app/comments') PageComponent = CommentsPage as any;
    else if (currentRoute === '/app/insights') PageComponent = InsightsPage as any;
    else if (currentRoute === '/app/accounts') PageComponent = AccountsPage as any;
    else if (currentRoute === '/app/notifications') PageComponent = NotificationsPage as any;
    else if (currentRoute === '/app/settings') PageComponent = SettingsPage as any;
    else if (currentRoute === '/app/student' || currentRoute === '/student') PageComponent = StudentDashboardPage as any;
    else PageComponent = DashboardPage;

    return (
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <PageComponent />
          </main>
        </div>
        <MobileNav />
        <InstagramOAuthModal />
        <SupportWidget />
        <ToastContainer />
        <CommandPalette />
      </div>
    );
  }

  // 6. Public Pages Router
  let PublicComponent = LandingPage;

  if (currentRoute === '/terms') PublicComponent = TermsPage;
  else if (currentRoute === '/privacy') PublicComponent = PrivacyPage;
  else if (currentRoute === '/login' || currentRoute === '/business/login') PublicComponent = LoginPage;
  else if (currentRoute === '/register' || currentRoute === '/business/register') PublicComponent = RegisterPage;
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

      <InstagramOAuthModal />
      <SupportWidget />
      <ToastContainer />
      <CommandPalette />
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
