import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Search, 
  Instagram, 
  ChevronDown, 
  Check, 
  Plus
} from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { 
    currentRoute, 
    navigateTo, 
    unreadNotificationsCount,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    setOAuthModalOpen,
    setCommandPaletteOpen
  } = useApp();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const getPageTitle = () => {
    switch (currentRoute) {
      case '/app/dashboard':
      case '/app':
        return 'Overview';
      case '/app/inbox':
        return 'Direct Messages';
      case '/app/comments':
        return 'Comments Moderation';
      case '/app/insights':
        return 'Insights & Analytics';
      case '/app/accounts':
        return 'Connected Instagram Accounts';
      case '/app/notifications':
        return 'Notifications';
      case '/app/settings':
        return 'Workspace Settings';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none shadow-2xs font-sans">
      
      {/* 1. Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Meta Graph API v19.0 Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Right Actions */}
      <div className="flex items-center gap-2.5">
        
        {/* Command Search Bar Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick actions & search...</span>
          <kbd className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-semibold shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Active Account Switcher / Connect Button */}
        {accounts.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 cursor-pointer shadow-2xs"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 flex items-center justify-center text-white">
                <span className="w-full h-full rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-[8px]">
                  {activeAccount?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="max-w-[110px] truncate">@{activeAccount?.username}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                  Switch Active Account
                </div>
                {accounts.map((acct) => (
                  <button
                    key={acct.id}
                    onClick={() => {
                      setSelectedAccountId(acct.id);
                      setIsAccountDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-slate-800 truncate">@{acct.username}</span>
                      <span className="text-[10px] text-slate-400">({(acct.followersCount / 1000).toFixed(1)}k)</span>
                    </div>
                    {acct.id === selectedAccountId && (
                      <Check className="w-3.5 h-3.5 text-[#1D64EC] stroke-[2.5]" />
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      setOAuthModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-[#1D64EC] font-semibold hover:bg-blue-50/70 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect another account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setOAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold text-xs shadow-xs hover:opacity-95 transition-all cursor-pointer"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connect Instagram</span>
          </button>
        )}

        {/* Notifications Bell */}
        <button
          onClick={() => navigateTo('/app/notifications')}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-600" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1D64EC] ring-2 ring-white" />
          )}
        </button>

      </div>
    </header>
  );
};
