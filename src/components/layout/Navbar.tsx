import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Instagram, 
  Menu, 
  X, 
  ArrowRight, 
  Sparkles, 
  GraduationCap, 
  ShieldCheck, 
  LogOut, 
  User, 
  Building2,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentRoute, navigateTo, isAuthenticated, currentUser, logout, isAdmin } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);

  const handleNavScroll = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (currentRoute !== '/') {
      navigateTo('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
        
        {/* Brand Logo */}
        <button
          onClick={() => {
            setMobileMenuOpen(false);
            navigateTo('/');
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1D64EC] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Instagram className="w-4.5 h-4.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Campus<span className="text-[#1D64EC]">Connect</span>
            </span>
            <span className="bg-blue-50 text-[#1D64EC] border border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              BUSINESS
            </span>
          </div>
        </button>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
          <button
            onClick={() => handleNavScroll('features')}
            className="hover:text-slate-950 transition-colors cursor-pointer"
          >
            Features
          </button>

          <button
            onClick={() => handleNavScroll('how-it-works')}
            className="hover:text-slate-950 transition-colors cursor-pointer"
          >
            How it works
          </button>

          <button
            onClick={() => handleNavScroll('faq')}
            className="hover:text-slate-950 transition-colors cursor-pointer"
          >
            FAQ
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigateTo('/campuses');
            }}
            className="hover:text-slate-950 transition-colors cursor-pointer"
          >
            All Campuses
          </button>

          {/* CampusConnect Student Network Dropdown */}
          <div className="relative">
            <button
              onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
              className="hover:text-[#1D64EC] text-slate-700 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#1D64EC]" />
              <span>Campus Connect</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {campusDropdownOpen && (
              <div 
                className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setCampusDropdownOpen(false)}
              >
                <button
                  onClick={() => {
                    setCampusDropdownOpen(false);
                    navigateTo('/campuses');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium border-b border-slate-100"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Browse All Campuses</span>
                </button>

                <button
                  onClick={() => {
                    setCampusDropdownOpen(false);
                    navigateTo('/student');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>My Submissions & Drafts</span>
                </button>

                <button
                  onClick={() => {
                    setCampusDropdownOpen(false);
                    navigateTo('/app/submit');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#1D64EC]" />
                  <span>Submit Featured Photo ($6)</span>
                </button>

                <button
                  onClick={() => {
                    setCampusDropdownOpen(false);
                    navigateTo('/app/dashboard');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Business Workspace</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right CTA / Auth (Desktop) - Matching Video */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                navigateTo('/login');
              } else if (currentUser?.role === 'Admin') {
                navigateTo('/admin');
              } else {
                navigateTo('/student');
              }
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#1D64EC] hover:bg-blue-600 rounded-full shadow-xs transition-all cursor-pointer"
          >
            {isAuthenticated ? 'My dashboard' : 'Sign in'}
          </button>
        </div>

        {/* Mobile Actions: Sign up button + Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {!isAuthenticated ? (
            <button
              onClick={() => navigateTo('/login')}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1D64EC] hover:bg-blue-600 rounded-full transition-all cursor-pointer"
            >
              Sign in
            </button>
          ) : (
            <button
              onClick={() => navigateTo(currentUser?.role === 'Admin' ? '/admin' : '/student')}
              className="px-3.5 py-1.5 text-xs font-bold text-[#1D64EC] bg-blue-50 rounded-full"
            >
              My dashboard
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Dropdown Menu (Matches Screenshot 11:35) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-5 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-3.5 text-sm font-semibold text-slate-800">
            <button
              onClick={() => handleNavScroll('features')}
              className="text-left py-1 hover:text-[#1D64EC] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => handleNavScroll('how-it-works')}
              className="text-left py-1 hover:text-[#1D64EC] transition-colors"
            >
              How it works
            </button>
            <button
              onClick={() => handleNavScroll('faq')}
              className="text-left py-1 hover:text-[#1D64EC] transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigateTo('/login');
              }}
              className="text-left py-1 hover:text-[#1D64EC] transition-colors"
            >
              Business login
            </button>
            
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Campus Connect Network
              </span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleNavScroll('campus-network');
                }}
                className="w-full text-left py-1.5 flex items-center justify-between text-xs text-slate-700"
              >
                <span>Universities & Communities</span>
                <Building2 className="w-3.5 h-3.5 text-[#1D64EC]" />
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('/app/submit');
                }}
                className="w-full text-left py-1.5 flex items-center justify-between text-xs text-amber-700 font-semibold"
              >
                <span>Submit Featured Photo ($6)</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo('/app/student');
                }}
                className="w-full text-left py-1.5 flex items-center justify-between text-xs text-slate-700"
              >
                <span>Student Hub</span>
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
