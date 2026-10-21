import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Eye, 
  Heart, 
  Instagram, 
  Check, 
  ArrowRight, 
  Grid, 
  Plus, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { 
    currentUser, 
    accounts, 
    setOAuthModalOpen, 
    navigateTo, 
    disconnectAccount 
  } = useApp();

  const isConnected = accounts.length > 0;
  const primaryAccount = accounts[0];

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  // Format matching Screenshot 11:36: e.g. "Monday 19 October"
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const businessName = currentUser?.name || 'Software';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. TOP BLUE GREETING BANNER (Matching Screenshot 00:08 - 00:10 and 11:36) */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1858D9] via-[#1D64EC] to-[#2565EE] p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="text-xs text-blue-100 font-medium">
            {formattedDate}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting}, {businessName}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 font-normal">
            {isConnected 
              ? `Your Instagram account @${primaryAccount.username} is linked and synced to CampusConnect.`
              : 'Connect your first Instagram account to get started with CampusConnect.'}
          </p>
        </div>

        <button
          onClick={() => setOAuthModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-white text-[#1D64EC] font-bold text-xs hover:bg-slate-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-center"
        >
          {isConnected ? '+ Connect another account' : 'Connect Instagram'}
        </button>
      </div>

      {/* 2. 4 METRIC CARDS (2x2 on Mobile, 4 in a row on Desktop - Matching Screenshot 11:36) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Followers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Followers</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isConnected ? primaryAccount.followersCount.toLocaleString() : '0'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              {isConnected ? `across ${accounts.length} account${accounts.length > 1 ? 's' : ''}` : 'across 0 accounts'}
            </div>
          </div>
        </div>

        {/* Accounts reached */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Accounts reached</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isConnected ? `${(primaryAccount.reach28d / 1000).toFixed(1)}K` : '—'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              last 28 days
            </div>
          </div>
        </div>

        {/* Interactions */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Interactions</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Heart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isConnected ? `${(primaryAccount.interactions28d / 1000).toFixed(1)}K` : '—'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              likes, comments, shares, saves
            </div>
          </div>
        </div>

        {/* Posts (Matching Screenshot 11:36 with grid icon) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Posts</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Grid className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isConnected ? (primaryAccount.mediaCount || 248) : '0'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              published in total
            </div>
          </div>
        </div>

      </div>

      {/* 3. MAIN SECTION: YOUR ACCOUNTS + GET SET UP CHECKLIST (Matching Screenshots 00:08, 00:10, 11:36) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column: Your accounts (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Your accounts</h3>
            <button
              onClick={() => setOAuthModalOpen(true)}
              className="text-xs font-semibold text-[#1D64EC] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>+ Connect</span>
            </button>
          </div>

          {!isConnected ? (
            /* EMPTY STATE: Matching Screenshot 11:36 and 00:08 */
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3.5">
              
              {/* Instagram Gradient Icon */}
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Instagram className="w-9 h-9" />
              </div>

              <h4 className="text-base font-bold text-slate-950 pt-1">
                No accounts linked yet
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed max-w-sm font-normal">
                Works with Instagram Business and Creator accounts. You’ll log in on Instagram’s own screen.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setOAuthModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Connect Instagram account
                </button>
              </div>

            </div>
          ) : (
            /* CONNECTED ACCOUNTS LIST */
            <div className="space-y-4">
              {accounts.map((acc) => (
                <div 
                  key={acc.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full border-2 border-fuchsia-500 p-0.5 flex items-center justify-center bg-white shadow-xs shrink-0">
                      <img 
                        src={acc.profilePictureUrl} 
                        alt={acc.username}
                        className="w-full h-full rounded-full object-cover" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-950">@{acc.username}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Active & Connected
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {acc.followersCount.toLocaleString()} followers · {acc.accountType}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => navigateTo('/app/inbox')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Open DMs
                    </button>
                    <button
                      onClick={() => disconnectAccount(acc.id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Right Column: Get set up checklist & Recent activity (lg:col-span-4 - Matching Screenshot 00:08) */}
        <div className="lg:col-span-4 space-y-5 sm:space-y-6">
          
          {/* Get set up Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Get set up</h3>
              <span className="text-xs font-bold text-[#1D64EC]">
                {isConnected ? '2 of 4' : '1 of 4'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-700">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="line-through text-slate-400">Create your business</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-700">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  isConnected ? 'bg-emerald-100 text-emerald-600' : 'border border-slate-300'
                }`}>
                  {isConnected && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className={isConnected ? 'line-through text-slate-400' : 'font-medium'}>
                  Connect an Instagram account
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-700">
                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />
                <span className="font-medium text-slate-600">Publish your first post</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-700">
                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />
                <span className="font-medium text-slate-600">Choose your primary account</span>
              </div>
            </div>
          </div>

          {/* Recent activity Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">
                  Welcome to CampusConnect
                </div>
                <div className="text-[10px] text-slate-400">
                  Just now
                </div>
              </div>
            </div>
          </div>

          {/* Campus Connect Quick Tile */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-3xl p-5 border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D64EC]">
              <GraduationCap className="w-4 h-4" />
              <span>Campus Connect Student Network</span>
            </div>
            <p className="text-xs text-slate-600 font-normal leading-relaxed">
              Explore university hubs, submit student profile photos ($6), and check community submissions.
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => navigateTo('/app/student')}
                className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-[#1D64EC] hover:bg-blue-50 transition-colors"
              >
                Student Hub
              </button>
              <button
                onClick={() => navigateTo('/app/submit')}
                className="px-3 py-1.5 rounded-lg bg-[#1D64EC] text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
              >
                Submit Photo ($6)
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
