import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Home,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Bell,
  Settings,
  Plus,
  LogOut,
  Instagram,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const AppSidebar: React.FC = () => {
  const {
    currentRoute,
    navigateTo,
    currentUser,
    logout,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    setOAuthModalOpen,
    unreadNotificationsCount,
    conversations
  } = useApp();

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const mainNavItems = [
    { label: 'Overview', route: '/app/dashboard', icon: Home },
    { label: 'Direct Messages', route: '/app/inbox', icon: MessageSquare, badge: unreadMessagesCount },
    { label: 'Comments Moderation', route: '/app/comments', icon: MessageCircle },
    { label: 'Insights & Analytics', route: '/app/insights', icon: BarChart3 },
  ];

  const adminNavItems = [
    { label: 'Connected Accounts', route: '/app/accounts', icon: Instagram, count: accounts.length },
    { label: 'Notifications', route: '/app/notifications', icon: Bell, badge: unreadNotificationsCount },
    { label: 'Workspace Settings', route: '/app/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen text-slate-700 select-none shadow-xs font-sans">
      {/* 1. Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={() => navigateTo('/app/dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1858D9] to-[#2565EE] flex items-center justify-center text-white shadow-xs group-hover:shadow-md transition-all">
            <Instagram className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              campus<span className="text-[#1D64EC]">connect</span>
            </span>
            <span className="bg-blue-50 text-[#1D64EC] border border-blue-200/60 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
              PRO
            </span>
          </div>
        </button>
      </div>

      {/* 2. Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        
        {/* Core Workspace Section */}
        <div className="space-y-0.5">
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Instagram Workspace
            </span>
          </div>

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;

            return (
              <button
                key={item.route}
                onClick={() => navigateTo(item.route)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#EBF2FE] text-[#1D64EC] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#1D64EC]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#1D64EC] text-white font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* INSTAGRAM PROFILES SECTION */}
        <div className="pt-1">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              INSTAGRAM PROFILES
            </span>
            <button
              onClick={() => navigateTo('/app/accounts')}
              className="text-[10px] font-semibold text-slate-400 hover:text-[#1D64EC] cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="space-y-1">
            {accounts.length === 0 ? (
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-[11px] text-slate-500 mb-1.5 font-medium">No account connected yet</p>
                <button
                  onClick={() => setOAuthModalOpen(true)}
                  className="w-full py-1.5 rounded-lg bg-[#1D64EC] text-white font-bold text-[10px] hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Connect Instagram
                </button>
              </div>
            ) : (
              accounts.map((acct) => {
                const isSelected = selectedAccountId === acct.id;
                return (
                  <button
                    key={acct.id}
                    onClick={() => {
                      setSelectedAccountId(acct.id);
                      navigateTo('/app/dashboard');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100/90 font-bold text-slate-900 border border-slate-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                        <span className="w-full h-full rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-[9px]">
                          {acct.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="truncate">@{acct.username}</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active & Verified" />
                  </button>
                );
              })
            )}

            {accounts.length > 0 && (
              <button
                onClick={() => setOAuthModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#1D64EC] hover:bg-[#EBF2FE]/60 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect another account</span>
              </button>
            )}
          </div>
        </div>

        {/* ADMINISTRATION SECTION */}
        <div className="pt-1">
          <div className="px-3 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Administration
            </span>
          </div>

          <div className="space-y-0.5">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigateTo(item.route)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#EBF2FE] text-[#1D64EC] font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#1D64EC]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#1D64EC] text-white font-bold text-[10px] flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.badge === undefined && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. User Profile Footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1D64EC] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {currentUser?.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.name || 'Workspace Account'}
              </div>
              <div className="text-[10px] text-slate-500 truncate font-mono">
                {currentUser?.email || 'user@campusconnect.app'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
