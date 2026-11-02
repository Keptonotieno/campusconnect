import React, { useState } from 'react';
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
  Sparkles,
  Mail,
  Bell,
  X
} from 'lucide-react';
import { InstagramAccount } from '../../types';

export const DashboardPage: React.FC = () => {
  const { 
    currentUser, 
    accounts, 
    setOAuthModalOpen, 
    navigateTo, 
    disconnectAccount,
    connectAccount,
    selectedUniversity,
    entryUniversityContext,
    mySubmissions,
    updateUserProfile,
    addToast,
    universities
  } = useApp();

  const isConnected = accounts.length > 0;
  const primaryAccount = accounts[0];
  const displayAccounts = accounts;

  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followersCount || 0), 0);
  const totalReach = accounts.reduce((sum, a) => sum + (a.reach28d || 0), 0);
  const totalInteractions = accounts.reduce((sum, a) => sum + (a.interactions28d || 0), 0);
  const totalPosts = accounts.reduce((sum, a) => sum + (a.mediaCount || 0), 0);

  // Target university for submissions
  const userUni = universities.find(u => u.id === currentUser?.universityId || u.slug === currentUser?.universitySlug) || 
                  entryUniversityContext || 
                  selectedUniversity || 
                  (universities.length > 0 ? universities[0] : null);

  // Exact 3 Setup Steps:
  // Step 1: Connect your Instagram account
  // Step 2: Publish your first post
  // Step 3: Choose your email alerts
  const isInstagramConnected = accounts.length > 0;
  const isFirstPostPublished = totalPosts > 0 || (mySubmissions && mySubmissions.length > 0);
  const isEmailAlertsChosen = Boolean(currentUser?.emailAlertsEnabled || currentUser?.emailAlertPreferences);

  const completedStepsCount = 
    (isInstagramConnected ? 1 : 0) + 
    (isFirstPostPublished ? 1 : 0) + 
    (isEmailAlertsChosen ? 1 : 0);

  // Email alerts modal & selection state
  const [showEmailAlertsModal, setShowEmailAlertsModal] = useState(false);
  const [alertSubmissionUpdate, setAlertSubmissionUpdate] = useState(
    currentUser?.emailAlertPreferences?.instantSubmission ?? true
  );
  const [alertLiveFeature, setAlertLiveFeature] = useState(
    currentUser?.emailAlertPreferences?.liveFeature ?? true
  );
  const [alertCampusNews, setAlertCampusNews] = useState(
    currentUser?.emailAlertPreferences?.classmateInteractions ?? true
  );

  const handleSaveEmailAlerts = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      emailAlertsEnabled: true,
      emailAlertPreferences: {
        instantSubmission: alertSubmissionUpdate,
        liveFeature: alertLiveFeature,
        classmateInteractions: alertCampusNews
      }
    });
    addToast('Email Alerts Configured', 'Your notification preferences are active.', 'success');
    setShowEmailAlertsModal(false);
  };

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  // Format matching Screenshot 11:36: e.g. "Monday 19 October"
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const rawName = currentUser?.name || 'there';
  const businessName = rawName.includes(' ') ? rawName.split(' ')[0] : rawName;

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

      {/* 2. 4 METRIC CARDS (Clickable & Interactive - Matching Screenshot 11:36) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Followers - Clickable */}
        <button 
          type="button"
          onClick={() => isConnected ? navigateTo('/app/accounts') : setOAuthModalOpen(true)}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
          title={isConnected ? "View connected accounts" : "Connect an Instagram account"}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium w-full">
            <span className="group-hover:text-blue-600 transition-colors">Followers</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
              {isConnected ? totalFollowers.toLocaleString() : '0'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{isConnected ? `across ${accounts.length} account${accounts.length > 1 ? 's' : ''}` : 'across 0 accounts'}</span>
              <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-bold transition-opacity">→</span>
            </div>
          </div>
        </button>

        {/* Accounts reached - Clickable */}
        <button 
          type="button"
          onClick={() => navigateTo('/app/insights')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
          title="View Instagram reach and analytics"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium w-full">
            <span className="group-hover:text-blue-600 transition-colors">Accounts reached</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
              {isConnected ? (totalReach > 0 ? `${(totalReach / 1000).toFixed(1)}K` : '0') : '—'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>last 28 days</span>
              <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-bold transition-opacity">→</span>
            </div>
          </div>
        </button>

        {/* Interactions - Clickable */}
        <button 
          type="button"
          onClick={() => navigateTo('/app/comments')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
          title="View audience interactions and comments"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium w-full">
            <span className="group-hover:text-blue-600 transition-colors">Interactions</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
              {isConnected ? (totalInteractions > 0 ? `${(totalInteractions / 1000).toFixed(1)}K` : '0') : '—'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>likes, comments, shares, saves</span>
              <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-bold transition-opacity">→</span>
            </div>
          </div>
        </button>

        {/* Posts - Clickable */}
        <button 
          type="button"
          onClick={() => navigateTo(userUni?.slug ? `/submit/${userUni.slug}` : '/app/submit')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
          title="Create or submit a student feature post"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium w-full">
            <span className="group-hover:text-blue-600 transition-colors">Posts</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Grid className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
              {isConnected ? totalPosts.toLocaleString() : '0'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>published in total</span>
              <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-bold transition-opacity">→</span>
            </div>
          </div>
        </button>

      </div>

      {/* 3. MAIN SECTION: YOUR ACCOUNTS + GET SET UP CHECKLIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column: Your accounts */}
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
            /* EMPTY STATE */
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3.5">
              
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Instagram className="w-9 h-9" />
              </div>

              <h4 className="text-base font-bold text-slate-950 pt-1">
                No accounts linked yet
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed max-w-sm font-normal">
                Works with Instagram Business and Creator accounts. You’ll log in on Instagram’s own screen.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  onClick={() => setOAuthModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Connect Instagram account</span>
                </button>
                <button
                  onClick={() => setOAuthModalOpen(true)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer px-2 py-1"
                >
                  Login with Meta / Instagram
                </button>
              </div>

            </div>
          ) : (
            /* CONNECTED ACCOUNTS LIST */
            <div className="space-y-4">
              {displayAccounts.map((acc) => (
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

        {/* Right Column: Get set up checklist (Matching Image 2 exactly) */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
            
            {/* Header with Circular Progress Ring & Title */}
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    className="text-blue-600"
                    strokeWidth="4"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 * (1 - 1 / 4)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Get set up</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">1 of 4 done</p>
              </div>
            </div>

            {/* 4 Checklist Items from Image 2 */}
            <div className="space-y-4 pt-1">
              
              {/* 1. Create your business account (Checked) */}
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-slate-500 font-medium">
                  Create your business account
                </span>
              </div>

              {/* 2. Connect an Instagram account */}
              <button 
                type="button"
                onClick={() => setOAuthModalOpen(true)}
                className="w-full flex items-center gap-3 text-xs sm:text-sm text-slate-800 font-medium hover:text-blue-600 cursor-pointer transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                <span>Connect an Instagram account</span>
              </button>

              {/* 3. Publish your first post */}
              <button 
                type="button"
                onClick={() => navigateTo(userUni?.slug ? `/submit/${userUni.slug}` : '/app/submit')}
                className="w-full flex items-center gap-3 text-xs sm:text-sm text-slate-800 font-medium hover:text-blue-600 cursor-pointer transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                <span>Publish your first post</span>
              </button>

              {/* 4. Choose your email alerts -> */}
              <button 
                type="button"
                onClick={() => setShowEmailAlertsModal(true)}
                className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-800 font-medium hover:text-blue-600 cursor-pointer transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                  <span>Choose your email alerts</span>
                </div>
                <span className="text-slate-400 group-hover:text-blue-600 transition-colors">→</span>
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Email Alerts Modal (Step 3) */}
      {showEmailAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowEmailAlertsModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Choose Email Alerts</h3>
                <p className="text-xs text-slate-500">Step 3 of your profile setup</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Configure which notifications are delivered to <span className="font-semibold text-slate-800">{currentUser?.email || 'your email'}</span>:
            </p>

            <form onSubmit={handleSaveEmailAlerts} className="space-y-3.5">
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={alertSubmissionUpdate}
                  onChange={(e) => setAlertSubmissionUpdate(e.target.checked)}
                  className="mt-0.5 rounded text-[#1D64EC] focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">Submission & $6 Payment Confirmation</span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Receive immediate updates when your $6 spotlight fee is confirmed and pending admin review.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={alertLiveFeature}
                  onChange={(e) => setAlertLiveFeature(e.target.checked)}
                  className="mt-0.5 rounded text-[#1D64EC] focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Spotlight Live on {userUni?.instagramHandle || '@campus_ig'}
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Get an instant email containing your live Instagram post link the moment the admin publishes it.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={alertCampusNews}
                  onChange={(e) => setAlertCampusNews(e.target.checked)}
                  className="mt-0.5 rounded text-[#1D64EC] focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">Campus Community & Classmate Alerts</span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Updates when classmates from {userUni?.name || 'your university'} join and get spotlighted.
                  </span>
                </div>
              </label>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEmailAlertsModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1D64EC] hover:bg-blue-600 rounded-xl shadow-xs transition-colors"
                >
                  Save Alert Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
