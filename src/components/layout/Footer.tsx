import React from 'react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-8 px-6 text-xs text-slate-500">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Links */}
        <div className="flex flex-wrap items-center gap-6">
          <span className="font-bold text-slate-900">
            campus<span className="text-blue-600 font-bold">connect</span> <span className="font-normal text-slate-500">for business</span>
          </span>
          <button onClick={() => navigateTo('/terms')} className="hover:text-slate-900 cursor-pointer">
            Terms
          </button>
          <button onClick={() => navigateTo('/privacy')} className="hover:text-slate-900 cursor-pointer">
            Privacy
          </button>
          <button onClick={() => navigateTo('/privacy')} className="hover:text-slate-900 cursor-pointer">
            Data deletion
          </button>
        </div>

        {/* Right Disclaimer */}
        <div className="text-center md:text-right text-[11px] text-slate-400">
          Not affiliated with or endorsed by Instagram or Meta. © 2026 CampusConnect
        </div>
      </div>
    </footer>
  );
};
