import React, { useState, useEffect } from 'react';
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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Building2, AlertCircle, ArrowRight, ShieldCheck, Instagram, ExternalLink } from 'lucide-react';
import { University } from './types';

// Public & Community Pages
import { LandingPage } from './pages/public/LandingPage';
import { UniversityCommunityPage } from './pages/public/UniversityCommunityPage';
import { 
  TermsPage, 
  PrivacyPage, 
  ForgotPasswordPage, 
  DataDeletionPage 
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
    navigateTo,
    isAuthenticated, 
    getUniversityBySlug, 
    fetchCampusBySlug,
    universities 
  } = useApp();

  // 1. Identify if the current URL explicitly requests a specific campus portal
  const requestedCampusSlug = (() => {
    if (currentRoute === '/' || currentRoute === '') {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      return sp?.get('uni') || sp?.get('university') || null;
    }
    if (currentRoute.startsWith('/ig/')) {
      return currentRoute.replace('/ig/', '').split('/')[0].split('?')[0];
    }
    if (currentRoute.startsWith('/u/')) {
      return currentRoute.replace('/u/', '').split('/')[0].split('?')[0];
    }
    if (currentRoute.startsWith('/university/')) {
      return currentRoute.replace('/university/', '').split('/')[0].split('?')[0];
    }
    if (currentRoute.startsWith('/submit/')) {
      return currentRoute.replace('/submit/', '').split('/')[0].split('?')[0];
    }
    const cleanPath = currentRoute.replace(/^\//, '').split('/')[0].split('?')[0];
    const reservedRoutes = ['admin', 'login', 'register', 'terms', 'privacy', 'data-deletion', 'forgot-password', 'app', 'ig', 'u', 'university', 'submit'];
    if (reservedRoutes.includes(cleanPath)) return null;
    return cleanPath;
  })();

  // Asynchronous remote resolution state for direct university links
  const [asyncResolvedCampus, setAsyncResolvedCampus] = useState<University | null>(null);
  const [isResolvingRemote, setIsResolvingRemote] = useState<boolean>(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState<boolean>(false);

  // Synchronously check local state
  const localMatchedUniversity = requestedCampusSlug ? getUniversityBySlug(requestedCampusSlug) : undefined;

  useEffect(() => {
    if (!requestedCampusSlug) {
      setAsyncResolvedCampus(null);
      setIsResolvingRemote(false);
      setHasAttemptedFetch(false);
      return;
    }

    const local = getUniversityBySlug(requestedCampusSlug);
    if (local) {
      setAsyncResolvedCampus(local);
      setIsResolvingRemote(false);
      setHasAttemptedFetch(true);
      return;
    }

    // If not found in current memory, query server endpoint /api/campuses/:slug
    let isCancelled = false;
    setIsResolvingRemote(true);
    setHasAttemptedFetch(false);

    fetchCampusBySlug(requestedCampusSlug)
      .then((remoteCampus) => {
        if (!isCancelled) {
          setAsyncResolvedCampus(remoteCampus || null);
          setIsResolvingRemote(false);
          setHasAttemptedFetch(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsResolvingRemote(false);
          setHasAttemptedFetch(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [requestedCampusSlug, getUniversityBySlug, fetchCampusBySlug]);

  // Determine active matched university (STRICT - never fallback to EKU for a requested slug)
  const activeCampus = localMatchedUniversity || asyncResolvedCampus;

  // Render campus route if a campus slug was requested
  if (requestedCampusSlug) {
    if (isResolvingRemote && !activeCampus) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent animate-spin rounded-full mb-4" />
          <h2 className="text-lg font-bold">Connecting to Campus Community...</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">/ig/{requestedCampusSlug}</p>
        </div>
      );
    }

    // If campus found, display that specific university with its branding and colors
    if (activeCampus) {
      return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased font-sans">
          <main className="flex-1">
            <UniversityCommunityPage 
              university={activeCampus} 
              initialView={currentRoute.startsWith('/submit/') ? 'BUILDER' : undefined}
            />
          </main>
          <ToastContainer />
          <SupportWidget />
          <CommandPalette />
        </div>
      );
    }

    // If not found after search, show a clear University Not Found page (NEVER show EKU!)
    if (hasAttemptedFetch && !activeCampus) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased font-sans">
          <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                CC
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight">CampusConnect</span>
            </div>
            <button
              onClick={() => navigateTo('/admin')}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
            >
              Admin Portal
            </button>
          </header>

          <main className="flex-1 max-w-xl mx-auto px-6 py-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Building2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-slate-200/70 text-slate-700 text-xs font-mono font-bold">
                Route: /ig/{requestedCampusSlug}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                University Not Found
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                No university with the identifier <strong>"{requestedCampusSlug}"</strong> has been registered in the system yet.
              </p>
            </div>

            {universities.length > 0 ? (
              <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 text-left space-y-3">
                <div className="text-xs font-bold text-slate-800">Registered Universities ({universities.length}):</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {universities.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => navigateTo(`/ig/${u.slug}`)}
                      className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-between transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: u.primaryColor || '#004B87' }} 
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">/ig/{u.slug}</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                No universities have been registered yet by an administrator.
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => navigateTo('/admin')}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Register University in Admin
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Return to Home
              </button>
            </div>
          </main>

          <Footer />
        </div>
      );
    }
  }

  // 2. Hidden Dedicated Admin Operations Portal (/admin and /admin/*)
  if (currentRoute.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased font-sans">
        <main className="flex-1">
          <ErrorBoundary fallbackTitle="Admin Portal Recovery">
            <AdminPortalPage />
          </ErrorBoundary>
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
  else if (currentRoute === '/data-deletion') PublicComponent = DataDeletionPage;
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
