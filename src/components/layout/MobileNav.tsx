import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, MessageSquare, MessageCircle, BarChart3, Settings } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { currentRoute, navigateTo, conversations } = useApp();

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around text-slate-600 shadow-lg font-sans">
      <button
        onClick={() => navigateTo('/app/dashboard')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
          currentRoute === '/app/dashboard' || currentRoute === '/app' ? 'text-[#1D64EC]' : 'text-slate-500'
        }`}
      >
        <Home className="w-4 h-4" />
        <span>Overview</span>
      </button>

      <button
        onClick={() => navigateTo('/app/inbox')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold relative cursor-pointer ${
          currentRoute === '/app/inbox' ? 'text-[#1D64EC]' : 'text-slate-500'
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Messages</span>
        {unreadMessagesCount > 0 && (
          <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-[#1D64EC]" />
        )}
      </button>

      <button
        onClick={() => navigateTo('/app/comments')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
          currentRoute === '/app/comments' ? 'text-[#1D64EC]' : 'text-slate-500'
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Comments</span>
      </button>

      <button
        onClick={() => navigateTo('/app/insights')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
          currentRoute === '/app/insights' ? 'text-[#1D64EC]' : 'text-slate-500'
        }`}
      >
        <BarChart3 className="w-4 h-4" />
        <span>Insights</span>
      </button>

      <button
        onClick={() => navigateTo('/app/settings')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
          currentRoute === '/app/settings' ? 'text-[#1D64EC]' : 'text-slate-500'
        }`}
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </button>
    </div>
  );
};
