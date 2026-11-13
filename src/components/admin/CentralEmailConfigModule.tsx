import React, { useState, useMemo, useEffect } from 'react';
import { 
  CentralEmailConfig, 
  DetailedEmailLog, 
  University, 
  UniversityEmailIdentity,
  UniversityEmailEventType,
  ResendDomainStatus
} from '../../types';
import { 
  fetchCentralEmailConfig,
  updateCentralEmailConfig, 
  sendTestUniversityEmail,
  fetchAllUniversityEmailIdentities,
  retryEmailLog
} from '../../lib/adminApi';
import { 
  Mail, 
  Check, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Eye, 
  Key, 
  Server, 
  Building2,
  ExternalLink,
  Palette,
  FileText,
  Sparkles,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

interface CentralEmailConfigModuleProps {
  initialConfig: CentralEmailConfig;
  initialResendStatus?: ResendDomainStatus;
  logs: DetailedEmailLog[];
  campuses: University[];
  onRefresh: () => void;
  onInspectLog: (log: DetailedEmailLog) => void;
  onOpenCampusEmail?: (campus: University) => void;
  onToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  isDarkMode?: boolean;
}

const PROVIDERS: Array<{ id: CentralEmailConfig['provider']; name: string; type: 'SMTP' | 'API' }> = [
  { id: 'SMTP', name: 'Custom SMTP Relay Server', type: 'SMTP' },
  { id: 'MAILGUN', name: 'Mailgun Transactional API', type: 'API' },
  { id: 'SENDGRID', name: 'SendGrid Web API v3', type: 'API' },
  { id: 'RESEND', name: 'Resend Modern Email API', type: 'API' },
  { id: 'POSTMARK', name: 'Postmark Transactional Engine', type: 'API' },
  { id: 'AWS_SES', name: 'Amazon Simple Email Service (SES)', type: 'API' },
  { id: 'BREVO', name: 'Brevo (formerly Sendinblue)', type: 'API' },
];

const EVENT_TYPES: Array<{ type: UniversityEmailEventType; label: string }> = [
  { type: 'WELCOME', label: 'Welcome to Campus' },
  { type: 'ACCOUNT_VERIFICATION', label: 'Email Verification' },
  { type: 'PASSWORD_RESET', label: 'Password Reset' },
  { type: 'PAYMENT_CONFIRMATION', label: 'Payment Receipt ($6.00)' },
  { type: 'PAYMENT_FAILURE', label: 'Payment Failure' },
  { type: 'SUBMISSION_RECEIVED', label: 'Submission Received' },
  { type: 'SUBMISSION_APPROVED', label: 'Submission Approved' },
  { type: 'SUBMISSION_REJECTED', label: 'Submission Rejected' },
  { type: 'INSTAGRAM_PUBLISHED', label: 'Published to Instagram' }
];

export const CentralEmailConfigModule: React.FC<CentralEmailConfigModuleProps> = ({
  initialConfig,
  initialResendStatus,
  logs,
  campuses,
  onRefresh,
  onInspectLog,
  onOpenCampusEmail,
  onToast,
  isDarkMode = false
}) => {
  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'INFRASTRUCTURE' | 'IDENTITIES' | 'LOGS'>('INFRASTRUCTURE');

  // Form State
  const [config, setConfig] = useState<CentralEmailConfig>(initialConfig);
  const [resendStatus, setResendStatus] = useState<ResendDomainStatus | undefined>(initialResendStatus);
  const [checkingDomains, setCheckingDomains] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // University Email Identities cache
  const [identities, setIdentities] = useState<Record<string, UniversityEmailIdentity>>({});
  const [loadingIdentities, setLoadingIdentities] = useState(false);

  // Campus Search & Filter in Identities Sub-tab
  const [campusSearch, setCampusSearch] = useState('');
  const [customFilter, setCustomFilter] = useState<'ALL' | 'CUSTOM' | 'DEFAULT'>('ALL');

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [testUniversityId, setTestUniversityId] = useState('general');
  const [testEventType, setTestEventType] = useState<UniversityEmailEventType>('WELCOME');
  const [sendingTest, setSendingTest] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Log Filtering & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterEvent, setFilterEvent] = useState('ALL');

  // Sync props changes
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  useEffect(() => {
    if (initialResendStatus) {
      setResendStatus(initialResendStatus);
    }
  }, [initialResendStatus]);

  const refreshDomainStatus = async (force = false) => {
    setCheckingDomains(true);
    try {
      const res = await fetchCentralEmailConfig(force);
      if (res.resendStatus) {
        setResendStatus(res.resendStatus);
      }
    } catch {
      // Keep current status on transient error
    } finally {
      setCheckingDomains(false);
    }
  };

  // Load university email identities from backend
  const loadIdentities = async () => {
    setLoadingIdentities(true);
    try {
      const res = await fetchAllUniversityEmailIdentities();
      if (res.identities && Array.isArray(res.identities)) {
        const map: Record<string, UniversityEmailIdentity> = {};
        res.identities.forEach(item => {
          if (item && item.universityId) {
            map[item.universityId] = item;
          }
        });
        setIdentities(map);
      }
    } catch {
      // Fallback silently
    } finally {
      setLoadingIdentities(false);
    }
  };

  useEffect(() => {
    loadIdentities();
    if (!initialResendStatus) {
      refreshDomainStatus(false);
    }
  }, []);

  // Handle Save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateCentralEmailConfig(config);
      setConfig(res.config);
      if (res.resendStatus) {
        setResendStatus(res.resendStatus);
      }
      if (res.config.provider === 'RESEND' && !res.resendStatus?.productionReady) {
        const notice = res.resendStatus?.mode === 'PRODUCTION'
          ? 'Settings saved with verified Resend domain. Send a live test to an external student address to confirm production readiness.'
          : 'Settings saved, but Resend is in Sandbox Mode until a custom domain is verified at resend.com/domains.';
        onToast('Email Configuration Saved', notice, 'info');
      } else {
        onToast('Email Infrastructure Saved', 'Central email configuration updated and operational.', 'success');
      }
      onRefresh();
      loadIdentities();
    } catch (err: any) {
      onToast('Save Failed', err.message || 'Could not update email configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Test Send
  const handleSendTest = async () => {
    if (!testRecipient) {
      onToast('Recipient Required', 'Please enter a valid recipient email.', 'error');
      return;
    }
    setSendingTest(true);
    try {
      const res = await sendTestUniversityEmail({
        recipient: testRecipient.trim(),
        universityId: testUniversityId,
        eventType: testEventType
      });
      if (res.resendStatus) {
        setResendStatus(res.resendStatus);
      }
      if (res.success === false) {
        onToast('Delivery Notice', res.message || 'Email delivery failed.', 'error');
      } else if (res.sandboxMode) {
        onToast('Sandbox Test Dispatched', res.message, 'info');
      } else {
        onToast('Test Email Dispatched', res.message, 'success');
      }
      onRefresh();
    } catch (err: any) {
      onToast('Dispatch Failed', err.message || 'Failed to dispatch test email.', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  // Handle Manual Retry for Queued / Failed / Bounced Logs
  const handleRetryLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await retryEmailLog(logId);
      if (res.resendStatus) {
        setResendStatus(res.resendStatus);
      }
      onToast(
        res.success ? 'Retry Dispatched' : 'Retry Notice',
        res.message || (res.success ? 'Email re-dispatched successfully.' : 'Retry did not complete delivery.'),
        res.success ? 'success' : 'error'
      );
      onRefresh();
    } catch (err: any) {
      onToast('Retry Failed', err.message || 'Could not retry email delivery.', 'error');
    } finally {
      setRetryingLogId(null);
    }
  };

  // Quick setup test send for a specific campus
  const handleQuickTestCampus = (campusId: string) => {
    setTestUniversityId(campusId);
    setActiveSubTab('INFRASTRUCTURE');
    // Scroll smoothly to sandbox
    const sandboxEl = document.getElementById('live-dispatch-sandbox');
    if (sandboxEl) {
      sandboxEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = logs.length;
    const delivered = logs.filter(l => l.status === 'DELIVERED').length;
    const queued = logs.filter(l => l.status === 'QUEUED').length;
    const failed = logs.filter(l => l.status === 'FAILED' || l.status === 'BOUNCED').length;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100;
    return { total, delivered, queued, failed, deliveryRate };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        l.recipient.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.messageId.toLowerCase().includes(q) ||
        (l.universityName && l.universityName.toLowerCase().includes(q));

      const matchesUni = filterUniversity === 'ALL' || l.universityId === filterUniversity;
      const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
      const matchesEvent = filterEvent === 'ALL' || l.template === filterEvent;

      return matchesSearch && matchesUni && matchesStatus && matchesEvent;
    });
  }, [logs, searchQuery, filterUniversity, filterStatus, filterEvent]);

  // Filtered Campuses for Identities Tab
  const filteredCampuses = useMemo(() => {
    return campuses.filter(c => {
      const q = campusSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.instagramHandle.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q));

      const hasCustom = !!identities[c.id];
      if (customFilter === 'CUSTOM' && !hasCustom) return false;
      if (customFilter === 'DEFAULT' && hasCustom) return false;

      return matchesSearch;
    });
  }, [campuses, campusSearch, customFilter, identities]);

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Centralized Infrastructure
            </span>
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Delivery Engine ({campuses.length} Campuses)</span>
            </span>
          </div>
          <h2 className={`text-2xl font-black tracking-tight mt-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Email Infrastructure & University Management
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Single platform sending infrastructure supporting independent university sender identities, branded templates, and automated lifecycle notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onRefresh();
            loadIdentities();
            refreshDomainStatus(true);
          }}
          className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-center shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Engine</span>
        </button>
      </div>

      {/* 2. Top-level Sub-Navigation Switcher */}
      <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center gap-1.5 text-xs font-bold ${
        isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-100/80 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setActiveSubTab('INFRASTRUCTURE')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'INFRASTRUCTURE'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDarkMode 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Central Gateway & Setup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('IDENTITIES')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'IDENTITIES'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDarkMode 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>University Identities & Templates</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            activeSubTab === 'IDENTITIES'
              ? 'bg-white/20 text-white'
              : isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
          }`}>
            {campuses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('LOGS')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'LOGS'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDarkMode 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Delivery History & Logs</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            activeSubTab === 'LOGS'
              ? 'bg-white/20 text-white'
              : isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
          }`}>
            {logs.length}
          </span>
        </button>
      </div>

      {/* 3. Global Delivery Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sent</div>
          <div className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{metrics.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Platform-wide outbound emails</div>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Delivered</div>
          <div className={`text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400`}>
            {metrics.delivered} <span className="text-xs font-bold text-slate-400">({metrics.deliveryRate}%)</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">TLS 1.3 verified handshakes</div>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Queued</div>
          <div className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{metrics.queued}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting async worker processing</div>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Bounced / Failed</div>
          <div className={`text-2xl font-black mt-1 ${metrics.failed > 0 ? 'text-rose-500' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
            {metrics.failed}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rejected or suppressed deliveries</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SUB-TAB 1: CENTRAL INFRASTRUCTURE & GATEWAY CONFIGURATION           */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'INFRASTRUCTURE' && (
        <div className="space-y-6">
          
          {/* Central Email Configuration Form */}
          <div className={`rounded-3xl border overflow-hidden shadow-xs ${
            isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200/90'
          }`}>
            <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isDarkMode ? 'border-slate-800 bg-[#0F172A]' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Central Email Infrastructure Configuration
                  </h3>
                </div>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Single shared control point. All {campuses.length} university portals use this infrastructure to deliver student emails.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Global Sending:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sendingEnabled}
                    onChange={(e) => setConfig({ ...config, sendingEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-6">
              
              {/* Provider Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Email Gateway Provider</label>
                  <select
                    value={config.provider}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Sender Domain (DKIM/SPF Root)</label>
                  <input
                    type="text"
                    value={config.senderDomain}
                    onChange={(e) => setConfig({ ...config, senderDomain: e.target.value })}
                    required
                    placeholder="e.g. campusconnect.app"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Daily Dispatch Limit</label>
                  <input
                    type="number"
                    value={config.dailyLimit || 5000}
                    onChange={(e) => setConfig({ ...config, dailyLimit: parseInt(e.target.value, 10) || 5000 })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                </div>
              </div>

              {/* Sender Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Default Sender Display Name</label>
                  <input
                    type="text"
                    value={config.senderName}
                    onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                    required
                    placeholder="CampusConnect Global"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Default Sender Email</label>
                  <input
                    type="email"
                    value={config.senderEmail}
                    onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                    required
                    placeholder="notifications@campusconnect.app"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Default Reply-To Email</label>
                  <input
                    type="email"
                    value={config.replyTo || ''}
                    onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
                    placeholder="support@campusconnect.app"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                </div>
              </div>

              {/* Provider Credentials (SMTP vs API) */}
              {config.provider === 'SMTP' ? (
                <div className={`p-4 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-500" />
                    <span>SMTP Relay Server Authentication</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-500">SMTP Host</label>
                      <input
                        type="text"
                        value={config.smtpHost || ''}
                        onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                        placeholder="smtp.mailgun.org or smtp.sendgrid.net"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Port</label>
                      <input
                        type="number"
                        value={config.smtpPort || 587}
                        onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value, 10) || 587 })}
                        placeholder="587"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={config.tlsEnabled}
                          onChange={(e) => setConfig({ ...config, tlsEnabled: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Enable TLS 1.3</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">SMTP Username</label>
                      <input
                        type="text"
                        value={config.smtpUser || ''}
                        onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                        placeholder="postmaster@yourdomain.com"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500">SMTP Password</label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-blue-500 hover:underline font-bold"
                        >
                          {showPassword ? 'Hide' : 'Reveal/Edit'}
                        </button>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={config.smtpPass || ''}
                        onChange={(e) => setConfig({ ...config, smtpPass: e.target.value })}
                        placeholder="••••••••••••"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                </div>
              ) : (
                /* API Key Provider Credentials */
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-500" />
                      <span>{config.provider} Secret API Credentials</span>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-mono font-bold">Encrypted Server-Side</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500">Transactional API Token / Key</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-blue-500 hover:underline font-bold"
                      >
                        {showPassword ? 'Hide' : 'Reveal/Edit'}
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="key-••••••••••••"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                        isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* DNS Verification Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  config.spfVerified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${config.spfVerified ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <div>
                      <div className="font-bold">SPF Record</div>
                      <div className="text-[10px] text-slate-400">v=spf1 include:{config.senderDomain} ~all</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold">{config.spfVerified ? 'PASS' : 'UNVERIFIED'}</span>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  config.dkimVerified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${config.dkimVerified ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <div>
                      <div className="font-bold">DKIM 2048-bit</div>
                      <div className="text-[10px] text-slate-400">RSA Key Pair Signed</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold">{config.dkimVerified ? 'PASS' : 'UNVERIFIED'}</span>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  config.dmarcVerified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${config.dmarcVerified ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <div>
                      <div className="font-bold">DMARC Policy</div>
                      <div className="text-[10px] text-slate-400">Policy: quarantine/reject</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold">{config.dmarcVerified ? 'p=reject' : 'UNVERIFIED'}</span>
                </div>
              </div>

              {/* Inbound Email Delivery Webhook Configuration & Status */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Inbound Webhook Event Gateway
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Listening & Active
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Live Webhook URL for Resend / Email Provider:</span>
                    <span className="text-[10px] text-slate-400">POST endpoint</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://campusconnect.app'}/api/webhooks/resend`;
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(webhookUrl).then(() => {
                          onToast('Webhook URL Copied', webhookUrl, 'success');
                        }).catch(() => {});
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl font-mono text-xs flex items-center justify-between border select-all text-left cursor-pointer transition-colors ${
                      isDarkMode ? 'bg-[#070B14] border-slate-800 text-emerald-400 hover:border-emerald-500/40' : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <span className="truncate">{typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/resend` : 'https://campusconnect.app/api/webhooks/resend'}</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-2 shrink-0">Click to copy</span>
                  </button>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Automatically ingests <span className="font-mono text-emerald-500">email.delivered</span>, <span className="font-mono text-rose-500">email.bounced</span>, <span className="font-mono text-blue-500">email.opened</span>, and <span className="font-mono text-purple-500">email.clicked</span> events into audit and delivery logs with optional signature verification.
                  </div>
                </div>
              </div>

              {/* Resend Domain Verification & Sending Mode Status */}
              {resendStatus && resendStatus.connected && (
                <div className={`p-4 rounded-2xl border space-y-2.5 ${
                  resendStatus.productionReady
                    ? (isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200')
                    : resendStatus.mode === 'PRODUCTION'
                    ? (isDarkMode ? 'bg-blue-950/20 border-blue-500/30' : 'bg-blue-50/80 border-blue-200')
                    : (isDarkMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/80 border-amber-200')
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {resendStatus.productionReady ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : resendStatus.mode === 'PRODUCTION' ? (
                        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span className={`text-xs font-black ${
                        resendStatus.productionReady
                          ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-900')
                          : resendStatus.mode === 'PRODUCTION'
                          ? (isDarkMode ? 'text-blue-300' : 'text-blue-900')
                          : (isDarkMode ? 'text-amber-300' : 'text-amber-900')
                      }`}>
                        {resendStatus.productionReady
                          ? `Production-Ready — Verified Domain (${resendStatus.verifiedDomains.join(', ')}) & External Delivery Confirmed`
                          : resendStatus.mode === 'PRODUCTION'
                          ? `Domain Verified (${resendStatus.verifiedDomains.join(', ')}) — Send Live Test to External Student Email`
                          : 'Not Production-Ready — Resend Sandbox Mode (Unverified Custom Domain)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => refreshDomainStatus(true)}
                        disabled={checkingDomains}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          isDarkMode
                            ? 'bg-[#0F172A] border-slate-700 text-slate-200 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${checkingDomains ? 'animate-spin' : ''}`} />
                        <span>{checkingDomains ? 'Checking...' : 'Re-check Domains'}</span>
                      </button>

                      {resendStatus.mode !== 'PRODUCTION' && (
                        <a
                          href="https://resend.com/domains"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <span>Verify Domain</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {resendStatus.productionReady ? (
                    <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-emerald-200/80' : 'text-emerald-800'}`}>
                      Verified external delivery confirmed via central Resend domain ({resendStatus.verifiedDomains[0]}). All universities automatically send using this domain with institutional display names and reply-to headers.
                    </p>
                  ) : resendStatus.mode === 'PRODUCTION' ? (
                    <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-blue-200/80' : 'text-blue-900'}`}>
                      Your domain ({resendStatus.verifiedDomains[0]}) is verified in Resend. Dispatch a real test message in the Live Dispatch Sandbox below to an external student email address to confirm live delivery before marking production-ready.
                    </p>
                  ) : (
                    <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-amber-200/80' : 'text-amber-900'}`}>
                      No verified sending domain was found on your Resend account yet. Resend allows direct test emails only to{' '}
                      <span className="font-mono font-bold">{resendStatus.ownerEmail || 'your Resend account email'}</span>. External student emails remain safely queued until a custom domain is verified at resend.com/domains.
                    </p>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Central Email Configuration'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Live Dispatch Sandbox */}
          <div 
            id="live-dispatch-sandbox"
            className={`p-6 rounded-3xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 ${
              isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-200/80 shadow-2xs'
            }`}
          >
            <div className="space-y-1 max-w-sm">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-black">Live Dispatch Sandbox</h4>
              </div>
              <p className="text-xs text-slate-500">
                Dispatch an end-to-end transactional test applying any university's real sender identity and branded template.
              </p>
              {resendStatus?.mode === 'SANDBOX' && resendStatus.ownerEmail && (
                <button
                  type="button"
                  onClick={() => setTestRecipient(resendStatus.ownerEmail || '')}
                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <span>Use {resendStatus.ownerEmail}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-3xl">
              <select
                value={testUniversityId}
                onChange={(e) => setTestUniversityId(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <option value="general">Global Identity (CampusConnect)</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={testEventType}
                onChange={(e) => setTestEventType(e.target.value as any)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                {EVENT_TYPES.map(evt => (
                  <option key={evt.type} value={evt.type}>{evt.label}</option>
                ))}
              </select>

              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={resendStatus?.ownerEmail ? resendStatus.ownerEmail : 'Recipient email address'}
                className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#0F172A] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs'
                }`}
              />

              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest || !testRecipient}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUB-TAB 2: UNIVERSITY EMAIL IDENTITIES & TEMPLATES DIRECTORY        */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'IDENTITIES' && (
        <div className="space-y-6">
          
          {/* Header Banner & Explanation */}
          <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  University Email Identities & Template Customizer
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Every university has an independent email identity (sender name, verified alias, reply-to, brand colors, signature) while using the central sending engine. Click <strong>Customize</strong> on any campus to edit its 9 automated lifecycle templates with live HTML preview.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className={`px-3 py-1.5 rounded-xl border text-center text-xs font-mono font-bold ${
                isDarkMode ? 'bg-[#0A0E1A] border-slate-800 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}>
                {Object.keys(identities).length} Customized / {campuses.length} Campuses
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={campusSearch}
                onChange={(e) => setCampusSearch(e.target.value)}
                placeholder="Search university: Miami, Virginia Tech, Purdue, Boston..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={customFilter}
                onChange={(e) => setCustomFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <option value="ALL">All Universities ({campuses.length})</option>
                <option value="CUSTOM">Customized Only ({Object.keys(identities).length})</option>
                <option value="DEFAULT">Default Infrastructure ({campuses.length - Object.keys(identities).length})</option>
              </select>

              <button
                type="button"
                onClick={loadIdentities}
                className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                title="Refresh identities"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingIdentities ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* University Email Identities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampuses.map((c) => {
              const customId = identities[c.id];
              const senderDisplayName = customId?.senderName || `${c.name} Campus Portal`;
              const senderEmailAddress = customId?.senderEmail || `${c.slug}@notifications.${config.senderDomain || 'campusconnect.app'}`;
              const replyToAddress = customId?.replyTo || `admissions@${c.slug}.edu`;
              const primaryColor = customId?.primaryColor || c.primaryColor || '#1D64EC';
              const secondaryColor = customId?.secondaryColor || c.secondaryColor || c.accentColor || '#38BDF8';
              const isEnabled = customId ? customId.isEnabled : true;

              return (
                <div 
                  key={c.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isDarkMode ? 'bg-[#131B2E] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Identity Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={c.logoUrl} 
                          alt={c.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 p-0.5 shrink-0 bg-white"
                        />
                        <div className="min-w-0">
                          <h4 className={`text-sm font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {c.name}
                          </h4>
                          <div className="text-[11px] text-slate-400 font-medium truncate">
                            {c.location || 'United States'} • {c.instagramHandle}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        customId 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {customId ? 'Custom Identity' : 'Default Identity'}
                      </span>
                    </div>

                    {/* Email Sender Configuration Details */}
                    <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-800/80' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sender Name</div>
                        <div className={`font-semibold truncate text-[11px] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {senderDisplayName}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sender Alias</div>
                        <div className="font-mono text-[11px] text-blue-500 dark:text-blue-400 truncate">
                          {senderEmailAddress}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-medium">Reply-To:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300 truncate max-w-[160px]">{replyToAddress}</span>
                      </div>
                    </div>

                    {/* Brand Colors & Templates Badges */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Palette:</span>
                        <span 
                          className="w-4 h-4 rounded-full border border-white/50 shadow-xs" 
                          style={{ backgroundColor: primaryColor }} 
                          title={`Primary: ${primaryColor}`}
                        />
                        <span 
                          className="w-4 h-4 rounded-full border border-white/50 shadow-xs" 
                          style={{ backgroundColor: secondaryColor }} 
                          title={`Secondary: ${secondaryColor}`}
                        />
                      </div>

                      <span className={`text-[10px] font-bold ${isEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isEnabled ? '● Active Notifications' : '○ Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickTestCampus(c.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      title="Send a test email for this university"
                    >
                      Quick Test
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenCampusEmail?.(c)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-transform active:scale-95"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Customize Templates & Identity</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredCampuses.length === 0 && (
            <div className={`p-12 text-center rounded-2xl border ${
              isDarkMode ? 'bg-[#131B2E] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              No university campus matched your search query.
            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUB-TAB 3: DELIVERY HISTORY & AUDIT LOGS                           */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'LOGS' && (
        <div className={`rounded-3xl border overflow-hidden shadow-xs ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          
          {/* Table Header with Filters */}
          <div className={`p-5 border-b space-y-3 ${
            isDarkMode ? 'border-slate-800 bg-[#0F172A]' : 'border-slate-100 bg-slate-50/70'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Email Delivery History & Audit Logs
                </h3>
                <p className="text-xs text-slate-500">
                  Audited transactional deliveries with HTML inspection and idempotency protection.
                </p>
              </div>

              <div className="text-xs font-bold text-slate-400">
                Showing {filteredLogs.length} of {logs.length} logged deliveries
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipient, subject, ID..."
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                  }`}
                />
              </div>

              {/* University Filter */}
              <select
                value={filterUniversity}
                onChange={(e) => setFilterUniversity(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <option value="ALL">All Universities</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Event Filter */}
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <option value="ALL">All Event Types</option>
                {EVENT_TYPES.map(e => (
                  <option key={e.type} value={e.type}>{e.label}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                  isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <option value="ALL">All Statuses</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="QUEUED">QUEUED</option>
                <option value="FAILED">FAILED</option>
                <option value="BOUNCED">BOUNCED</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className={`border-b font-semibold ${
                isDarkMode ? 'bg-[#0A0E1A] text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200 uppercase text-[10px] tracking-wider'
              }`}>
                <tr>
                  <th className="px-4 py-3">Message ID</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Template Event</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sent At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700 bg-white'
              }`}>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/30'}`}>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 truncate max-w-[140px]" title={log.messageId}>
                      {log.messageId}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      <div>{log.recipient}</div>
                      {log.metadata?.actualFromAddress && (
                        <div className="text-[10px] font-mono font-normal text-slate-400 truncate max-w-[180px]" title={`From: ${log.metadata.actualFromAddress}`}>
                          From: {log.metadata.actualFromAddress}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.universityName || 'CampusConnect Global'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                        {log.template}
                      </span>
                    </td>
                    <td className={`px-4 py-3 truncate max-w-[200px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : log.status === 'QUEUED'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <span className="text-[10px] text-rose-500 truncate max-w-[160px]" title={log.errorMessage}>
                            {log.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {log.status !== 'DELIVERED' && (
                          <button
                            type="button"
                            onClick={() => handleRetryLog(log.id)}
                            disabled={retryingLogId === log.id}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                            title="Retry email delivery using active verified Resend domain"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                            <span>{retryingLogId === log.id ? 'Retrying...' : 'Retry'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onInspectLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/60 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-xs">
                      No email deliveries match your active filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
