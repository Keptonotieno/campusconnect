import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Send, MessageCircle } from 'lucide-react';

interface ChatMsg {
  id: string;
  sender: 'BOT' | 'USER';
  text: string;
  time: string;
}

export const SupportWidget: React.FC = () => {
  const { currentRoute } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'msg_0',
      sender: 'BOT',
      text: 'Hi! How can we help you with your CampusConnect dashboard today?',
      time: 'Just now'
    }
  ]);

  // Hide the floating student support widget on admin portal pages
  if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
    return null;
  }

  const handleSuggestionClick = (question: string) => {
    setIsChatExpanded(true);
    const userMsg: ChatMsg = {
      id: 'usr_' + Date.now(),
      sender: 'USER',
      text: question,
      time: 'Just now'
    };

    let answer = "Thanks for asking! Our support team is online.";
    if (question.includes('link my Instagram Business account')) {
      answer = "To link your account, click the blue 'Connect Instagram' or 'Connect Instagram account' button on your dashboard. Instagram's own official login screen will appear where you authorize access. Your account must be an Instagram Business or Creator profile.";
    } else if (question.includes('made a post and its not yet posted')) {
      answer = "If you scheduled a post, it will be published at your specified date and time via the Meta Graph API. You can check its scheduled timestamp in the Content queue. Also ensure your connected Instagram account has active publishing permissions.";
    } else if (question.includes('have a question')) {
      answer = "Feel free to ask anything about connecting multiple accounts, comment moderation, DM inbox, or university student submissions!";
    }

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: 'bot_' + Date.now(),
        sender: 'BOT',
        text: answer,
        time: 'Just now'
      }
    ]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    setInputVal('');
    setIsChatExpanded(true);

    const userMsg: ChatMsg = {
      id: 'usr_' + Date.now(),
      sender: 'USER',
      text: userText,
      time: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      let reply = "Thanks for your question! We have logged your query and our team will get back to you shortly.";
      const lower = userText.toLowerCase();
      if (lower.includes('connect') || lower.includes('link') || lower.includes('account')) {
        reply = "You can link your Instagram Business or Creator account by clicking '+ Connect account' in the sidebar or 'Connect Instagram' in your dashboard banner.";
      } else if (lower.includes('password') || lower.includes('secure')) {
        reply = "We never see or store your Instagram password. Authentication happens directly on Meta's official OAuth screen.";
      } else if (lower.includes('dm') || lower.includes('message') || lower.includes('comment')) {
        reply = "You can reply to customer messages and moderate comments straight from your desk without opening your phone!";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'BOT',
          text: reply,
          time: 'Just now'
        }
      ]);
    }, 600);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsChatExpanded(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-auto select-none">
      
      {/* 1. EXPANDED CONVERSATION CHAT WINDOW */}
      {isOpen && isChatExpanded && (
        <div className="mb-3 w-80 sm:w-88 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-96 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                👋
              </div>
              <div>
                <div className="text-xs font-bold leading-none">CampusConnect Support</div>
                <div className="text-[10px] text-blue-100 mt-0.5">Online to help you</div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Close support chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#FAFBFD] text-xs">
            {messages.map((m) => {
              const isBot = m.sender === 'BOT';
              return (
                <div key={m.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                  <div
                    className={`max-w-[85%] p-2.5 rounded-2xl leading-relaxed ${
                      isBot
                        ? 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-2xs'
                        : 'bg-blue-600 text-white rounded-br-sm shadow-2xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">{m.time}</span>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* 2. INITIAL QUESTION PROMPT BUBBLE (ONLY SHOWN WHEN USER CLICKS TRIGGER, CLOSED BY DEFAULT) */}
      {isOpen && !isChatExpanded && (
        <div className="flex flex-col items-end gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-4 max-w-xs space-y-2 text-xs text-slate-800 relative">
            
            {/* Header with dismiss button */}
            <div className="flex items-center justify-between font-bold text-slate-800 pb-1">
              <span>Hi! How can we help?</span>
              <button
                onClick={handleClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 pt-0.5">
              <button
                onClick={() => handleSuggestionClick('I have a question')}
                className="w-full text-left p-2.5 rounded-xl bg-[#FFF9E6] border border-[#FDE68A] hover:bg-[#FEF3C7] text-slate-800 text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>I have a question</span>
                <span className="text-amber-600 text-xs">💬</span>
              </button>

              <button
                onClick={() => handleSuggestionClick('How do I link my Instagram Business account to my dashboard?')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] leading-snug transition-colors cursor-pointer"
              >
                How do I link my Instagram Business account to my dashboard?
              </button>

              <button
                onClick={() => handleSuggestionClick('I made a post and its not yet posted, why?')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] leading-snug transition-colors cursor-pointer"
              >
                I made a post and its not yet posted, why?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CIRCULAR TRIGGER BUTTON (CLOSED BY DEFAULT, CLICK TO EXPAND / COLLAPSE) */}
      <button
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            setIsOpen(true);
            setIsChatExpanded(false);
          }
        }}
        className="relative group flex items-center justify-center cursor-pointer focus:outline-none"
        aria-label="Toggle support chat"
        title={isOpen ? 'Close support chat' : 'Open support chat'}
      >
        {/* The circular icon container */}
        <div className="w-12 h-12 rounded-full bg-[#8A5016] shadow-lg flex items-center justify-center border-2 border-white ring-2 ring-amber-400/30 group-hover:scale-105 transition-transform">
          <div className="w-10 h-10 rounded-full bg-[#9E5D1D] flex items-center justify-center text-white">
            {isOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <span className="text-lg">👋</span>
            )}
          </div>
        </div>

        {/* The arched 'We Are Here!' badge sticker (only shown when closed) */}
        {!isOpen && (
          <div className="absolute -top-6 -left-12 pointer-events-none select-none">
            <div className="bg-[#E0F2FE] text-[#0284C7] font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-[#BAE6FD] shadow-xs transform -rotate-12 flex items-center gap-0.5">
              <span>We Are Here!</span>
            </div>
          </div>
        )}

        {/* The red notification badge */}
        {!isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">
            1
          </span>
        )}
      </button>

    </div>
  );
};
