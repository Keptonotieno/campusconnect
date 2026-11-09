import React, { useState, useMemo } from 'react';
import { 
  CentralEmailConfig, 
  DetailedEmailLog, 
  University, 
  UniversityEmailEventType 
} from '../../types';
import { 
  updateCentralEmailConfig, 
  sendTestUniversityEmail 
} from '../../lib/adminApi';
import { 
  Mail, 
  Check, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  SlidersHorizontal, 
  Eye, 
  Key, 
  Server, 
  Globe, 
  Layers,
  ChevronDown
} from 'lucide-react';

interface CentralEmailConfigModuleProps {
  initialConfig: CentralEmailConfig;
  logs: DetailedEmailLog[];
  campuses: University[];
  onRefresh: () => void;
  onInspectLog: (log: DetailedEmailLog) => void;
  onToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  isDarkMode?: boolean;
}

const PROVIDERS: Array<{ id: CentralEmailConfig['provider']; name: string; type: 'SMTP' | 'API' }> = [
  { id: 'SMTP', name: 'Custom SMTP Server', type: 'SMTP' },
  { id: 'MAILGUN', name: 'Mailgun Transactional API', type: 'API' },
  { id: 'SENDGRID', name: 'SendGrid Web API', type: 'API' },
  { id: 'RESEND', name: 'Resend Email API', type: 'API' },
  { id: 'POSTMARK', name: 'Postmark Transactional', type: 'API' },
  { id: 'AWS_SES', name: 'Amazon Simple Email Service (SES)', type: 'API' },
];

const EVENT_TYPES: UniversityEmailEventType[] = [
  'WELCOME',
  'ACCOUNT_VERIFICATION',
  'PASSWORD_RESET',
  'PAYMENT_CONFIRMATION',
  'PAYMENT_FAILURE',
  'SUBMISSION_RECEIVED',
  'SUBMISSION_APPROVED',
  'SUBMISSION_REJECTED',
  'INSTAGRAM_PUBLISHED'
];

export const CentralEmailConfigModule: React.FC<CentralEmailConfigModuleProps> = ({
  initialConfig,
  logs,
  campuses,
  onRefresh,
  onInspectLog,
  onToast,
  isDarkMode = false
}) => {
  // Form State
  const [config, setConfig] = useState<CentralEmailConfig>(initialConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [testUniversityId, setTestUniversityId] = useState('general');
  const [testEventType, setTestEventType] = useState<UniversityEmailEventType>('WELCOME');
  const [sendingTest, setSendingTest] = useState(false);

  // Log Filtering & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterEvent, setFilterEvent] = useState('ALL');

  // Sync props changes
  React.useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Handle Save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateCentralEmailConfig(config);
      setConfig(res.config);
      onToast('Email Infrastructure Saved', 'Central email configuration updated and operational.', 'success');
      onRefresh();
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
      onToast('Test Email Dispatched', res.message, 'success');
      onRefresh();
    } catch (err: any) {
      onToast('Dispatch Failed', err.message || 'Failed to dispatch test email.', 'error');
    } finally {
      setSendingTest(false);
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

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Centralized Infrastructure
            </span>
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Delivery Engine</span>
            </span>
          </div>
          <h2 className={`text-2xl font-black tracking-tight mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Email Infrastructure & University Management
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Single platform sending infrastructure supporting independent university sender identities, branded templates, and automated lifecycle notifications.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 2. Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sent</div>
          <div className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{metrics.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Platform-wide outbound emails</div>
        </div>

        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Delivered</div>
          <div className={`text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400`}>
            {metrics.delivered} <span className="text-xs font-bold text-slate-400">({metrics.deliveryRate}%)</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Successful TLS delivery handshakes</div>
        </div>

        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Queued</div>
          <div className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{metrics.queued}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting async worker processing</div>
        </div>

        <div className={`p-5 rounded-2xl border ${
          isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Bounced / Failed</div>
          <div className={`text-2xl font-black mt-1 ${metrics.failed > 0 ? 'text-rose-500' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
            {metrics.failed}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rejected or suppressed deliveries</div>
        </div>
      </div>

      {/* 3. Central Email Configuration Card */}
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
              The single shared gateway through which all universities deliver student notifications.
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
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-500" />
                <span>{config.provider} Secret API Key</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500">Transactional API Token</label>
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
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              config.spfVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold">SPF Record</span>
              </div>
              <span className="text-[10px] font-mono font-bold">{config.spfVerified ? 'PASS' : 'UNVERIFIED'}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              config.dkimVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold">DKIM 2048-bit</span>
              </div>
              <span className="text-[10px] font-mono font-bold">{config.dkimVerified ? 'PASS' : 'UNVERIFIED'}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              config.dmarcVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold">DMARC Policy</span>
              </div>
              <span className="text-[10px] font-mono font-bold">{config.dmarcVerified ? 'p=reject' : 'UNVERIFIED'}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Email Configuration'}</span>
            </button>
          </div>

        </form>
      </div>

      {/* 4. Send Test Email Sandbox */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-200/80 shadow-2xs'
      }`}>
        <div className="space-y-1 max-w-sm">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-black">Live Dispatch Sandbox</h4>
          </div>
          <p className="text-xs text-slate-500">
            Dispatch a test transactional email applying any university's real identity and template.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          <select
            value={testUniversityId}
            onChange={(e) => setTestUniversityId(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-blue-500 ${
              isDarkMode ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
            }`}
          >
            <option value="general">Default (CampusConnect Global)</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={testEventType}
            onChange={(e) => setTestEventType(e.target.value as any)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-blue-500 ${
              isDarkMode ? 'bg-[#0F172A] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
            }`}
          >
            {EVENT_TYPES.map(evt => (
              <option key={evt} value={evt}>{evt}</option>
            ))}
          </select>

          <input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Recipient email address"
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

      {/* 5. Delivery Audit Logs */}
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
                <option key={e} value={e}>{e}</option>
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
                    {log.recipient}
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      log.status === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : log.status === 'QUEUED'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectLog(log)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/60 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Inspect
                    </button>
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

    </div>
  );
};
