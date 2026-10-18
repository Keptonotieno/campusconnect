import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Eye, 
  Heart, 
  Instagram, 
  Check, 
  ArrowRight, 
  MessageSquare, 
  MessageCircle, 
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { 
    currentUser, 
    accounts, 
    setOAuthModalOpen, 
    navigateTo, 
    comments, 
    conversations 
  } = useApp();

  const isConnected = accounts.length > 0;
  const primaryAccount = accounts[0];

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingCommentsCount = comments.filter((c) => c.status === 'UNANSWERED').length;

  // Calculate completed checklist steps
  const completedCount = isConnected ? 2 : 1;
  const progressPercent = (completedCount / 4) * 100;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. TOP BLUE GREETING BANNER */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1858D9] to-[#2565EE] p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs text-blue-100 font-medium">
            {formattedDate}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Good evening, {currentUser?.name || 'there'}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 font-normal">
            {isConnected
              ? 'Your Instagram account is linked and synced to CampusConnect.'
              : 'Connect your first Instagram account to get started with CampusConnect.'}
          </p>
        </div>

        <button
          onClick={() => setOAuthModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-white text-[#1D64EC] font-bold text-xs hover:bg-slate-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
        >
          {isConnected ? '+ Connect another account' : 'Connect Instagram'}
        </button>
      </div>

      {/* 2. 4 METRIC CARDS IN A ROW - EVENLY DISTRIBUTED */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Followers */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Followers</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {isConnected ? primaryAccount.followersCount.toLocaleString() : '0'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isConnected ? 'across 1 connected account' : 'across 0 accounts'}
            </div>
          </div>
        </div>

        {/* Accounts Reached */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Accounts reached</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {isConnected ? `${(primaryAccount.reach28d / 1000).toFixed(1)}K` : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              last 28 days
            </div>
          </div>
        </div>

        {/* Interactions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Interactions</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Heart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {isConnected ? `${(primaryAccount.interactions28d / 1000).toFixed(1)}K` : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              likes, comments & shares
            </div>
          </div>
        </div>

        {/* Direct Messages & Inquiries */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Direct Messages</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {isConnected ? conversations.length : '0'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isConnected ? `${unreadMessagesCount} unread incoming` : 'no conversations'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE AREA (Left: Your Accounts & Communication Stream / Right: Get set up & Recent activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Your accounts (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Your connected accounts</h3>
            <button
              onClick={() => setOAuthModalOpen(true)}
              className="text-xs font-semibold text-[#1D64EC] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>+ Connect account</span>
            </button>
          </div>

          {!isConnected ? (
            /* EMPTY STATE */
            <div className="py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Instagram className="w-8 h-8" />
              </div>

              <h4 className="text-sm font-bold text-slate-950 pt-1">
                No accounts linked yet
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Works with Instagram Business and Creator accounts. Connect your profile to manage customer messages, comments, and engagement in CampusConnect.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setOAuthModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Connect Instagram account
                </button>
              </div>
            </div>
          ) : (
            /* CONNECTED STATE DISPLAY */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full border-2 border-fuchsia-500 p-0.5 flex items-center justify-center bg-white shadow-xs">
                    <span className="font-extrabold text-[#1D64EC] text-sm">
                      {primaryAccount.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-950">@{primaryAccount.username}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        Connected & Active
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-normal">
                      {primaryAccount.followersCount.toLocaleString()} followers · {primaryAccount.displayName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateTo('/app/accounts')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>

              {/* Direct Messages & Customer Communications Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Recent Direct Messages on @{primaryAccount.username}</span>
                  <button
                    onClick={() => navigateTo('/app/inbox')}
                    className="text-xs font-semibold text-[#1D64EC] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Open Inbox</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {conversations.slice(0, 3).map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => navigateTo('/app/inbox')}
                      className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-[#1D64EC] font-bold flex items-center justify-center text-xs shrink-0">
                          {conv.customerUsername.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">@{conv.customerUsername}</span>
                            <span className="text-[10px] text-slate-400">{conv.lastMessageTime}</span>
                            {conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#1D64EC] text-white text-[9px] font-bold">
                                {conv.unreadCount} new
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">
                            {conv.lastMessage}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Community Comments to Moderate */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Community Comments Requiring Attention</span>
                  <button
                    onClick={() => navigateTo('/app/comments')}
                    className="text-xs font-semibold text-[#1D64EC] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Moderate all ({pendingCommentsCount})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2">
                  {comments.slice(0, 2).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigateTo('/app/comments')}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MessageCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="truncate text-xs">
                          <span className="font-bold text-slate-900 mr-1.5">@{c.fromUsername}:</span>
                          <span className="text-slate-600">{c.text}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{c.createdAt}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right: Get set up & Recent activity (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* GET SET UP CARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Circular progress wheel */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-8 h-8 transform -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke="#E2E8F0"
                      strokeWidth="3"
                      fill="transparent"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke="#1D64EC"
                      strokeWidth="3"
                      strokeDasharray="75"
                      strokeDashoffset={75 - (75 * progressPercent) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-950">Get set up</h3>
                  <div className="text-[11px] text-slate-400">{completedCount} of 4 done</div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              {/* 1. Create your business account */}
              <div className="flex items-center gap-2 text-slate-800">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="line-through text-slate-400">Create your business account</span>
              </div>

              {/* 2. Connect an Instagram account */}
              <button
                onClick={() => setOAuthModalOpen(true)}
                className="w-full flex items-center justify-between text-left text-slate-700 hover:text-[#1D64EC] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={isConnected ? 'line-through text-slate-400' : 'font-medium'}>
                    Connect an Instagram account
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1D64EC] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3. Review direct messages */}
              <button
                onClick={() => navigateTo('/app/inbox')}
                className="w-full flex items-center justify-between text-left text-slate-700 hover:text-[#1D64EC] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  <span className="font-medium">Review customer direct messages</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1D64EC] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 4. Choose your alerts */}
              <button
                onClick={() => navigateTo('/app/settings')}
                className="w-full flex items-center justify-between text-left text-slate-700 hover:text-[#1D64EC] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  <span className="font-medium">Choose your notifications & alerts</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1D64EC] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* RECENT ACTIVITY CARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-950">Recent activity</h3>
              <button
                onClick={() => navigateTo('/app/notifications')}
                className="text-[11px] font-semibold text-[#1D64EC] cursor-pointer hover:underline"
              >
                All
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Activity item 1 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 leading-tight">
                      Welcome to CampusConnect for business
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">34m ago</div>
                  </div>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D64EC] mt-1 shrink-0" />
              </div>

              {isConnected && (
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-blue-50 text-[#1D64EC] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 leading-tight">
                        Instagram account @{primaryAccount.username} connected
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Active</div>
                    </div>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1D64EC] mt-1 shrink-0" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
