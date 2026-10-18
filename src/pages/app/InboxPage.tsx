import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Star, 
  CheckCheck, 
  Instagram, 
  User, 
  ShieldCheck, 
  Archive, 
  Trash2,
  ExternalLink,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export const InboxPage: React.FC = () => {
  const { 
    conversations, 
    selectedConversationId, 
    setSelectedConversationId, 
    sendMessage, 
    markConversationRead,
    selectedAccount
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'IMPORTANT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftMessage, setDraftMessage] = useState('');

  const activeConv = conversations.find((c) => c.id === selectedConversationId) || conversations[0];

  const filteredConversations = conversations.filter((c) => {
    if (activeFilter === 'UNREAD' && c.unreadCount === 0) return false;
    if (activeFilter === 'IMPORTANT' && !c.isImportant) return false;
    if (searchTerm) {
      return (
        c.customerUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftMessage.trim() || !activeConv) return;
    sendMessage(activeConv.id, draftMessage.trim());
    setDraftMessage('');
  };

  const quickCannedReplies = [
    'Yes, we ship worldwide with tracked express delivery!',
    'Thanks for reaching out! You can check full specs via the link in our bio.',
    'Our team will verify stock and get back to you within 30 minutes.'
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-slate-50 font-sans">
      
      {/* 1. CONVERSATIONS LIST (COLUMN 1) */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-white">
        
        {/* Inbox Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#1D64EC]" />
              <span>Direct Messages</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              {conversations.length} conversations
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-xs">
            {(['ALL', 'UNREAD', 'IMPORTANT'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-1 py-1.5 text-center rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-blue-50 text-[#1D64EC] border border-blue-200/60'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No direct messages found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConv?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversationId(conv.id);
                    if (conv.unreadCount > 0) markConversationRead(conv.id);
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 border-l-4 border-l-[#1D64EC]'
                      : 'hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.customerAvatar}
                      alt={conv.customerDisplayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#1D64EC] ring-2 ring-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {conv.customerDisplayName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      @{conv.customerUsername}
                    </div>

                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-slate-950 font-bold' : 'text-slate-500'}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. CHAT THREAD (COLUMN 2) */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden border-r border-slate-200">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <img
                  src={activeConv.customerAvatar}
                  alt={activeConv.customerDisplayName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900">{activeConv.customerDisplayName}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">@{activeConv.customerUsername}</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Instagram Direct • Synced</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <Star className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              <div className="text-center my-3">
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] text-slate-400 font-mono shadow-2xs">
                  Connected with @{activeConv.customerUsername} via Instagram Direct
                </span>
              </div>

              {activeConv.messages.map((msg) => {
                const isBusiness = msg.sender === 'BUSINESS';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isBusiness ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 ${
                        isBusiness
                          ? 'bg-[#1D64EC] text-white rounded-br-xs shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                      <div className={`text-[10px] flex items-center justify-end gap-1 ${
                        isBusiness ? 'text-blue-100' : 'text-slate-400'
                      }`}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isBusiness && <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Canned Suggestions */}
            <div className="p-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400 pl-2 shrink-0">Quick reply:</span>
              {quickCannedReplies.map((reply, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDraftMessage(reply)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#1D64EC] text-[11px] text-slate-600 truncate max-w-xs transition-colors shrink-0 cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form onSubmit={handleSend} className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Reply to customer on Instagram Direct..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!draftMessage.trim()}
                className="p-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
            <span>Select a conversation to view customer messages</span>
          </div>
        )}
      </div>

      {/* 3. CUSTOMER DETAILS SIDEBAR (COLUMN 3) */}
      {activeConv && (
        <div className="hidden xl:block w-72 bg-white p-5 border-l border-slate-200 space-y-5 overflow-y-auto">
          <div className="text-center space-y-2 pb-4 border-b border-slate-100">
            <img
              src={activeConv.customerAvatar}
              alt={activeConv.customerDisplayName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover mx-auto ring-2 ring-slate-200 shadow-xs"
            />
            <h4 className="text-sm font-bold text-slate-900">{activeConv.customerDisplayName}</h4>
            <div className="text-xs text-slate-500 font-mono">@{activeConv.customerUsername}</div>
            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-[#1D64EC] text-[10px] font-bold border border-blue-200">
              Instagram Follower
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Customer Profile
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>Follower Status:</span>
                <span className="font-bold text-slate-900">Follows you</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Response Time:</span>
                <span className="font-bold text-emerald-600">&lt; 5 mins</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Conversation Source:</span>
                <span className="font-mono text-slate-800">Story Reply / DM</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
