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
  const { accounts, selectedAccountId, selectedAccount, posts, setOAuthModalOpen } = useApp();
  const [dateRange, setDateRange] = useState<'7D' | '14D' | '28D' | '90D'>('28D');

  const activeAccount = selectedAccount || accounts[0];

  const followerMetric = activeAccount ? activeAccount.followersCount : 0;
  const reachMetric = activeAccount ? activeAccount.reach28d : 0;
  const impressionsMetric = activeAccount ? activeAccount.impressions28d : 0;
  const interactionsMetric = activeAccount ? activeAccount.interactions28d : 0;

  const topPosts = [...posts].sort((a, b) => b.reach - a.reach).slice(0, 3);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Instagram Insights & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audience growth, content performance, and impressions queried via Meta Graph API
            {activeAccount && ` for @${activeAccount.username}`}
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

      {accounts.length === 0 ? (
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
              className="px-5 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
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
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+4.2% vs previous period</span>
                </div>
              </div>
            </div>

            {/* Reach */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Accounts Reached</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {reachMetric.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+18.9% growth</span>
                </div>
              </div>
            </div>

            {/* Impressions */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Impressions</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {impressionsMetric.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+23.4% visibility</span>
                </div>
              </div>
            </div>

            {/* Interactions */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Content Interactions</span>
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
                  <span>6.1% average engagement</span>
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
                  <h3 className="text-sm font-bold text-slate-900">Audience Peak Activity by Hour</h3>
                  <p className="text-xs text-slate-500">Optimal times to dispatch feed posts & reels</p>
                </div>
                <span className="text-[11px] font-mono text-[#1D64EC] bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                  Peak: 12PM - 3PM
                </span>
              </div>

              {/* Bar simulation */}
              <div className="pt-4 flex items-end justify-between h-40 gap-2 border-b border-slate-100 pb-2">
                {[
                  { time: '6am', val: 20 },
                  { time: '9am', val: 45 },
                  { time: '12pm', val: 92 },
                  { time: '3pm', val: 86 },
                  { time: '6pm', val: 78 },
                  { time: '9pm', val: 64 },
                  { time: '12am', val: 28 },
                ].map((slot) => (
                  <div key={slot.time} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {slot.val}%
                    </div>
                    <div
                      style={{ height: `${slot.val}%` }}
                      className={`w-full rounded-t-xl transition-all ${
                        slot.val > 80
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

            {/* Audience Demographics (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Top Audience Locations</h3>
              <div className="space-y-3 pt-1">
                {[
                  { country: 'United States', share: '38%' },
                  { country: 'United Kingdom', share: '21%' },
                  { country: 'Canada', share: '14%' },
                  { country: 'Germany', share: '9%' },
                  { country: 'Australia', share: '7%' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.country}</span>
                      <span className="font-bold text-slate-900 tabular-nums">{item.share}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: item.share }}
                        className="h-full bg-[#1D64EC] rounded-full"
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
                <p className="text-xs text-slate-500 mt-0.5">Community interaction response rate across connected channels</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 self-start sm:self-auto">
                98.4% Response Rate
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Avg Response Time</div>
                <div className="text-xl font-extrabold text-slate-900">&lt; 12 mins</div>
                <div className="text-[11px] text-emerald-600 font-bold">2.4x faster than industry average</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Inquiry Resolution</div>
                <div className="text-xl font-extrabold text-slate-900">96.2%</div>
                <div className="text-[11px] text-slate-500">First-contact resolution rate</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Audience Sentiment</div>
                <div className="text-xl font-extrabold text-slate-900">94% Positive</div>
                <div className="text-[11px] text-emerald-600 font-bold">+6% month-over-month</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
