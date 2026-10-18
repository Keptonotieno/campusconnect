import React from 'react';
import { useApp } from '../../context/AppContext';
import { Instagram } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentRoute, navigateTo, isAuthenticated } = useApp();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
        {/* Brand Zone */}
        <button
          onClick={() => navigateTo('/')}
          className="flex items-center gap-2 text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1D64EC] flex items-center justify-center text-white shadow-sm">
            <Instagram className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              campus<span className="text-[#1D64EC]">connect</span>
            </span>
            <span className="bg-[#E9F0FD] text-[#1D64EC] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              BUSINESS
            </span>
          </div>
        </button>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            onClick={() => {
              navigateTo('/');
              setTimeout(() => {
                const el = document.getElementById('features-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => {
              navigateTo('/');
              setTimeout(() => {
                const el = document.getElementById('how-it-works-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button
            onClick={() => {
              navigateTo('/');
              setTimeout(() => {
                const el = document.getElementById('faq-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => navigateTo('/app/dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1D64EC] hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Open dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigateTo('/login')}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer px-2 py-1"
              >
                Business login
              </button>
              <button
                onClick={() => navigateTo('/register')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1D64EC] hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
