import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Search, 
  Instagram, 
  ChevronDown, 
  Check, 
  Plus, 
  Menu 
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
    setCommandPaletteOpen,
    setMobileSidebarOpen
  } = useApp();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const getPageTitle = () => {
    switch (currentRoute) {
      case '/app/dashboard':
      case '/app':
      case '/business/dashboard':
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
      case '/app/student':
      case '/student':
        return 'Student Hub';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-14 sm:h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none shadow-2xs font-sans">
      
      {/* 1. Mobile Hamburger Toggle + Page Title (Matches Screenshot 11:36) */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5 text-slate-800" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Meta Graph API Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Command Search Bar Trigger (Desktop) */}
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

        {/* Active Account Switcher / Connect Button (Desktop) */}
        {accounts.length > 0 ? (
          <div className="relative hidden sm:block">
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
              <div 
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsAccountDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Linked Instagram Accounts
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {accounts.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setIsAccountDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                          isSelected ? 'bg-blue-50/70 text-[#1D64EC] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Instagram className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                          <span className="truncate">@{acc.username}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1D64EC] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                  <button
                    onClick={() => {
                      setIsAccountDropdownOpen(false);
                      setOAuthModalOpen(true);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl text-left text-xs font-semibold text-[#1D64EC] hover:bg-blue-50 flex items-center gap-1.5 cursor-pointer"
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-[#1D64EC] hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Connect Instagram</span>
          </button>
        )}

        {/* Notifications Icon (Matching Screenshot 11:36 with red notification dot) */}
        <button
          onClick={() => navigateTo('/app/notifications')}
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-700" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white" />
          )}
        </button>

      </div>

    </header>
  );
};
