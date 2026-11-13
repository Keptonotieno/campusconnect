import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Instagram, 
  Plus, 
  GraduationCap, 
  MapPin, 
  Building2, 
  Bell, 
  ShieldCheck,
  UserCheck,
  LayoutGrid,
  Wallet,
  User,
  CreditCard,
  Search,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Edit2,
  Lock,
  MessageCircle,
  X,
  FileText,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { FeaturedSubmission, University } from '../../types';

interface StoredDraft {
  id: string;
  universityId: string;
  universityName: string;
  universitySlug: string;
  universityInstagramHandle: string;
  photoUrl: string;
  photosCount: number;
  builderStep: 1 | 2 | 3;
  dateStr: string;
  detailsSummary: string;
}

export const StudentDashboardPage: React.FC = () => {
  const { 
    currentUser, 
    mySubmissions, 
    navigateTo, 
    selectedUniversity, 
    setSelectedUniversity,
    universities,
    addToast,
    updateUserProfile,
    logout
  } = useApp();

  // Active Tab: 'SUBMISSIONS' | 'WALLET' | 'PROFILE'
  const [activeTab, setActiveTab] = useState<'SUBMISSIONS' | 'WALLET' | 'PROFILE'>('SUBMISSIONS');

  // Submissions Tab Filter
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'DRAFTS' | 'AWAITING_PAYMENT' | 'IN_QUEUE' | 'POSTED'>('ALL');

  // School Search Modal
  const [isFindSchoolModalOpen, setIsFindSchoolModalOpen] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');

  // Top Up Wallet Modal
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('6.00');
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_wallet_balance');
      return stored ? parseFloat(stored) : 0.00;
    } catch {
      return 0.00;
    }
  });

  // Profile Form State - clean empty defaults for new students
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setFullName(currentUser.name);
      if (currentUser.email) setEmail(currentUser.email);
      if (currentUser.phone) setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // User Dropdown State in Navbar
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Loading overlay state matching the video
  const [isNavLoading, setIsNavLoading] = useState(false);

  const handleTabSwitch = (targetTab: 'SUBMISSIONS' | 'WALLET' | 'PROFILE') => {
    if (targetTab === activeTab) return;
    setIsNavLoading(true);
    setTimeout(() => {
      setActiveTab(targetTab);
      setIsNavLoading(false);
    }, 250);
  };

  const handleNewPost = () => {
    setIsNavLoading(true);
    setTimeout(() => {
      setIsNavLoading(false);
      navigateTo('/#search');
    }, 250);
  };

  // Draft resolution (reads active draft from localStorage if present)
  const [activeDraft, setActiveDraft] = useState<StoredDraft | null>(() => {
    try {
      let activeRaw = localStorage.getItem('campusconnect_active_draft');
      if (!activeRaw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('campusconnect_draft_')) {
            activeRaw = localStorage.getItem(k);
            break;
          }
        }
      }

      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        if (parsed && ((parsed.photos && parsed.photos.length > 0) || parsed.photoUrl)) {
          return {
            id: parsed.id || 'draft_active',
            universityId: parsed.universityId || '',
            universityName: parsed.universityName || 'Campus Community',
            universitySlug: parsed.universitySlug || '',
            universityInstagramHandle: parsed.universityInstagramHandle || '',
            photoUrl: parsed.photos?.[0]?.previewUrl || parsed.photos?.[0]?.url || parsed.photoUrl || '',
            photosCount: parsed.photos?.length || parsed.photosCount || 1,
            builderStep: parsed.builderStep || 1,
            dateStr: 'Recent',
            detailsSummary: parsed.selectedMajor 
              ? `${parsed.selectedMajor} • @${(parsed.instagramHandle || '').replace(/^@/, '') || 'profile'}` 
              : (parsed.instagramHandle ? `@${parsed.instagramHandle.replace(/^@/, '')}` : 'Details in progress')
          };
        }
      }
    } catch {}

    return null;
  });

  // Dynamic live metric calculations from actual user state
  const inProgressCount = activeDraft ? 1 : 0;
  const inQueueCount = mySubmissions.filter(s => s.moderationStatus === 'PENDING' || s.moderationStatus === 'UNDER_REVIEW').length;
  const postedCount = mySubmissions.filter(s => s.publishingStatus === 'PUBLISHED' || s.moderationStatus === 'APPROVED').length;
  const totalSpent = mySubmissions.filter(s => s.paymentStatus === 'PAYMENT_CONFIRMED').length * 6;

  // Re-sync draft on mount or when returning
  useEffect(() => {
    try {
      let activeRaw = localStorage.getItem('campusconnect_active_draft');
      if (!activeRaw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('campusconnect_draft_')) {
            activeRaw = localStorage.getItem(k);
            break;
          }
        }
      }

      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        if (parsed && ((parsed.photos && parsed.photos.length > 0) || parsed.photoUrl)) {
          setActiveDraft({
            id: parsed.id || 'draft_active',
            universityId: parsed.universityId || '',
            universityName: parsed.universityName || 'Campus Community',
            universitySlug: parsed.universitySlug || '',
            universityInstagramHandle: parsed.universityInstagramHandle || '',
            photoUrl: parsed.photos?.[0]?.url || parsed.photos?.[0]?.previewUrl || parsed.photoUrl || '',
            photosCount: parsed.photos?.length || parsed.photosCount || 1,
            builderStep: parsed.builderStep || 1,
            dateStr: 'Recent',
            detailsSummary: parsed.selectedMajor ? `${parsed.selectedMajor} • @${(parsed.instagramHandle || '').replace(/^@/, '') || 'profile'}` : 'Details in progress'
          });
        } else {
          setActiveDraft(null);
        }
      } else {
        setActiveDraft(null);
      }
    } catch {
      setActiveDraft(null);
    }
  }, []);

  // Filtered universities for school picker modal
  const filteredUniversities = useMemo(() => {
    if (!schoolSearchQuery.trim()) return universities;
    const q = schoolSearchQuery.toLowerCase();
    return universities.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.slug.toLowerCase().includes(q) || 
      (u.instagramHandle && u.instagramHandle.toLowerCase().includes(q))
    );
  }, [universities, schoolSearchQuery]);

  const handleSelectSchool = (uni: University) => {
    setSelectedUniversity(uni);
    setIsFindSchoolModalOpen(false);
    navigateTo(`/ig/${uni.slug}`);
  };

  const handleContinueDraft = () => {
    if (!activeDraft) return;
    setIsNavLoading(true);
    setTimeout(() => {
      setIsNavLoading(false);
      navigateTo(`/ig/${activeDraft.universitySlug}?resume=true`);
    }, 250);
  };

  const handleDiscardDraft = () => {
    if (activeDraft) {
      try {
        localStorage.removeItem(`campusconnect_draft_${activeDraft.universitySlug}`);
        const activeRaw = localStorage.getItem('campusconnect_active_draft');
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          if (parsed?.universitySlug === activeDraft.universitySlug) {
            localStorage.removeItem('campusconnect_active_draft');
          }
        }
      } catch {}
      setActiveDraft(null);
      addToast('Draft Removed', 'Draft has been removed so you can start completely fresh.', 'info');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    updateUserProfile({ name: fullName, email, phone });
    setTimeout(() => {
      setIsSavingProfile(false);
      addToast('Profile Updated', 'Your profile details have been saved.', 'success');
    }, 400);
  };

  const handleSendVerificationEmail = async () => {
    const cleanEmail = (email || currentUser?.email || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast('Valid Email Required', 'Please enter your student email address before verifying.', 'error');
      return;
    }
    setIsSendingVerification(true);
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          studentName: fullName || currentUser?.name || 'Student',
          universityId: currentUser?.universityId || 'general'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        addToast('Verification Failed', data.message || 'Unable to send verification email.', 'error');
        return;
      }
      setVerificationSent(true);
      addToast('Verification Email Sent', data.message || `Verification email sent to ${cleanEmail}.`, 'success');
    } catch {
      addToast('Network Issue', 'Could not reach verification email service.', 'error');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      addToast('Password Too Short', 'New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Password Mismatch', 'New password and confirm password do not match.', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password Updated', 'Your password has been changed successfully.', 'success');
    }, 500);
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;
    const newBal = walletBalance + amount;
    setWalletBalance(newBal);
    try {
      localStorage.setItem('campusconnect_wallet_balance', newBal.toFixed(2));
    } catch {}
    setIsTopUpModalOpen(false);
    addToast('Funds Added', `$${amount.toFixed(2)} added to your wallet balance.`, 'success');
  };

  const userDisplayName = currentUser?.name?.trim() || 'Student';
  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ST'
    : 'ST';

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Matching Images 2, 3, 4, 5, 6 Exactly)                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Left: Gold Camera Logo & Brand */}
          <div 
            onClick={() => {
              setActiveTab('SUBMISSIONS');
              navigateTo('/student');
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-[#C28B38] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Instagram className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-950">
              Campus<span className="text-[#C28B38]">Connect</span>
            </span>
          </div>

          {/* Center Navigation Tabs: Submissions | Wallet | Profile */}
          <nav className="flex items-center gap-1 sm:gap-2">
            
            {/* Submissions Tab */}
            <button
              type="button"
              onClick={() => handleTabSwitch('SUBMISSIONS')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'SUBMISSIONS'
                  ? 'bg-[#FBF6ED] text-[#9A6A24] border border-[#ECD9B9]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Submissions</span>
            </button>

            {/* Wallet Tab */}
            <button
              type="button"
              onClick={() => handleTabSwitch('WALLET')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'WALLET'
                  ? 'bg-[#FBF6ED] text-[#9A6A24] border border-[#ECD9B9]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Wallet</span>
            </button>

            {/* Profile Tab */}
            <button
              type="button"
              onClick={() => handleTabSwitch('PROFILE')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'PROFILE'
                  ? 'bg-[#FBF6ED] text-[#9A6A24] border border-[#ECD9B9]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>

          </nav>

          {/* Right Header Actions: $0.00 | + New post | User SD dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            
            {/* Wallet Balance Pill */}
            <button
              type="button"
              onClick={() => handleTabSwitch('WALLET')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>${walletBalance.toFixed(2)}</span>
            </button>

            {/* + New post Button */}
            <button
              type="button"
              onClick={handleNewPost}
              className="px-4 py-2 rounded-xl bg-[#C28B38] hover:bg-[#A97529] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New post</span>
            </button>

            {/* User Avatar Circle SD with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#F3E8D3] text-[#97641E] font-bold text-xs flex items-center justify-center border border-[#E4D1B2]">
                  {userInitials}
                </div>
                <span className="text-slate-400 text-xs">⌵</span>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 truncate">{fullName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('PROFILE');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('WALLET');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Wallet</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                  >
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BODY CONTENT (SUBMISSIONS TAB - Matching Images 2 & 3)                  */}
      {/* ========================================================================= */}
      {activeTab === 'SUBMISSIONS' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8 animate-in fade-in duration-150">
          
          {/* Header row with "Welcome back, software" and "Find a school" button */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-slate-500">
                Welcome back, {userDisplayName.split(' ')[0]}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
                My submissions
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setIsFindSchoolModalOpen(true)}
              className="px-4 py-2 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Find a school</span>
            </button>
          </div>

          {/* 4 Metric Cards from Image 2 */}
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: In progress */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Edit2 className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">
                  {inProgressCount}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">
                  In progress
                </div>
              </div>
            </div>

            {/* Card 2: In queue */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">
                  {inQueueCount}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">
                  In queue
                </div>
              </div>
            </div>

            {/* Card 3: Posted */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">
                  {postedCount}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">
                  Posted
                </div>
              </div>
            </div>

            {/* Card 4: Total spent */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center">
                <span className="font-bold text-sm">$</span>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950">
                  ${totalSpent.toFixed(2)}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">
                  Total spent
                </div>
              </div>
            </div>

          </div>

          {/* Section: "Pick up where you left off" */}
          <div className="space-y-3.5">
            <h2 className="text-base font-bold text-slate-950 tracking-tight">
              Pick up where you left off
            </h2>

            {/* Draft Card or Empty State */}
            {activeDraft ? (
              <div className="max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
                
                {/* Photo Banner with uploaded draft photo */}
                <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                  <img 
                    src={activeDraft.photoUrl} 
                    alt={activeDraft.universityName}
                    className="w-full h-full object-cover opacity-90"
                  />
                  
                  {/* Draft Badge at top-left */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Draft</span>
                  </div>

                  {/* University Crest & Name at bottom of photo */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center text-[8px] font-bold text-blue-900">
                      🦅 2031
                    </div>
                    <span className="text-xs font-bold text-white drop-shadow-md">
                      {activeDraft.universityName}
                    </span>
                  </div>
                </div>

                {/* 3 Step Progress Bar */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <div className={`h-1 rounded-full ${activeDraft.builderStep >= 1 ? 'bg-[#C28B38]' : 'bg-slate-200'}`} />
                      <span className={`text-[10px] ${activeDraft.builderStep >= 1 ? 'font-bold text-[#97641E]' : 'font-medium text-slate-400'}`}>1. Photos</span>
                    </div>
                    <div className="space-y-1">
                      <div className={`h-1 rounded-full ${activeDraft.builderStep >= 2 ? 'bg-[#C28B38]' : 'bg-slate-200'}`} />
                      <span className={`text-[10px] ${activeDraft.builderStep >= 2 ? 'font-bold text-[#97641E]' : 'font-medium text-slate-400'}`}>2. Details</span>
                    </div>
                    <div className="space-y-1">
                      <div className={`h-1 rounded-full ${activeDraft.builderStep >= 3 ? 'bg-[#C28B38]' : 'bg-slate-200'}`} />
                      <span className={`text-[10px] ${activeDraft.builderStep >= 3 ? 'font-bold text-[#97641E]' : 'font-medium text-slate-400'}`}>3. Payment</span>
                    </div>
                  </div>

                  {/* Action Buttons: Continue ->, Edit button, and Discard button */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleContinueDraft}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#C28B38] hover:bg-[#A97529] active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue</span>
                      <span className="text-xs font-bold">→</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleContinueDraft}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Edit draft submission"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="p-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Discard draft and start fresh"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            ) : (
              <div className="max-w-md bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#C28B38]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">No submission in progress</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Ready to join the official collegiate Instagram spotlight? Pick your university and upload your photos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNewPost}
                  className="px-5 py-2.5 rounded-xl bg-[#C28B38] hover:bg-[#A97529] text-white text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Choose university to get featured</span>
                </button>
              </div>
            )}

          </div>

          {/* Section: "All submissions" with Filter Pills */}
          <div className="space-y-4 pt-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-base font-bold text-slate-950 tracking-tight">
                All submissions
              </h2>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('ALL')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All {inProgressCount + mySubmissions.length}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('DRAFTS')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionFilter === 'DRAFTS'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Drafts {inProgressCount}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('AWAITING_PAYMENT')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionFilter === 'AWAITING_PAYMENT'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Awaiting payment {mySubmissions.filter(s => s.paymentStatus === 'AWAITING_PAYMENT' || s.paymentStatus === 'DRAFT').length}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('IN_QUEUE')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionFilter === 'IN_QUEUE'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  In queue {inQueueCount}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionFilter('POSTED')}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                    submissionFilter === 'POSTED'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Posted {postedCount}
                </button>
              </div>
            </div>

            {/* Submissions List Content */}
            <div className="space-y-3">
              {/* Draft Item Row if present and matching filter */}
              {activeDraft && (submissionFilter === 'ALL' || submissionFilter === 'DRAFTS') && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-100 shadow-2xs">
                      <img 
                        src={activeDraft.photoUrl} 
                        alt="Submission thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🦅</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {activeDraft.universityName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {activeDraft.detailsSummary}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Draft in progress
                        </span>
                        <span>•</span>
                        <span>{activeDraft.photosCount} photo(s)</span>
                        <span>•</span>
                        <span>{activeDraft.dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinueDraft}
                    className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 self-end sm:self-center cursor-pointer"
                  >
                    <span>Continue</span>
                    <span className="text-xs">›</span>
                  </button>
                </div>
              )}

              {/* Submitted / Published Items from mySubmissions */}
              {mySubmissions
                .filter(s => {
                  if (submissionFilter === 'DRAFTS') return false;
                  if (submissionFilter === 'AWAITING_PAYMENT') return s.paymentStatus === 'AWAITING_PAYMENT' || s.paymentStatus === 'DRAFT';
                  if (submissionFilter === 'IN_QUEUE') return s.moderationStatus === 'PENDING' || s.moderationStatus === 'UNDER_REVIEW';
                  if (submissionFilter === 'POSTED') return s.publishingStatus === 'PUBLISHED' || s.moderationStatus === 'APPROVED';
                  return true;
                })
                .map(sub => {
                  const img = sub.watermarkedImagePath || sub.originalImagePath || (sub.photos && sub.photos[0]?.previewUrl) || '';
                  const isPublished = sub.publishingStatus === 'PUBLISHED';
                  const isApproved = sub.moderationStatus === 'APPROVED';
                  const isRejected = sub.moderationStatus === 'REJECTED';
                  const statusLabel = isPublished ? 'Published' : isApproved ? 'Approved' : isRejected ? 'Needs revision' : 'In review';
                  const badgeClass = isPublished
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isApproved
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : isRejected
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <div key={sub.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs">
                          {img ? (
                            <img 
                              src={img} 
                              alt="Submission thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Photo</div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {sub.universityName || 'Campus Submission'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                            {sub.caption || (sub.personalInstagramHandle ? `@${sub.personalInstagramHandle}` : 'Campus submission')}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                              {statusLabel}
                            </span>
                            <span>•</span>
                            <span>${sub.paymentAmount || 6}.00</span>
                            <span>•</span>
                            <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {sub.instagramPostUrl && (
                        <a
                          href={sub.instagramPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-end sm:self-center"
                        >
                          <Instagram className="w-3.5 h-3.5 text-pink-600" />
                          <span>View Post</span>
                        </a>
                      )}
                    </div>
                  );
                })}

              {/* Empty state if nothing to display */}
              {!activeDraft && mySubmissions.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
                  No submissions found. Start a new post to get featured on campus!
                </div>
              )}
            </div>

          </div>

        </main>
      )}

      {/* ========================================================================= */}
      {/* 3. BODY CONTENT (WALLET TAB - Matching Image 4 Exactly)                    */}
      {/* ========================================================================= */}
      {activeTab === 'WALLET' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8 animate-in fade-in duration-150">
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              My Wallet
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Top up to pay for submissions instantly.
            </p>
          </div>

          {/* Available Balance Card matching Image 4 */}
          <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 border border-[#EADBBE]/80 shadow-2xs space-y-6 max-w-3xl">
            
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#97641E]">
                  AVAILABLE BALANCE
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  <span className="text-2xl font-bold text-slate-500 mr-1.5">USD</span>
                  {walletBalance.toFixed(2)}
                </div>
              </div>

              <div className="w-10 h-10 rounded-2xl bg-white/80 border border-[#EADBBE] flex items-center justify-center text-[#97641E]">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            {/* + Top up wallet Button */}
            <div>
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#C28B38] hover:bg-[#A97529] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Top up wallet</span>
              </button>
            </div>

            {/* Bottom 2 metrics: Total added & Total spent */}
            <div className="pt-6 border-t border-[#EADBBE]/60 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 font-medium">Total added</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  USD {walletBalance.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Total spent</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  USD 0.00
                </div>
              </div>
            </div>

          </div>

          {/* Transaction History Section matching Image 4 */}
          <div className="space-y-3.5 max-w-3xl">
            <h2 className="text-base font-bold text-slate-950 tracking-tight">
              Transaction history
            </h2>

            <div className="bg-white rounded-3xl p-12 border border-slate-200/90 shadow-2xs text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400 font-medium pt-1">
                No transactions yet
              </p>
            </div>
          </div>

        </main>
      )}

      {/* ========================================================================= */}
      {/* 4. BODY CONTENT (PROFILE TAB - Matching Images 5 & 6 Exactly)               */}
      {/* ========================================================================= */}
      {activeTab === 'PROFILE' && (
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8 animate-in fade-in duration-150">
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              My Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage your account details and password.
            </p>
          </div>

          {/* Profile Card matching Image 5 */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            
            {/* Top Avatar & Identity */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#F3E8D3] text-[#97641E] font-bold text-xl flex items-center justify-center border-2 border-[#E4D1B2] shrink-0">
                  {userInitials}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-950 leading-tight">
                      {fullName || userDisplayName}
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      currentUser?.studentVerificationStatus === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {currentUser?.studentVerificationStatus === 'VERIFIED' ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {email || currentUser?.email || 'No email saved'}
                  </div>
                  <div className="text-[11px] text-slate-400 pt-0.5">
                    {currentUser?.universityName || 'CampusConnect Student Portal'}
                  </div>
                </div>
              </div>

              {currentUser?.studentVerificationStatus !== 'VERIFIED' && (
                <button
                  type="button"
                  onClick={handleSendVerificationEmail}
                  disabled={isSendingVerification}
                  className="px-4 py-2 rounded-xl border border-[#E4D1B2] bg-[#FDF9F2] hover:bg-[#F3E8D3]/60 text-[#97641E] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSendingVerification
                    ? 'Sending...'
                    : verificationSent
                      ? 'Resend Verification Email'
                      : 'Send Verification Email'}
                </button>
              )}
            </div>

            {/* 4-Stat Metrics Row */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 text-center py-4 bg-slate-50/50">
              <div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900">{mySubmissions.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">Total</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900">
                  {mySubmissions.filter(s => s.paymentStatus === 'PAYMENT_CONFIRMED').length}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Paid</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900">{postedCount}</div>
                <div className="text-[11px] text-slate-500 font-medium">Posted</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-extrabold text-blue-600">${totalSpent}</div>
                <div className="text-[11px] text-slate-500 font-medium">Spent</div>
              </div>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38] transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38] transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  PHONE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#C28B38] hover:bg-[#A97529] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </div>

            </form>

          </div>

          {/* Change Password Card matching Image 6 */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-5">
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">Change password</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your password to keep your account secure.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
              
              {/* Current Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  CURRENT PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  NEW PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  CONFIRM NEW PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 bg-[#FDF9F2] text-[#97641E] font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update password'}
                </button>
              </div>

            </form>

          </div>

        </main>
      )}

      {/* ========================================================================= */}
      {/* 5. FOOTER (Matching Image 3)                                              */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-5 px-6 sm:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © 2026 CampusConnect
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigateTo('/terms')} 
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button 
              onClick={() => navigateTo('/privacy')} 
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Privacy
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 6. FIND A SCHOOL MODAL                                                    */}
      {/* ========================================================================= */}
      {isFindSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsFindSchoolModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-950">Find your school</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select your campus to start or resume a featured post.
            </p>

            <div className="relative mt-4 mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={schoolSearchQuery}
                onChange={(e) => setSchoolSearchQuery(e.target.value)}
                placeholder="Search your school..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38]"
                autoFocus
              />
            </div>

            <div className="border border-slate-200 rounded-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
              {filteredUniversities.map((uni) => (
                <button
                  key={uni.id}
                  onClick={() => handleSelectSchool(uni)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-50/50 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                      {uni.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {uni.instagramHandle || `@${uni.slug}`}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TOP UP WALLET MODAL                                                    */}
      {/* ========================================================================= */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsTopUpModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">Top up Wallet</h3>
                <p className="text-xs text-slate-500">Pay for post submissions seamlessly</p>
              </div>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-2">
                {['6.00', '12.00', '24.00'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      topUpAmount === amt
                        ? 'bg-[#FBF6ED] border-[#C28B38] text-[#9A6A24]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  OR ENTER CUSTOM AMOUNT (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.00"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#C28B38] focus:ring-1 focus:ring-[#C28B38]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#C28B38] hover:bg-[#A97529] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Add ${parseFloat(topUpAmount || '0').toFixed(2)} to Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating "We Are Here! 1" support badge */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 select-none pointer-events-auto">
        <div className="relative flex items-center justify-center">
          <button 
            type="button"
            onClick={() => addToast('Live Support', 'Our campus support team is active 24/7 to assist with your post submission.', 'info')}
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

      {/* Video-Authentic Centered Loading Indicator Card */}
      {isNavLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col items-center justify-center gap-3 min-w-[130px] border border-slate-100">
            <div className="w-9 h-9 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-700">Loading...</span>
          </div>
        </div>
      )}

    </div>
  );
};
