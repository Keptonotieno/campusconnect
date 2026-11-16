import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Eye, 
  Heart, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Globe, 
  MousePointerClick,
  Share2,
  Bookmark,
  Instagram,
  Sparkles
} from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const { accounts, selectedAccount, posts, comments, conversations, setOAuthModalOpen } = useApp();
  const [dateRange, setDateRange] = useState<'7D' | '14D' | '28D' | '90D'>('28D');

  const activeAccount = selectedAccount || accounts[0];
  const rangeFactor = dateRange === '7D' ? 0.28 : dateRange === '14D' ? 0.55 : dateRange === '90D' ? 2.6 : 1;

  const followerMetric = activeAccount?.followersCount || 0;
  const baseReach = (activeAccount?.reach28d || 0) || posts.reduce((acc, p) => acc + (p.reach || 0), 0);
  const baseImpressions = (activeAccount?.impressions28d || 0) || posts.reduce((acc, p) => acc + (p.impressions || 0), 0);
  const baseInteractions = (activeAccount?.interactions28d || 0) || posts.reduce((acc, p) => acc + (p.likesCount || 0) + (p.commentsCount || 0) + (p.sharesCount || 0) + (p.savesCount || 0), 0);

  const reachMetric = Math.round(baseReach * rangeFactor);
  const impressionsMetric = Math.round(baseImpressions * rangeFactor);
  const interactionsMetric = Math.round(baseInteractions * rangeFactor);
  const engagementRate = reachMetric > 0 ? ((interactionsMetric / reachMetric) * 100).toFixed(1) : '0.0';

  const totalCommentsCount = comments.length;
  const repliedCommentsCount = comments.filter(c => c.status === 'REPLIED').length;
  const totalConversations = conversations.length;
  const unreadConversations = conversations.filter(c => c.unreadCount > 0).length;
  const resolvedConversations = totalConversations - unreadConversations;
  const totalThreads = totalCommentsCount + totalConversations;
  const resolvedThreads = repliedCommentsCount + resolvedConversations;
  const responseRate = totalThreads > 0 ? Math.round((resolvedThreads / totalThreads) * 100) : 0;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Instagram Insights & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audience growth, content performance, and impressions across your connected Instagram accounts
            {activeAccount && ` (@${activeAccount.username})`}
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
          {(['7D', '14D', '28D', '90D'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                dateRange === r ? 'bg-white text-[#1D64EC] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {accounts.length === 0 && posts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/90 shadow-xs text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-md">
            <Instagram className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Analytics Available</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Connect an Instagram Business or Creator account to unlock reach, impressions, audience demographics, and engagement rates.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setOAuthModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Connect Instagram Account
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 PRIMARY KPI METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Followers */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Followers</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {followerMetric.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-1">
                  <span>@{activeAccount?.username || 'workspace'} · {activeAccount?.accountType || 'BUSINESS'}</span>
                </div>
              </div>
            </div>

            {/* Reach */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Accounts Reached ({dateRange})</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {reachMetric.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-1">
                  <span>{posts.length} tracked post{posts.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            </div>

            {/* Impressions */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Impressions ({dateRange})</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {impressionsMetric.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-1">
                  <span>Total views across feeds</span>
                </div>
              </div>
            </div>

            {/* Interactions */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Content Interactions ({dateRange})</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {interactionsMetric.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{engagementRate}% engagement rate</span>
                </div>
              </div>
            </div>

          </div>

          {/* TWO COLUMN PERFORMANCE BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Best Posting Hours (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audience Activity Window ({dateRange})</h3>
                  <p className="text-xs text-slate-500">Recommended campus engagement windows</p>
                </div>
                <span className="text-[11px] font-mono text-[#1D64EC] bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                  {reachMetric > 0 ? 'Peak: 12PM - 3PM' : 'Awaiting activity'}
                </span>
              </div>

              <div className="pt-4 flex items-end justify-between h-40 gap-2 border-b border-slate-100 pb-2">
                {[
                  { time: '6am', val: reachMetric > 0 ? 20 : 8 },
                  { time: '9am', val: reachMetric > 0 ? 45 : 12 },
                  { time: '12pm', val: reachMetric > 0 ? 92 : 18 },
                  { time: '3pm', val: reachMetric > 0 ? 86 : 16 },
                  { time: '6pm', val: reachMetric > 0 ? 78 : 14 },
                  { time: '9pm', val: reachMetric > 0 ? 64 : 12 },
                  { time: '12am', val: reachMetric > 0 ? 28 : 8 },
                ].map((slot) => (
                  <div key={slot.time} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {reachMetric > 0 ? `${slot.val}%` : '0%'}
                    </div>
                    <div
                      style={{ height: `${slot.val}%` }}
                      className={`w-full rounded-t-xl transition-all ${
                        reachMetric > 0 && slot.val > 80
                          ? 'bg-[#1D64EC]'
                          : 'bg-blue-100 group-hover:bg-blue-200'
                      }`}
                    />
                    <span className="text-[10px] font-mono font-medium text-slate-500">
                      {slot.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel & Media Mix (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Workspace Channel Summary</h3>
              <div className="space-y-3 pt-1">
                {[
                  { label: 'Connected Accounts', value: accounts.length, pct: Math.min(100, accounts.length * 50) },
                  { label: 'Published Media Count', value: activeAccount?.mediaCount || posts.length, pct: Math.min(100, (activeAccount?.mediaCount || posts.length) * 10) },
                  { label: 'Active DM Threads', value: totalConversations, pct: Math.min(100, totalConversations * 20) },
                  { label: 'Tracked Comments', value: totalCommentsCount, pct: Math.min(100, totalCommentsCount * 20) },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <span className="font-bold text-slate-900 tabular-nums">{item.value}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${item.pct}%` }}
                        className="h-full bg-[#1D64EC] rounded-full transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* COMMUNITY ENGAGEMENT & CONVERSATION METRICS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Direct Message & Comment Resolution Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live response metrics from your Inbox and Comments moderation queues</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 self-start sm:self-auto">
                {totalThreads > 0 ? `${responseRate}% Response Rate` : '0 Threads Tracked'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">DM Threads Resolved</div>
                <div className="text-xl font-extrabold text-slate-900">{resolvedConversations} / {totalConversations}</div>
                <div className="text-[11px] text-slate-500 font-medium">Unread threads: {unreadConversations}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Comments Replied</div>
                <div className="text-xl font-extrabold text-slate-900">{repliedCommentsCount} / {totalCommentsCount}</div>
                <div className="text-[11px] text-slate-500">Public reply coverage</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Account Connection</div>
                <div className="text-xl font-extrabold text-slate-900">{accounts.length > 0 ? 'Active' : 'Not Connected'}</div>
                <div className="text-[11px] text-emerald-600 font-bold">
                  {activeAccount ? `@${activeAccount.username}` : 'Link an account to track metrics'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
