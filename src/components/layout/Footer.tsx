import React from 'react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <footer className="w-full border-t border-slate-200/80 bg-white py-4 sm:py-5 px-6 sm:px-12 font-sans select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-[13px]">
        
        {/* Left: igposthub for business (exact branding from image 1) */}
        <div className="flex items-center">
          <button
            onClick={() => navigateTo('/')}
            className="flex items-baseline gap-1 text-left cursor-pointer group focus:outline-none"
            title="igposthub for business"
          >
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-950">
              igpost<span className="text-[#1D64EC]">hub</span>
            </span>
            <span className="text-xs sm:text-[13px] text-slate-400 font-normal ml-0.5">
              for business
            </span>
          </button>
        </div>

        {/* Center: Terms   Privacy   Data deletion (exact links from image 1) */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 text-slate-500 font-normal">
          <button
            onClick={() => navigateTo('/terms')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Terms
          </button>
          <button
            onClick={() => navigateTo('/privacy')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button
            onClick={() => navigateTo('/data-deletion')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Data deletion
          </button>
        </div>

        {/* Right: Meta disclaimer & copyright (exact copy from image 1) */}
        <div className="text-center md:text-right text-slate-400 font-normal text-xs sm:text-[13px]">
          <span>Not affiliated with or endorsed by Instagram or Meta. © 2026 igposthub</span>
        </div>

      </div>
    </footer>
  );
};
