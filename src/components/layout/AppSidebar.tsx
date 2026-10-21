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
  ChevronRight,
  GraduationCap,
  Sparkles,
  Building2,
  X,
  UserCheck
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
    conversations,
    isAdmin,
    isMobileSidebarOpen,
    setMobileSidebarOpen
  } = useApp();

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const mainNavItems = [
    { label: 'Overview', route: '/app/dashboard', icon: Home },
    { label: 'Notifications', route: '/app/notifications', icon: Bell, badge: unreadNotificationsCount },
    { label: 'Settings', route: '/app/settings', icon: Settings },
  ];

  const workspaceNavItems = [
    { label: 'Direct Messages', route: '/app/inbox', icon: MessageSquare, badge: unreadMessagesCount },
    { label: 'Comments Moderation', route: '/app/comments', icon: MessageCircle },
    { label: 'Insights & Analytics', route: '/app/insights', icon: BarChart3 },
  ];

  const studentNavItems = [
    { label: 'Student Hub & Status', route: '/app/student', icon: GraduationCap },
    { label: 'Submit Featured Photo ($6)', route: '/app/submit', icon: Sparkles },
    { label: 'Campus Communities', route: '/', icon: Building2 },
  ];

  const handleNavigate = (route: string) => {
    setMobileSidebarOpen(false);
    navigateTo(route);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none text-slate-700 font-sans">
      {/* 1. Brand Header (Matching Screenshot 11:37) */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={() => handleNavigate('/app/dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1D64EC] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Instagram className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              campus<span className="text-[#1D64EC]">connect</span>
            </span>
            <span className="bg-blue-50 text-[#1D64EC] border border-blue-200/60 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
              GLOBAL
            </span>
          </div>
        </button>

        {/* Close Button on Mobile Drawer */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        
        {/* Core Navigation Items (Overview, Notifications, Settings) */}
        <div className="space-y-0.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;

            return (
              <button
                key={item.route}
                onClick={() => handleNavigate(item.route)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#EBF2FE] text-[#1D64EC] font-bold'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#1D64EC]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#1D64EC] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Instagram Accounts Section (Matching Screenshot 11:37) */}
        <div className="space-y-1">
          <div className="px-3 py-1 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Instagram Accounts
            </span>
          </div>

          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              setOAuthModalOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1D64EC] hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full border border-dashed border-blue-400 flex items-center justify-center text-[#1D64EC]">
              <Plus className="w-3 h-3" />
            </div>
            <span>Connect account</span>
          </button>

          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => {
                setSelectedAccountId(acc.id);
                handleNavigate('/app/dashboard');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs hover:bg-slate-100/80 transition-colors cursor-pointer text-slate-700"
            >
              <div className="flex items-center gap-2 truncate">
                <Instagram className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                <span className="truncate font-medium">@{acc.username}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </button>
          ))}
        </div>

        {/* Additional Workspace Tools */}
        <div className="space-y-0.5 pt-1">
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Workspace Tools
            </span>
          </div>

          {workspaceNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;

            return (
              <button
                key={item.route}
                onClick={() => handleNavigate(item.route)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#EBF2FE] text-[#1D64EC] font-bold'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#1D64EC]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Campus Connect & Student Network */}
        <div className="space-y-0.5 pt-1">
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Campus Connect Network
            </span>
          </div>

          {studentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;

            return (
              <button
                key={item.route}
                onClick={() => handleNavigate(item.route)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#EBF2FE] text-[#1D64EC] font-bold'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${item.route === '/app/submit' ? 'text-amber-500' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. User Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {currentUser?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">
              {currentUser?.name || 'Software'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentUser?.email || 'admin@campusconnect.app'}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar (Hidden on mobile < md) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 min-h-screen text-slate-700 select-none shadow-xs font-sans">
        <SidebarContent />
      </aside>

      {/* 2. Mobile Responsive Slide-In Drawer (Overlays screen without crushing content - Fixes Image 1!) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-150">
          {/* Backdrop */}
          <div 
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
