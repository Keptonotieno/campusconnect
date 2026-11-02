import React, { useState, useMemo } from 'react';
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
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Mail,
  Bell,
  X,
  MessageCircle
} from 'lucide-react';
import { University } from '../../types';

export const DashboardPage: React.FC = () => {
  const { 
    currentUser, 
    accounts, 
    setOAuthModalOpen, 
    navigateTo, 
    disconnectAccount,
    setSelectedUniversity,
    selectedUniversity,
    entryUniversityContext,
    mySubmissions,
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

  // Active or target university
  const userUni = selectedUniversity ||
                  universities.find(u => u.id === currentUser?.universityId || u.slug === currentUser?.universitySlug) || 
                  entryUniversityContext || 
                  (universities.length > 0 ? universities[0] : null);

  // School Selector Modal State (Matching Image 5)
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(userUni?.id || '');
  const [modalSourceAction, setModalSourceAction] = useState<'CONNECT' | 'POST'>('CONNECT');

  // Filter universities based on search query
  const filteredUniversities = useMemo(() => {
    if (!schoolSearchQuery.trim()) return universities;
    const q = schoolSearchQuery.toLowerCase();
    return universities.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.slug.toLowerCase().includes(q) || 
      (u.instagramHandle && u.instagramHandle.toLowerCase().includes(q))
    );
  }, [universities, schoolSearchQuery]);

  const handleOpenSchoolModal = (source: 'CONNECT' | 'POST' = 'CONNECT') => {
    setModalSourceAction(source);
    if (!selectedSchoolId && universities.length > 0) {
      setSelectedSchoolId(universities[0].id);
    }
    setIsSchoolModalOpen(true);
  };

  const handleContinueToInstagram = () => {
    const chosen = universities.find(u => u.id === selectedSchoolId);
    if (chosen) {
      setSelectedUniversity(chosen);
    }
    setIsSchoolModalOpen(false);

    if (modalSourceAction === 'POST' && chosen) {
      navigateTo(`/submit/${chosen.slug}`);
    } else {
      // Step 2: Log in to Instagram
      setOAuthModalOpen(true);
    }
  };

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  // Format matching Screenshot: "Monday 2 November"
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const rawName = currentUser?.name || 'there';
  const businessName = rawName.includes(' ') ? rawName.split(' ')[0] : rawName;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans selection:bg-blue-600 selection:text-white relative">
      
      {/* 1. TOP BLUE GREETING BANNER (Matching Image 2 / Image 3) */}
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
              ? `Your Instagram account @${primaryAccount.username} is connected and active.`
              : 'Connect your first Instagram account to get started.'}
          </p>
        </div>

        <button
          onClick={() => handleOpenSchoolModal('CONNECT')}
          className="px-5 py-2.5 rounded-xl bg-white text-[#1D64EC] font-bold text-xs hover:bg-slate-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-center"
        >
          {isConnected ? '+ Connect another account' : 'Connect Instagram'}
        </button>
      </div>

      {/* 2. 4 METRIC CARDS (Matching Image 2 / Image 3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Followers */}
        <button 
          type="button"
          onClick={() => isConnected ? navigateTo('/app/accounts') : handleOpenSchoolModal('CONNECT')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
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
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              <span>{isConnected ? `across ${accounts.length} account${accounts.length > 1 ? 's' : ''}` : 'across 0 accounts'}</span>
            </div>
          </div>
        </button>

        {/* Accounts reached */}
        <button 
          type="button"
          onClick={() => navigateTo('/app/insights')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
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
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              <span>last 28 days</span>
            </div>
          </div>
        </button>

        {/* Interactions */}
        <button 
          type="button"
          onClick={() => navigateTo('/app/comments')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
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
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              <span>likes, comments, shares, saves</span>
            </div>
          </div>
        </button>

        {/* Posts */}
        <button 
          type="button"
          onClick={() => handleOpenSchoolModal('POST')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer text-left flex flex-col justify-between group focus:outline-none"
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
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
              <span>published in total</span>
            </div>
          </div>
        </button>

      </div>

      {/* 3. MAIN SECTION: YOUR ACCOUNTS (LEFT) + GET SET UP & RECENT ACTIVITY (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column: Your accounts */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Your accounts</h3>
            <button
              onClick={() => handleOpenSchoolModal('CONNECT')}
              className="text-xs font-semibold text-[#1D64EC] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>+ Connect</span>
            </button>
          </div>

          {!isConnected ? (
            /* EMPTY STATE Matching Image 2 / Image 3 */
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

              <div className="pt-2">
                <button
                  onClick={() => handleOpenSchoolModal('CONNECT')}
                  className="px-6 py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Connect Instagram account</span>
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
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Open DMs
                    </button>
                    <button
                      onClick={() => disconnectAccount(acc.id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Right Column: Get set up checklist + Recent activity */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Get set up checklist card (Matching Image 2 / Image 3 / Image 4) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
            
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

            {/* 4 Checklist Items with Clickable Arrows */}
            <div className="space-y-3.5 pt-1">
              
              {/* 1. Create your business account (Checked) */}
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <del className="text-slate-400 font-medium">
                  Create your business account
                </del>
              </div>

              {/* 2. Connect an Instagram account -> (Clickable, opens School Selector Modal) */}
              <button 
                type="button"
                onClick={() => handleOpenSchoolModal('CONNECT')}
                className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-800 font-medium hover:text-blue-600 cursor-pointer transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 group-hover:border-blue-500 transition-colors" />
                  <span>Connect an Instagram account</span>
                </div>
                <span className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all text-sm font-semibold">
                  →
                </span>
              </button>

              {/* 3. Publish your first post -> (Clickable, opens School Selector Modal to choose school) */}
              <button 
                type="button"
                onClick={() => handleOpenSchoolModal('POST')}
                className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-800 font-medium hover:text-blue-600 cursor-pointer transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 group-hover:border-blue-500 transition-colors" />
                  <span>Publish your first post</span>
                </div>
                <span className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all text-sm font-semibold">
                  →
                </span>
              </button>

              {/* 4. Choose your email alerts -> (Clickable, switches directly to Image 6 Notifications Settings) */}
              <button 
                type="button"
                onClick={() => navigateTo('/app/settings?tab=notifications')}
                className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-800 font-medium hover:text-blue-600 cursor-pointer transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 group-hover:border-blue-500 transition-colors" />
                  <span>Choose your email alerts</span>
                </div>
                <span className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all text-sm font-semibold">
                  →
                </span>
              </button>

            </div>

          </div>

          {/* Recent activity card (Matching Image 4) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
              <button
                type="button"
                onClick={() => navigateTo('/app/notifications')}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                All
              </button>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900 leading-snug">
                  Welcome to igposthub for business
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  17 Oct
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. SCHOOL SELECTOR MODAL (Matching Image 5 Exactly)                        */}
      {/* "Which school is this account for?" with dynamic schools list from system  */}
      {/* ========================================================================= */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            
            {/* Top Step Breadcrumb: 1 CHOOSE YOUR SCHOOL -> 2 LOG IN TO INSTAGRAM */}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-5 h-5 rounded-full bg-[#1D64EC] text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span className="text-[#1D64EC]">CHOOSE YOUR SCHOOL</span>
              <span className="text-slate-400 font-normal">→</span>
              <span className="text-slate-400 font-medium">2 LOG IN TO INSTAGRAM</span>
            </div>

            {/* Heading and Subtext */}
            <h3 className="text-xl font-bold text-slate-950 tracking-tight">
              Which school is this account for?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Search for your school, then log in to its Instagram account. We'll link the two automatically.
            </p>

            {/* Search Input matching Image 5 */}
            <div className="relative mt-4 mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={schoolSearchQuery}
                onChange={(e) => setSchoolSearchQuery(e.target.value)}
                placeholder="Search your school..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC] transition-all"
                autoFocus
              />
              {schoolSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSchoolSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dynamic University List from System */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white shadow-2xs">
              {filteredUniversities.length > 0 ? (
                filteredUniversities.map((uni: University) => {
                  const isSelected = selectedSchoolId === uni.id;
                  const initials = uni.name
                    .split(' ')
                    .map(word => word[0])
                    .filter(Boolean)
                    .slice(0, 4)
                    .join('')
                    .toUpperCase();

                  return (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => setSelectedSchoolId(uni.id)}
                      className={`w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/80 hover:bg-blue-50' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Circular Emblem with classYear badge */}
                        <div 
                          className="w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 border shadow-2xs text-center p-1"
                          style={{
                            backgroundColor: isSelected ? '#3B4988' : '#F8FAFC',
                            borderColor: isSelected ? '#3B4988' : '#E2E8F0',
                            color: isSelected ? '#FFFFFF' : '#1E293B'
                          }}
                        >
                          <span className="text-[9px] font-bold leading-none tracking-tight">
                            {initials || 'UNI'}
                          </span>
                          <span className="text-[8px] font-medium leading-none mt-0.5 opacity-80">
                            {uni.classYear || '2031'}
                          </span>
                        </div>

                        {/* Name and Handle */}
                        <div className="min-w-0 truncate">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {uni.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                            {uni.instagramHandle || `@${uni.slug}`}
                          </div>
                        </div>
                      </div>

                      {/* Selected radio pill */}
                      <div className="shrink-0">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'border-[#1D64EC] bg-[#1D64EC] text-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No schools match your search.
                </div>
              )}
            </div>

            {/* Footer Buttons matching Image 5 */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSchoolModalOpen(false)}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinueToInstagram}
                disabled={!selectedSchoolId}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#6A9BF6] hover:bg-blue-600 active:scale-98 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Continue to Instagram
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating "We Are Here! 1" support badge */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 select-none pointer-events-auto">
        <div className="relative flex items-center justify-center">
          <button 
            type="button"
            onClick={() => addToast('Live Support', 'Our campus support team is active 24/7 to assist with your workspace setup.', 'info')}
            className="w-12 h-12 rounded-full bg-[#854D0E] text-white flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            aria-label="Contact live support"
          >
            <MessageCircle className="w-6 h-6 fill-white text-[#854D0E]" />
          </button>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
            1
          </span>
        </div>
      </div>

    </div>
  );
};
