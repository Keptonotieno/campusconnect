import React from 'react';
import { useApp } from '../../context/AppContext';
import { Instagram, Building2, ShieldCheck, GraduationCap } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo, universities } = useApp();

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 px-6 text-xs text-slate-500 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#1D64EC] flex items-center justify-center text-white">
                <Instagram className="w-3.5 h-3.5" />
              </div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight">
                campus<span className="text-[#1D64EC]">connect</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">global university network</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              The premier university student discovery network and Instagram workspace for top institutions abroad including Harvard, Oxford, Miami, Stanford, and more.
            </p>
            <div className="text-[11px] text-slate-400">
              Not affiliated with or endorsed by Instagram or Meta Platforms, Inc. © 2026 CampusConnect.
            </div>
          </div>

          {/* Participating Universities */}
          <div className="md:col-span-4 space-y-2.5">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#1D64EC]" />
              <span>Campus Connect Hubs</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {universities.map(uni => (
                <button
                  key={uni.id}
                  onClick={() => navigateTo(`/university/${uni.slug}`)}
                  className="text-left text-slate-600 hover:text-[#1D64EC] truncate transition-colors cursor-pointer"
                >
                  {uni.name.split(' ')[0]} Hub
                </button>
              ))}
            </div>
          </div>

          {/* Legal & Platform */}
          <div className="md:col-span-3 space-y-2.5">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Platform & Legal
            </div>
            <div className="space-y-1.5 text-xs">
              <div>
                <button onClick={() => navigateTo('/terms')} className="hover:text-slate-900 cursor-pointer">
                  Terms of Service & Refund Policy
                </button>
              </div>
              <div>
                <button onClick={() => navigateTo('/privacy')} className="hover:text-slate-900 cursor-pointer">
                  Privacy Policy & Data Security
                </button>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>
            CampusConnect • Run your campus & Instagram from one place
          </div>
          <div className="flex items-center gap-4">
            <span>Student Featured Consideration: <strong>$6.00 USD (KES 780)</strong></span>
          </div>
        </div>

      </div>
    </footer>
  );
};
