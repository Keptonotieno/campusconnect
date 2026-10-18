import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  MessageSquare, 
  MessageCircle, 
  BarChart3, 
  Settings, 
  Bell, 
  Instagram, 
  X,
  ArrowRight
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    navigateTo, 
    accounts, 
    setSelectedAccountId, 
    setOAuthModalOpen,
    conversations,
    comments
  } = useApp();

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearch('');
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const quickActions = [
    {
      title: 'Connect Instagram Account',
      description: 'Link your business or creator profile via Meta OAuth',
      icon: Instagram,
      action: () => {
        setOAuthModalOpen(true);
        setCommandPaletteOpen(false);
      }
    },
    {
      title: 'Direct Messages Inbox',
      description: 'Check unanswered customer inquiries and live chats',
      icon: MessageSquare,
      action: () => {
        navigateTo('/app/inbox');
        setCommandPaletteOpen(false);
      }
    },
    {
      title: 'Comments Moderation',
      description: 'Moderate customer comments, replies, and sentiments',
      icon: MessageCircle,
      action: () => {
        navigateTo('/app/comments');
        setCommandPaletteOpen(false);
      }
    },
    {
      title: 'Instagram Insights & Analytics',
      description: 'View 28-day reach, audience growth, and engagement statistics',
      icon: BarChart3,
      action: () => {
        navigateTo('/app/insights');
        setCommandPaletteOpen(false);
      }
    },
    {
      title: 'Manage Connected Profiles',
      description: 'Audit tokens, refresh status, or add new Instagram accounts',
      icon: Instagram,
      action: () => {
        navigateTo('/app/accounts');
        setCommandPaletteOpen(false);
      }
    },
    {
      title: 'Workspace Settings',
      description: 'Business details, email alerts, and security options',
      icon: Settings,
      action: () => {
        navigateTo('/app/settings');
        setCommandPaletteOpen(false);
      }
    }
  ];

  const filteredActions = quickActions.filter((a) => {
    if (!search.trim()) return true;
    return (
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  const matchedAccounts = accounts.filter((a) => 
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    a.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const matchedConversations = conversations.filter((c) =>
    c.customerUsername.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900 font-sans">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command, message, or account name..."
            autoFocus
            className="flex-1 text-sm bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 font-medium"
          />
          <button 
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
          
          {/* Quick Actions */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Actions
            </div>
            {filteredActions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center shrink-0 group-hover:bg-blue-100/70">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-500">{item.description}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })}
          </div>

          {/* Matched Accounts */}
          {matchedAccounts.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Instagram Profiles
              </div>
              {matchedAccounts.map((acct) => (
                <button
                  key={acct.id}
                  onClick={() => {
                    setSelectedAccountId(acct.id);
                    navigateTo('/app/dashboard');
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 flex items-center justify-center text-white">
                      <span className="w-full h-full rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-[9px]">
                        {acct.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">@{acct.username}</div>
                      <div className="text-[11px] text-slate-500">{acct.displayName} · {(acct.followersCount / 1000).toFixed(1)}K followers</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#1D64EC] font-semibold">Switch</span>
                </button>
              ))}
            </div>
          )}

          {/* Matched Conversations */}
          {matchedConversations.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Direct Messages
              </div>
              {matchedConversations.slice(0, 3).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    navigateTo('/app/inbox');
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-900 mr-1.5">@{conv.customerUsername}</span>
                      <span className="text-xs text-slate-500 truncate">{conv.lastMessage}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">{conv.lastMessageTime}</span>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 px-4 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-600 font-semibold shadow-2xs">ESC to close</kbd>
          </div>
          <span className="font-semibold text-slate-500">CampusConnect Command Engine</span>
        </div>

      </div>
    </div>
  );
};
