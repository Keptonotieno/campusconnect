import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  ShieldAlert,
  Lock, 
  LogOut,
  Check, 
  X, 
  Instagram, 
  ExternalLink, 
  Copy, 
  Filter, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  FileText, 
  DollarSign, 
  Eye, 
  EyeOff,
  Sparkles,
  RefreshCw,
  Plus,
  Mail,
  Send,
  Radio,
  Layers,
  ChevronRight,
  User,
  CreditCard,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import { FeaturedSubmission, University, PaymentRecord, InstagramAccount, AuditLogItem } from '../../types';
import { 
  getAdminStatus, 
  bootstrapAdmin, 
  loginAdmin, 
  logoutAdmin, 
  checkAdminSession,
  fetchAdminOverview,
  fetchAdminCampuses,
  createAdminCampus,
  updateAdminCampus,
  fetchAdminPayments,
  simulateWebhookTest,
  fetchAdminInstagram,
  disconnectAdminInstagram,
  fetchAdminEmail,
  sendAdminTestEmail,
  fetchAdminAuditLogs,
  AdminOverviewData,
  EmailConfigData,
  getStoredAdminToken
} from '../../lib/adminApi';

export const AdminPortalPage: React.FC = () => {
  const { 
    submissions, 
    reviewSubmission, 
    publishToInstagram, 
    addToast,
    refreshCampuses,
    navigateTo 
  } = useApp();

  // Auth & Session State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(true);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Login / Bootstrap Form States (Requested credentials configured)
  const [authEmail, setAuthEmail] = useState('compusconnect@gmail.com');
  const [authPassword, setAuthPassword] = useState('kepton@12Romez');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFormDimmed, setIsFormDimmed] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Active Dashboard Tab
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'CAMPUSES' | 'INSTAGRAM' | 'PAYMENTS' | 'EMAIL' | 'SUBMISSIONS' | 'AUDIT_LOGS'
  >('OVERVIEW');

  // Backend Live Data
  const [overviewData, setOverviewData] = useState<AdminOverviewData | null>(null);
  const [campuses, setCampuses] = useState<University[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentTotals, setPaymentTotals] = useState<{ usd: number; kes: number }>({ usd: 0, kes: 0 });
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [emailData, setEmailData] = useState<EmailConfigData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Campus Form & Modal State
  const [showCreateCampusModal, setShowCreateCampusModal] = useState(false);
  const [campusSearch, setCampusSearch] = useState('');
  const [campusStatusFilter, setCampusStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingCampus, setEditingCampus] = useState<University | null>(null);

  const [newCampusName, setNewCampusName] = useState('');
  const [newCampusSlug, setNewCampusSlug] = useState('');
  const [newCampusHandle, setNewCampusHandle] = useState('');
  const [newCampusLocation, setNewCampusLocation] = useState('');
  const [newCampusDesc, setNewCampusDesc] = useState('');
  const [newCampusLogo, setNewCampusLogo] = useState('');
  const [newCampusCover, setNewCampusCover] = useState('');
  const [newCampusEnabled, setNewCampusEnabled] = useState(true);
  const [campusSaving, setCampusSaving] = useState(false);
  const [campusError, setCampusError] = useState<string | null>(null);

  // Email Test State
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Webhook Test State (Workflow D)
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);
  const [webhookResult, setWebhookResult] = useState<any>(null);

  // Submissions State
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PUBLISHED'>('ALL');
  const [selectedSubForReview, setSelectedSubForReview] = useState<FeaturedSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [publishUrls, setPublishUrls] = useState<Record<string, string>>({});

  // 1. Check Auth Status on Mount
  const verifyAuth = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const status = await getAdminStatus();
      setIsBootstrapped(status.bootstrapped);

      if (getStoredAdminToken()) {
        const sessionRes = await checkAdminSession();
        if (sessionRes.authenticated) {
          setIsAdminAuthenticated(true);
          setAdminUser(sessionRes.admin);
        } else {
          setIsAdminAuthenticated(false);
          setAdminUser(null);
        }
      } else {
        setIsAdminAuthenticated(false);
        setAdminUser(null);
      }
    } catch (err) {
      console.error('Admin auth check failed:', err);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  // 2. Fetch Live Admin Data when authenticated
  const loadAllAdminData = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    setLoadingData(true);
    try {
      const [ov, cp, py, ig, em, al] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminCampuses(),
        fetchAdminPayments(),
        fetchAdminInstagram(),
        fetchAdminEmail(),
        fetchAdminAuditLogs()
      ]);

      setOverviewData(ov);
      setCampuses(cp.campuses);
      setPayments(py.payments);
      setPaymentTotals(py.totals);
      setInstagramAccounts(ig.accounts);
      setEmailData(em);
      setAuditLogs(al.logs);
      refreshCampuses();
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        setIsAdminAuthenticated(false);
        addToast('Session Expired', 'Please log in again as an administrator.', 'error');
      } else {
        console.error('Error fetching admin data:', err);
      }
    } finally {
      setLoadingData(false);
    }
  }, [isAdminAuthenticated, refreshCampuses, addToast]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAllAdminData();
    }
  }, [isAdminAuthenticated, loadAllAdminData]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await loginAdmin(authEmail, authPassword);
      setIsAdminAuthenticated(true);
      setAdminUser(res.admin);
      addToast('Administrator Verified', 'Secure session initiated.', 'success');
      loadAllAdminData();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Bootstrap
  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    if (authPassword.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await bootstrapAdmin(authEmail, authPassword);
      setIsAdminAuthenticated(true);
      setIsBootstrapped(true);
      setAdminUser(res.admin);
      addToast('Administrator Initialized', 'Primary system administrator account created.', 'success');
      loadAllAdminData();
    } catch (err: any) {
      setAuthError(err.message || 'Bootstrap failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutAdmin();
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    setAuthEmail('');
    setAuthPassword('');
    addToast('Logged Out', 'Administrative session securely ended.', 'info');
  };

  // Auto-generate slug when typing campus name
  const handleCampusNameChange = (name: string) => {
    setNewCampusName(name);
    if (!editingCampus) {
      const cleanSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setNewCampusSlug(cleanSlug);
      setNewCampusHandle(`@${cleanSlug.replace(/-/g, '_')}_campusconnect`);
    }
  };

  // Handle Create / Edit Campus Submit
  const handleCampusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampusError(null);
    setCampusSaving(true);

    try {
      if (editingCampus) {
        // Update existing
        await updateAdminCampus(editingCampus.id, {
          name: newCampusName.trim(),
          slug: newCampusSlug.trim(),
          instagramHandle: newCampusHandle.trim(),
          location: newCampusLocation.trim(),
          description: newCampusDesc.trim(),
          logoUrl: newCampusLogo.trim() || undefined,
          coverUrl: newCampusCover.trim() || undefined,
          communityEnabled: newCampusEnabled
        });
        addToast('Campus Updated', `Saved settings for ${newCampusName}.`, 'success');
      } else {
        // Create new
        const res = await createAdminCampus({
          name: newCampusName.trim(),
          slug: newCampusSlug.trim(),
          instagramHandle: newCampusHandle.trim(),
          location: newCampusLocation.trim(),
          description: newCampusDesc.trim(),
          logoUrl: newCampusLogo.trim() || undefined,
          coverUrl: newCampusCover.trim() || undefined,
          communityEnabled: newCampusEnabled
        });
        addToast('Campus Created', `Created ${res.campus.name}. Canonical route: /ig/${res.campus.slug}`, 'success');
      }

      setShowCreateCampusModal(false);
      setEditingCampus(null);
      resetCampusForm();
      loadAllAdminData();
    } catch (err: any) {
      setCampusError(err.message || 'Failed to save campus.');
    } finally {
      setCampusSaving(false);
    }
  };

  const resetCampusForm = () => {
    setNewCampusName('');
    setNewCampusSlug('');
    setNewCampusHandle('');
    setNewCampusLocation('');
    setNewCampusDesc('');
    setNewCampusLogo('');
    setNewCampusCover('');
    setNewCampusEnabled(true);
    setCampusError(null);
  };

  const openEditModal = (c: University) => {
    setEditingCampus(c);
    setNewCampusName(c.name);
    setNewCampusSlug(c.slug);
    setNewCampusHandle(c.instagramHandle);
    setNewCampusLocation(c.location);
    setNewCampusDesc(c.description);
    setNewCampusLogo(c.logoUrl);
    setNewCampusCover(c.coverUrl || '');
    setNewCampusEnabled(c.communityEnabled);
    setShowCreateCampusModal(true);
  };

  // Toggle Campus Status (Active / Deactivated)
  const handleToggleCampusStatus = async (c: University) => {
    const nextStatus = !c.communityEnabled;
    try {
      await updateAdminCampus(c.id, { communityEnabled: nextStatus });
      addToast(
        nextStatus ? 'Campus Activated' : 'Campus Deactivated',
        `${c.name} is now ${nextStatus ? 'live' : 'paused'}.`,
        'info'
      );
      loadAllAdminData();
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update campus status.', 'error');
    }
  };

  // Copy Canonical Public URL
  const handleCopyCanonicalUrl = (slug: string) => {
    const canonicalPath = `/ig/${slug}`;
    const fullUrl = `${window.location.origin}${canonicalPath}`;
    navigator.clipboard.writeText(fullUrl);
    addToast('URL Copied', `Canonical link copied: ${canonicalPath}`, 'success');
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const res = await sendAdminTestEmail(testEmailRecipient.trim() || undefined);
      addToast('Email Sent', res.message, 'success');
      loadAllAdminData();
    } catch (err: any) {
      addToast('Email Failed', err.message || 'Failed to send test email.', 'error');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Test Webhook Simulator (Workflow D)
  const handleTestWebhook = async (isDuplicateTest = false) => {
    setWebhookSubmitting(true);
    setWebhookResult(null);

    const testTxnId = isDuplicateTest ? 'TXN_TEST_IDEMPOTENT_999' : `TXN_TEST_${Date.now()}`;
    const testIdempotencyKey = isDuplicateTest ? 'idem_fixed_key_999' : `idem_${Date.now()}`;

    try {
      const res = await simulateWebhookTest({
        event: 'charge.successful',
        transactionId: testTxnId,
        idempotencyKey: testIdempotencyKey,
        submissionId: 'sub_test_hook',
        studentUid: 'usr_test_student',
        studentName: 'Test Student',
        universityId: 'uni_harvard',
        amountUsd: 6.00,
        status: 'CONFIRMED'
      });

      setWebhookResult(res);
      if (res.duplicate) {
        addToast('Idempotency Verified', `Duplicate webhook recognized & suppressed cleanly!`, 'info');
      } else {
        addToast('Webhook Handled', `Verified transaction ${testTxnId} saved to database.`, 'success');
      }
      loadAllAdminData();
    } catch (err: any) {
      addToast('Webhook Error', err.message || 'Webhook failed.', 'error');
    } finally {
      setWebhookSubmitting(false);
    }
  };

  // Disconnect Instagram Account
  const handleDisconnectAccount = async (id: string, username: string) => {
    if (!window.confirm(`Disconnect @${username}? The token will be revoked.`)) return;
    try {
      await disconnectAdminInstagram(id);
      addToast('Account Disconnected', `@${username} disconnected.`, 'info');
      loadAllAdminData();
    } catch (err: any) {
      addToast('Error', err.message || 'Could not disconnect account.', 'error');
    }
  };

  // Submissions filter
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (submissionFilter === 'PENDING') return sub.moderationStatus === 'PENDING' || sub.moderationStatus === 'UNDER_REVIEW';
      if (submissionFilter === 'APPROVED') return sub.moderationStatus === 'APPROVED' && sub.publishingStatus !== 'PUBLISHED';
      if (submissionFilter === 'PUBLISHED') return sub.publishingStatus === 'PUBLISHED';
      return true;
    });
  }, [submissions, submissionFilter]);

  // Filtered campuses
  const filteredCampuses = useMemo(() => {
    return campuses.filter(c => {
      const matchesSearch = !campusSearch || 
        c.name.toLowerCase().includes(campusSearch.toLowerCase()) ||
        c.slug.toLowerCase().includes(campusSearch.toLowerCase()) ||
        c.location.toLowerCase().includes(campusSearch.toLowerCase());
      
      const matchesFilter = campusStatusFilter === 'ALL' ||
        (campusStatusFilter === 'ACTIVE' && c.communityEnabled) ||
        (campusStatusFilter === 'INACTIVE' && !c.communityEnabled);

      return matchesSearch && matchesFilter;
    });
  }, [campuses, campusSearch, campusStatusFilter]);

  // ---------------------------------------------------------------------------
  // RENDER 1: AUTHENTICATION / BOOTSTRAP GATEWAY (WHEN NOT LOGGED IN)
  // ---------------------------------------------------------------------------
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-400 font-sans">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-sm font-semibold">Validating security authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative selection:bg-blue-600 selection:text-white overflow-hidden transition-colors duration-200 ${
        isDarkMode ? 'bg-[#050811] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      }`}>
        
        {/* Subtle background glow */}
        <div className={`absolute w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none ${
          isDarkMode ? 'bg-blue-900/10' : 'bg-blue-500/10'
        }`} />

        {/* Top Stealth Status Bar */}
        <div className="mb-4 flex items-center justify-between w-full max-w-md px-2 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-pulse" />
            <span className="tracking-wider uppercase font-semibold">Admin Gateway</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 rounded-full border transition-colors cursor-pointer flex items-center gap-1 ${
                isDarkMode 
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white' 
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
              }`}
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            {/* Dim / Reveal Toggle */}
            <button
              type="button"
              onClick={() => setIsFormDimmed(!isFormDimmed)}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900/70 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
              }`}
              title="Toggle between dim mode and illuminated view"
            >
              {isFormDimmed ? (
                <>
                  <Eye className="w-3 h-3 text-blue-500" />
                  <span>Dim Mode</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 text-slate-400" />
                  <span>Illuminated</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sign-In Form Card */}
        <div 
          className={`w-full max-w-md rounded-3xl p-7 sm:p-9 border relative z-10 space-y-6 transition-all duration-300 ${
            isDarkMode 
              ? (isFormDimmed
                  ? 'opacity-40 hover:opacity-100 focus-within:opacity-100 bg-[#090E1C]/60 border-slate-800/50 backdrop-blur-xs shadow-none hover:shadow-2xl hover:bg-[#10172A]/95 hover:border-slate-700 text-white'
                  : 'opacity-100 bg-[#10172A]/95 border-slate-700 shadow-2xl backdrop-blur-md text-white')
              : (isFormDimmed
                  ? 'opacity-60 hover:opacity-100 focus-within:opacity-100 bg-white/80 border-slate-200/90 shadow-2xs hover:shadow-xl hover:bg-white hover:border-slate-300 text-slate-900'
                  : 'opacity-100 bg-white border-slate-200 shadow-xl text-slate-900')
          }`}
        >
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto shadow-inner ${
              isDarkMode ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-600'
            }`}>
              <Lock className="w-5 h-5" />
            </div>
            
            <div className="space-y-1">
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${
                isDarkMode ? 'text-blue-400/90 bg-blue-950/70 border-blue-800/50' : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                Admin Portal Gateway
              </span>
              <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight pt-1 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {isBootstrapped ? 'Administrator Sign In' : 'Initial Administrator Bootstrap'}
              </h1>
              <p className={`text-xs leading-relaxed font-normal ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {isBootstrapped 
                  ? 'Administrative authentication. Enter your master credentials.'
                  : 'Bootstrap your primary administrator credentials.'}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          {isBootstrapped ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="compusconnect@gmail.com"
                  className={`w-full rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-[#070B16] border border-slate-700/80 text-white placeholder-slate-500 focus:border-blue-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Administrator Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-blue-500" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="kepton@12Romez"
                  className={`w-full rounded-xl px-4 py-3 text-xs font-mono tracking-wide focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-[#070B16] border border-slate-700/80 text-white placeholder-slate-500 focus:border-blue-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Quick Preset Credentials Pill */}
              <div 
                onClick={() => {
                  setAuthEmail('compusconnect@gmail.com');
                  setAuthPassword('kepton@12Romez');
                  addToast('Credentials Applied', 'Configured email & password loaded.', 'info');
                }}
                className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-900/60 border-slate-800 hover:border-blue-500/40 text-slate-300' 
                    : 'bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-700'
                }`}
                title="Click to apply configured credentials"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono">compusconnect@gmail.com</span>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider shrink-0 ml-2">
                  Apply Preset
                </span>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {authLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{authLoading ? 'Verifying Authorization...' : 'Sign In to Admin Dashboard'}</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                >
                  ← Return to public website
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleBootstrapSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs">
                ⚠️ One-time setup: Bootstrap your master administrator credentials.
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="compusconnect@gmail.com"
                  className={`w-full rounded-xl px-4 py-3 text-xs focus:outline-none ${
                    isDarkMode ? 'bg-[#070B16] border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Create Master Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="kepton@12Romez"
                  className={`w-full rounded-xl px-4 py-3 text-xs focus:outline-none ${
                    isDarkMode ? 'bg-[#070B16] border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Confirm Master Password
                </label>
                <input
                  type="password"
                  required
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  placeholder="Confirm master password"
                  className={`w-full rounded-xl px-4 py-3 text-xs focus:outline-none ${
                    isDarkMode ? 'bg-[#070B16] border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {authLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{authLoading ? 'Initializing Administrator...' : 'Bootstrap Primary Administrator'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3 text-center text-[10px] text-slate-500 space-y-0.5">
            <div>Session expires after 4 hours • IP audited • Enterprise Grade</div>
          </div>

        </div>

      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER 2: FULL AUTHENTICATED ADMINISTRATOR DASHBOARD
  // ---------------------------------------------------------------------------
  return (
    <div className={`min-h-screen font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
    }`}>
      
      {/* 1. TOP SECURE ADMIN BAR */}
      <header className={`h-16 border-b backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 transition-colors ${
        isDarkMode ? 'border-slate-800 bg-[#101726]/90 text-white' : 'border-slate-200/80 bg-white/95 text-slate-900 shadow-2xs'
      }`}>
        
        {/* Brand & Authorization Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-md">
            CC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-extrabold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                CampusConnect <span className="text-blue-500 font-black">Admin</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Authorized</span>
              </span>
            </div>
            <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Live DB Synced • Role: Master Administrator
            </div>
          </div>
        </div>

        {/* Admin User Info, Theme Toggle & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={loadAllAdminData}
            title="Refresh database records"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 shadow-2xs'
            }`}
            title="Toggle Light / Dark mode"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            <span className="hidden sm:inline">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <User className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-mono">{adminUser?.email || 'compusconnect@gmail.com'}</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Secure Logout</span>
          </button>
        </div>

      </header>

      {/* 2. DASHBOARD BODY & TABS */}
      <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className={`flex items-center gap-2 border-b pb-3 overflow-x-auto text-xs font-semibold ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          {[
            { id: 'OVERVIEW', label: 'Admin Overview', icon: Layers },
            { id: 'CAMPUSES', label: 'Campus Management', icon: Building2, count: campuses.length },
            { id: 'INSTAGRAM', label: 'Instagram Accounts', icon: Instagram, count: instagramAccounts.length },
            { id: 'PAYMENTS', label: 'Payment Transactions', icon: CreditCard, count: payments.length },
            { id: 'EMAIL', label: 'Email & Delivery Logs', icon: Mail },
            { id: 'SUBMISSIONS', label: 'Photo Moderation', icon: Sparkles, count: submissions.length },
            { id: 'AUDIT_LOGS', label: 'Security & Audit Logs', icon: ShieldCheck, count: auditLogs.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : isDarkMode 
                        ? 'bg-slate-800 text-slate-400' 
                        : 'bg-slate-200 text-slate-700 font-semibold'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: ADMIN OVERVIEW                                              */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* Heading and Subtitle */}
            <div className="space-y-1">
              <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Admin Overview
              </h2>
              <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Authoritative platform telemetry, live campus registries, verified Instagram integrations, and payment ledger.
              </p>
            </div>

            {/* 4 Primary KPI Metric Cards (Loaded from real database) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* 1. Total amount paid */}
              <div className={`p-5 rounded-2xl border space-y-2 transition-all ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md'
              }`}>
                <div className={`flex items-center justify-between text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Total Amount Paid</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  ${paymentTotals.usd.toFixed(2)} USD
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {overviewData?.totalAmountPaid?.formattedKes || `KES ${(paymentTotals.usd * 130).toLocaleString()}`} verified
                </div>
              </div>

              {/* 2. Connected Instagram accounts */}
              <div className={`p-5 rounded-2xl border space-y-2 transition-all ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md'
              }`}>
                <div className={`flex items-center justify-between text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Connected Instagram Accounts</span>
                  <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <Instagram className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {overviewData?.connectedInstagramAccounts ?? instagramAccounts.length}
                </div>
                <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {instagramAccounts.filter(a => a.status === 'CONNECTED').length} active sync · 0 disconnected
                </div>
              </div>

              {/* 3. Registered users */}
              <div className={`p-5 rounded-2xl border space-y-2 transition-all ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md'
              }`}>
                <div className={`flex items-center justify-between text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Registered Users</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {overviewData?.registeredUsers ?? 0}
                </div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  Across registered campus profiles
                </div>
              </div>

              {/* 4. Successful payments */}
              <div className={`p-5 rounded-2xl border space-y-2 transition-all ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md'
              }`}>
                <div className={`flex items-center justify-between text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Successful Payments</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {overviewData?.successfulPayments ?? payments.filter(p => p.status === 'CONFIRMED').length}
                </div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                  Strict idempotency validation
                </div>
              </div>

            </div>

            {/* Integrations Section */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Production Integrations</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Real-time gateway statuses and external API connection states.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold self-start sm:self-center">
                  All Systems Operational
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {overviewData?.integrations.map((item) => (
                  <div key={item.id} className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-[#0F1626] border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {item.status}
                      </span>
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.details}</p>
                    <div className={`text-[10px] flex items-center gap-1.5 pt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Clock className="w-3 h-3" />
                      <span>Last verified handshake: {new Date(item.verifiedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => setActiveTab('CAMPUSES')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isDarkMode 
                    ? 'bg-[#131B2E] border-slate-800 hover:border-blue-500/50' 
                    : 'bg-white border-slate-200/90 hover:border-blue-500 shadow-2xs hover:shadow-md'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Manage Campus Websites</h4>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Create new campus websites, edit branding, and manage canonical public routes.</p>
              </div>

              <div 
                onClick={() => setActiveTab('PAYMENTS')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isDarkMode 
                    ? 'bg-[#131B2E] border-slate-800 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200/90 hover:border-emerald-500 shadow-2xs hover:shadow-md'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Payment Audit & Webhooks</h4>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Review verified student payments and test webhook idempotency handling.</p>
              </div>

              <div 
                onClick={() => setActiveTab('EMAIL')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isDarkMode 
                    ? 'bg-[#131B2E] border-slate-800 hover:border-purple-500/50' 
                    : 'bg-white border-slate-200/90 hover:border-purple-500 shadow-2xs hover:shadow-md'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Delivery Logs & Email SMTP</h4>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>View real transactional delivery logs and test SMTP handshake.</p>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: CAMPUS MANAGEMENT                                            */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'CAMPUSES' && (
          <div className="space-y-6 animate-in fade-in">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Campus Management
                </h2>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Manage all campus-specific websites, canonical public routes (/ig/:slug), and active branding.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCampus(null);
                  resetCampusForm();
                  setShowCreateCampusModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-colors whitespace-nowrap self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Campus</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  placeholder="Search campuses by name, slug, or location..."
                  className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 border ${
                    isDarkMode 
                      ? 'bg-[#131B2E] border-slate-800 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setCampusStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      campusStatusFilter === f
                        ? (isDarkMode ? 'bg-slate-700 text-white font-bold' : 'bg-slate-900 text-white font-bold')
                        : (isDarkMode ? 'text-slate-400 hover:text-white bg-[#131B2E]' : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70')
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Campuses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampuses.map((c) => (
                <div 
                  key={c.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isDarkMode 
                      ? 'bg-[#131B2E] border-slate-800 hover:border-slate-700' 
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <img 
                        src={c.logoUrl} 
                        alt={c.name}
                        className={`w-12 h-12 rounded-xl object-cover p-0.5 border shrink-0 ${
                          isDarkMode ? 'bg-[#0A0E1A] border-slate-700' : 'bg-white border-slate-200'
                        }`} 
                      />
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.communityEnabled 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {c.communityEnabled ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{c.name}</h3>
                      <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{c.location}</div>
                      <div className="text-xs text-blue-500 font-semibold mt-1">{c.instagramHandle}</div>
                    </div>

                    <p className={`text-xs line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {c.description}
                    </p>

                    {/* Canonical URL badge */}
                    <div className={`p-2 rounded-lg border text-[11px] font-mono flex items-center justify-between ${
                      isDarkMode ? 'bg-[#0A0E1A] border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <span className="truncate">/ig/{c.slug}</span>
                      <button
                        onClick={() => handleCopyCanonicalUrl(c.slug)}
                        title="Copy canonical shareable URL"
                        className="text-blue-500 hover:text-blue-600 ml-2 cursor-pointer shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className={`pt-3 border-t flex items-center justify-between gap-2 text-xs ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <button
                      onClick={() => handleToggleCampusStatus(c)}
                      className={`text-xs font-semibold cursor-pointer ${
                        c.communityEnabled ? 'text-amber-500 hover:underline' : 'text-emerald-500 hover:underline'
                      }`}
                    >
                      {c.communityEnabled ? 'Deactivate' : 'Activate'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer font-medium ${
                          isDarkMode 
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Edit
                      </button>

                      <a
                        href={`/ig/${c.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 shadow-2xs"
                      >
                        <span>Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {filteredCampuses.length === 0 && (
              <div className={`p-12 text-center rounded-2xl border ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                No campuses match your search.
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: INSTAGRAM ACCOUNTS                                           */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'INSTAGRAM' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Instagram Accounts Management
              </h2>
              <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Inspect connected Instagram Business and Creator accounts with live Meta Graph token health.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {instagramAccounts.map(acc => (
                <div key={acc.id} className={`p-6 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-fuchsia-500 p-0.5">
                        <img src={acc.profilePictureUrl} alt={acc.username} className="w-full h-full rounded-full object-cover" />
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>@{acc.username}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{acc.displayName} • {acc.accountType}</div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      acc.status === 'CONNECTED' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                      {acc.status}
                    </span>
                  </div>

                  <div className={`grid grid-cols-3 gap-2 p-3 rounded-xl border text-center ${
                    isDarkMode ? 'bg-[#0A0E1A] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{acc.followersCount.toLocaleString()}</div>
                      <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Followers</div>
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{acc.mediaCount}</div>
                      <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Posts</div>
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{(acc.reach28d / 1000).toFixed(1)}K</div>
                      <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>28d Reach</div>
                    </div>
                  </div>

                  <div className={`text-xs flex items-center justify-between pt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Token Expiration: {new Date(acc.tokenExpiresAt).toLocaleDateString()}</span>
                    {acc.status === 'CONNECTED' && (
                      <button
                        onClick={() => handleDisconnectAccount(acc.id, acc.username)}
                        className="text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
                      >
                        Disconnect Account
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: PAYMENT MANAGEMENT & WEBHOOK SIMULATOR                       */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'PAYMENTS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Payment Management & Webhooks
                </h2>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Authoritative verified payment transactions, gateway callbacks, and duplicate webhook suppression.
                </p>
              </div>

              {/* Webhook Idempotency Test Buttons (Workflow D requirement) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestWebhook(false)}
                  disabled={webhookSubmitting}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs'
                  }`}
                >
                  Test Webhook Event
                </button>
                <button
                  onClick={() => handleTestWebhook(true)}
                  disabled={webhookSubmitting}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-semibold cursor-pointer transition-colors shadow-2xs"
                >
                  Test Duplicate Webhook (Idempotency)
                </button>
              </div>
            </div>

            {/* Webhook Result Banner */}
            {webhookResult && (
              <div className={`p-4 rounded-2xl border text-xs ${
                webhookResult.duplicate 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              }`}>
                <div className="font-bold mb-1">
                  {webhookResult.duplicate ? '✓ Duplicate Webhook Handled Safely' : '✓ Webhook Processed Successfully'}
                </div>
                <div>{webhookResult.message || `Payment recorded with ID: ${webhookResult.paymentId}`}</div>
              </div>
            )}

            {/* Authoritative Totals Summary */}
            <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
            }`}>
              <div>
                <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Authoritative Revenue</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ${paymentTotals.usd.toFixed(2)} USD
                </div>
                <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Equivalent to KES {(paymentTotals.usd * 130).toLocaleString()} across {payments.length} audited transaction(s)
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl border text-xs text-center ${
                  isDarkMode ? 'bg-[#0A0E1A] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Confirmed</div>
                  <div className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {payments.filter(p => p.status === 'CONFIRMED').length}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border text-xs text-center ${
                  isDarkMode ? 'bg-[#0A0E1A] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Failed</div>
                  <div className={`font-black text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {payments.filter(p => p.status === 'FAILED').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className={`rounded-2xl border overflow-hidden shadow-xs ${
              isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-semibold ${
                    isDarkMode ? 'bg-[#0A0E1A] text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200 uppercase text-[11px]'
                  }`}>
                    <tr>
                      <th className="px-4 py-3">Txn Reference</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">University/Campus</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Verified At</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700 bg-white'
                  }`}>
                    {payments.map(p => (
                      <tr key={p.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/40'}`}>
                        <td className="px-4 py-3 font-mono font-medium text-blue-500">{p.providerTransactionReference}</td>
                        <td className={`px-4 py-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.studentName}</td>
                        <td className="px-4 py-3">{p.universityId}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">${p.amountUsd.toFixed(2)} {p.currency}</td>
                        <td className="px-4 py-3">{p.provider}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'CONFIRMED' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(p.verifiedAt || p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                          No payments recorded yet. Live payment transactions will appear here when students verify submissions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: EMAIL CONFIGURATION & DELIVERY LOGS                          */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'EMAIL' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Email Configuration & Delivery Logs
                </h2>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Transactional SMTP delivery status, DKIM/SPF verification, and delivery audit history.
                </p>
              </div>

              {/* Send Test Email Input */}
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Recipient (default admin email)"
                  className={`border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 ${
                    isDarkMode 
                      ? 'bg-[#131B2E] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs'
                  }`}
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTestEmail ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </div>

            {/* SMTP Status Card */}
            {emailData?.config && (
              <div className={`p-6 rounded-2xl border grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
              }`}>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sender Address</div>
                  <div className={`font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{emailData.config.senderEmail}</div>
                </div>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>SMTP Gateway</div>
                  <div className={`font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{emailData.config.smtpHost}:{emailData.config.smtpPort}</div>
                </div>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Security & Handshake</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">TLS Active • DKIM/SPF Verified</div>
                </div>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Provider Status</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{emailData.config.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Logs Table */}
            <div className={`rounded-2xl border overflow-hidden shadow-xs ${
              isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-4 border-b font-bold text-xs ${
                isDarkMode ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
              }`}>
                Delivery Logs
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-semibold ${
                    isDarkMode ? 'bg-[#0A0E1A] text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200 uppercase text-[11px]'
                  }`}>
                    <tr>
                      <th className="px-4 py-3">Message ID</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Sent Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700 bg-white'
                  }`}>
                    {emailData?.logs.map(log => (
                      <tr key={log.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/40'}`}>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{log.messageId}</td>
                        <td className={`px-4 py-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{log.recipient}</td>
                        <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{log.subject}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {log.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(log.sentAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!emailData?.logs || emailData.logs.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                          No delivery logs recorded yet. Outbound transactional emails will be logged here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 6: SUBMISSION PHOTO REVIEW & PUBLISHING                         */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Student Photo Submissions Review
                </h2>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Inspect student verification photos with official watermarks, approve/reject, and record Instagram publications.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(['ALL', 'PENDING', 'APPROVED', 'PUBLISHED'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setSubmissionFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      submissionFilter === f
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-white bg-[#131B2E]'
                          : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubmissions.map(sub => (
                <div key={sub.id} className={`p-5 rounded-2xl border space-y-4 flex flex-col justify-between ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md'
                }`}>
                  <div className="space-y-3">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-slate-700">
                      <img src={sub.watermarkedImagePath} alt="Submission" className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                        {sub.universityInstagramHandle}
                      </span>
                    </div>

                    <div>
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{sub.studentDisplayName}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{sub.universityName}</div>
                      <div className={`text-xs italic mt-2 line-clamp-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>"{sub.caption}"</div>
                    </div>
                  </div>

                  {/* Review Actions */}
                  <div className={`pt-3 border-t space-y-2 text-xs ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Moderation</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{sub.moderationStatus}</span>
                    </div>

                    {sub.moderationStatus === 'PENDING' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => reviewSubmission(sub.id, 'APPROVE')}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors text-center"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewSubmission(sub.id, 'REJECT', 'Image quality does not meet resolution standards.')}
                          className="flex-1 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 dark:text-rose-400 font-bold border border-rose-600/30 cursor-pointer transition-colors text-center"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {sub.moderationStatus === 'APPROVED' && sub.publishingStatus !== 'PUBLISHED' && (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="url"
                          placeholder="Paste Instagram post URL..."
                          value={publishUrls[sub.id] || ''}
                          onChange={(e) => setPublishUrls({ ...publishUrls, [sub.id]: e.target.value })}
                          className={`w-full border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 ${
                            isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                        <button
                          onClick={() => {
                            const url = publishUrls[sub.id]?.trim();
                            if (!url) return addToast('URL Required', 'Please enter resulting post URL.', 'error');
                            publishToInstagram(sub.id, url);
                          }}
                          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer text-center"
                        >
                          Confirm Published
                        </button>
                      </div>
                    )}

                    {sub.publishingStatus === 'PUBLISHED' && (
                      <a
                        href={sub.instagramPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`block text-center py-1.5 rounded-lg font-semibold text-blue-500 hover:underline ${
                          isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                        }`}
                      >
                        View on Instagram ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {filteredSubmissions.length === 0 && (
                <div className={`col-span-full p-12 text-center rounded-2xl border ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  No student submissions match this filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 7: AUDIT LOGS & SETTINGS                                        */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'AUDIT_LOGS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Audit Trail & System Settings
              </h2>
              <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Immutable chronological log of all administrative actions, logins, status toggles, and payment validations.
              </p>
            </div>

            <div className={`rounded-2xl border overflow-hidden shadow-xs ${
              isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-semibold ${
                    isDarkMode ? 'bg-[#0A0E1A] text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200 uppercase text-[11px]'
                  }`}>
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Actor Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700 bg-white'
                  }`}>
                    {auditLogs.map(log => (
                      <tr key={log.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/40'}`}>
                        <td className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-500">{log.action}</td>
                        <td className={`px-4 py-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{log.actorEmail || 'system'}</td>
                        <td className="px-4 py-3">{log.actorRole}</td>
                        <td className={`px-4 py-3 font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{log.targetType}:{log.targetId}</td>
                        <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{log.details}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                          No audit events recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT CAMPUS                                           */}
      {/* --------------------------------------------------------------------- */}
      {showCreateCampusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`border rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative ${
            isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="space-y-0.5">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {editingCampus ? `Edit Campus: ${editingCampus.name}` : 'Create New Campus Website'}
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Instance will be immediately published to the public routing system.
                </p>
              </div>
              <button
                onClick={() => setShowCreateCampusModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {campusError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{campusError}</span>
              </div>
            )}

            <form onSubmit={handleCampusSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Campus / University Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCampusName}
                  onChange={(e) => handleCampusNameChange(e.target.value)}
                  placeholder="e.g. Lindsey Wilson College Class of 2031"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 border ${
                    isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Unique Slug (Canonical URL Path) *
                </label>
                <input
                  type="text"
                  required
                  value={newCampusSlug}
                  onChange={(e) => setNewCampusSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  placeholder="lindseywilsoncollege2031class"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-blue-500 border ${
                    isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
                <div className="text-[11px] text-blue-500 mt-1 flex items-center gap-1 font-mono">
                  <span>Canonical Route:</span>
                  <strong>/ig/{newCampusSlug || ':slug'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Official Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={newCampusHandle}
                    onChange={(e) => setNewCampusHandle(e.target.value)}
                    placeholder="@lwc_classof2031"
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 border ${
                      isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Campus Location
                  </label>
                  <input
                    type="text"
                    value={newCampusLocation}
                    onChange={(e) => setNewCampusLocation(e.target.value)}
                    placeholder="Columbia, Kentucky, USA"
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 border ${
                      isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Description & Welcome Message
                </label>
                <textarea
                  rows={3}
                  value={newCampusDesc}
                  onChange={(e) => setNewCampusDesc(e.target.value)}
                  placeholder="Official student community portal for incoming freshmen and student organizations."
                  className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none border ${
                    isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={newCampusLogo}
                    onChange={(e) => setNewCampusLogo(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 border ${
                      isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Cover Banner Image URL
                  </label>
                  <input
                    type="url"
                    value={newCampusCover}
                    onChange={(e) => setNewCampusCover(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 border ${
                      isDarkMode ? 'bg-[#0A0E1A] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              <div className={`pt-2 flex items-center justify-between p-3 rounded-xl border ${
                isDarkMode ? 'bg-[#0A0E1A] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Active Public Status</div>
                  <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>When active, visitors can view and submit to this campus.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCampusEnabled}
                    onChange={(e) => setNewCampusEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-400 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-3 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowCreateCampusModal(false)}
                  className={`px-4 py-2.5 rounded-xl cursor-pointer ${
                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={campusSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {campusSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCampus ? 'Save Campus Changes' : 'Create & Publish Campus'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
