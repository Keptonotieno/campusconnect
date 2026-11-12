import React, { useState, useEffect } from 'react';
import { 
  University, 
  UniversityEmailIdentity, 
  UniversityEmailTemplate, 
  UniversityEmailEventType 
} from '../../types';
import { 
  fetchUniversityEmailIdentity, 
  saveUniversityEmailIdentity, 
  fetchUniversityEmailTemplates, 
  saveUniversityEmailTemplate, 
  resetUniversityEmailTemplate, 
  previewEmailTemplate, 
  sendTestUniversityEmail 
} from '../../lib/adminApi';
import { 
  X, 
  Mail, 
  FileText, 
  Check, 
  RefreshCw, 
  Send, 
  Eye, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Palette,
  ExternalLink,
  Monitor,
  Smartphone
} from 'lucide-react';

interface UniversityEmailManagerModalProps {
  university: University;
  onClose: () => void;
  onSuccessToast?: (title: string, message: string) => void;
  isDarkMode?: boolean;
}

const EVENT_TYPE_OPTIONS: Array<{ type: UniversityEmailEventType; label: string; desc: string }> = [
  { type: 'WELCOME', label: 'Welcome Email', desc: 'Sent when student registers for campus' },
  { type: 'ACCOUNT_VERIFICATION', label: 'Email Verification', desc: 'Sent when confirming student email' },
  { type: 'PASSWORD_RESET', label: 'Password Reset', desc: 'Sent when requesting password reset' },
  { type: 'PAYMENT_CONFIRMATION', label: 'Payment Receipt', desc: 'Sent immediately upon $6.00 payment' },
  { type: 'PAYMENT_FAILURE', label: 'Payment Failure', desc: 'Sent if credit card payment fails' },
  { type: 'SUBMISSION_RECEIVED', label: 'Submission Received', desc: 'Sent when photo is submitted' },
  { type: 'SUBMISSION_APPROVED', label: 'Submission Approved', desc: 'Sent when admin approves feature' },
  { type: 'SUBMISSION_REJECTED', label: 'Submission Rejected', desc: 'Sent with revision feedback' },
  { type: 'INSTAGRAM_PUBLISHED', label: 'Instagram Published', desc: 'Sent when feature is published on Instagram' },
];

const VARIABLE_TAGS = [
  { tag: '{{student_name}}', label: 'Student Name' },
  { tag: '{{university_name}}', label: 'University Name' },
  { tag: '{{university_instagram}}', label: 'Instagram Handle' },
  { tag: '{{student_email}}', label: 'Student Email' },
  { tag: '{{submission_reference}}', label: 'Reference #' },
  { tag: '{{payment_amount}}', label: 'Payment Amount' },
  { tag: '{{continuation_link}}', label: 'Portal Link' },
  { tag: '{{instagram_post_url}}', label: 'Instagram Post Link' },
  { tag: '{{rejection_reason}}', label: 'Feedback / Reason' },
  { tag: '{{support_email}}', label: 'Support Email' },
];

export const UniversityEmailManagerModal: React.FC<UniversityEmailManagerModalProps> = ({
  university,
  onClose,
  onSuccessToast,
  isDarkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'TEMPLATES'>('IDENTITY');
  const [loading, setLoading] = useState(true);

  // Identity state
  const [identity, setIdentity] = useState<UniversityEmailIdentity>({
    universityId: university.id,
    universitySlug: university.slug,
    universityName: university.name,
    senderName: `${university.name} Campus Portal`,
    senderEmail: `${university.slug}@notifications.campusconnect.app`,
    replyTo: `admissions@${university.slug}.edu`,
    logoUrl: university.logoUrl,
    primaryColor: university.primaryColor || '#1D64EC',
    secondaryColor: university.secondaryColor || university.accentColor || '#38BDF8',
    signature: `Warm regards,\n\n**The ${university.name} Student Media Team**`,
    isEnabled: true
  });
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<UniversityEmailTemplate[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<UniversityEmailEventType>('WELCOME');
  const [currentTemplateDraft, setCurrentTemplateDraft] = useState<Partial<UniversityEmailTemplate>>({
    subject: '',
    preheader: '',
    headline: '',
    bodyMarkdown: '',
    buttonText: '',
    buttonLink: '',
    footerText: ''
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [resettingTemplate, setResettingTemplate] = useState(false);

  // Live preview state
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');

  // Test email state
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>('admin@campusconnect.app');
  const [sendingTest, setSendingTest] = useState(false);

  // Load initial data
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    Promise.all([
      fetchUniversityEmailIdentity(university.id).catch(() => ({ identity: null })),
      fetchUniversityEmailTemplates(university.id).catch(() => ({ templates: [] }))
    ]).then(([idRes, tplRes]) => {
      if (isCancelled) return;
      if (idRes.identity) {
        setIdentity(idRes.identity);
      }
      if (tplRes.templates) {
        setTemplates(tplRes.templates);
      }
      setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [university.id]);

  // Load active template draft when selectedEventType or templates change
  useEffect(() => {
    const found = templates.find(t => t.eventType === selectedEventType);
    if (found) {
      setCurrentTemplateDraft(found);
    } else {
      // Trigger live preview to fetch default template
      updatePreview(selectedEventType, {});
    }
  }, [selectedEventType, templates]);

  // Update live HTML preview
  const updatePreview = async (eventType: UniversityEmailEventType, customTemplate: Partial<UniversityEmailTemplate>) => {
    setLoadingPreview(true);
    try {
      const res = await previewEmailTemplate({
        universityId: university.id,
        eventType,
        customTemplate: {
          ...customTemplate,
          universityId: university.id
        }
      });
      if (res.html) {
        setPreviewHtml(res.html);
        if (!customTemplate.subject && res.subject) {
          // If draft was empty, populate from default preview
          setCurrentTemplateDraft(prev => ({
            ...prev,
            subject: prev.subject || res.subject
          }));
        }
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Debounced auto-preview when draft changes
  useEffect(() => {
    if (activeTab !== 'TEMPLATES') return;
    const timer = setTimeout(() => {
      updatePreview(selectedEventType, currentTemplateDraft);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentTemplateDraft, selectedEventType, activeTab, identity.primaryColor, identity.secondaryColor]);

  // Save Identity
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIdentity(true);
    try {
      const res = await saveUniversityEmailIdentity(university.id, identity);
      setIdentity(res.identity);
      onSuccessToast?.('Email Identity Saved', `Updated sender identity for ${university.name}.`);
    } catch (err: any) {
      alert(`Failed to save identity: ${err.message}`);
    } finally {
      setSavingIdentity(false);
    }
  };

  // Save Template
  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const payload: Partial<UniversityEmailTemplate> = {
        ...currentTemplateDraft,
        universityId: university.id,
        eventType: selectedEventType,
        isCustom: true
      };
      const res = await saveUniversityEmailTemplate(university.id, payload);
      setTemplates(prev => {
        const filtered = prev.filter(t => t.eventType !== selectedEventType);
        return [...filtered, res.template];
      });
      onSuccessToast?.('Template Saved', `Custom template for ${selectedEventType} saved for ${university.name}.`);
    } catch (err: any) {
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Reset Template
  const handleResetTemplate = async () => {
    if (!confirm(`Are you sure you want to reset the "${selectedEventType}" email template to system defaults for ${university.name}?`)) {
      return;
    }
    setResettingTemplate(true);
    try {
      await resetUniversityEmailTemplate(university.id, selectedEventType);
      setTemplates(prev => prev.filter(t => t.eventType !== selectedEventType));
      setCurrentTemplateDraft({
        subject: '',
        preheader: '',
        headline: '',
        bodyMarkdown: '',
        buttonText: '',
        buttonLink: '',
        footerText: ''
      });
      onSuccessToast?.('Template Reset', `Reset to system default template.`);
      updatePreview(selectedEventType, {});
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResettingTemplate(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) return;
    setSendingTest(true);
    try {
      const res = await sendTestUniversityEmail({
        recipient: testEmailRecipient,
        universityId: university.id,
        eventType: selectedEventType
      });
      if (res.success === false) {
        alert(`Email delivery notice: ${res.message || 'Delivery failed'}`);
      } else {
        onSuccessToast?.('Test Email Sent', res.message || `Dispatched to ${testEmailRecipient}`);
      }
    } catch (err: any) {
      alert(`Failed to send test email: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  // Insert Variable into bodyMarkdown
  const insertVariableTag = (tag: string) => {
    setCurrentTemplateDraft(prev => ({
      ...prev,
      bodyMarkdown: (prev.bodyMarkdown || '') + ` ${tag} `
    }));
  };

  const isCurrentCustom = templates.some(t => t.eventType === selectedEventType && t.isCustom);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className={`w-full max-w-5xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-start justify-between gap-4 ${
          isDarkMode ? 'border-slate-800 bg-[#131B2E]' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-3">
            <img 
              src={university.logoUrl} 
              alt={university.name}
              className={`w-12 h-12 rounded-xl object-cover p-1 border shadow-xs ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  University Email Manager
                </span>
                <span className={`text-xs font-semibold ${identity.isEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {identity.isEnabled ? '● Active Sending' : '○ Disabled'}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight mt-0.5">
                {university.name}
              </h2>
              <p className="text-xs text-slate-500">
                Configure campus-specific sender alias, brand colors, signature, and personalized notification templates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tab switch */}
            <div className="flex rounded-xl p-1 border bg-slate-200/50 dark:bg-slate-800/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('IDENTITY')}
                className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'IDENTITY'
                    ? (isDarkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-600 shadow-xs')
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Email Identity</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TEMPLATES')}
                className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'TEMPLATES'
                    ? (isDarkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-600 shadow-xs')
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Email Templates (9)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-semibold">Loading university email identity & templates...</p>
            </div>
          ) : activeTab === 'IDENTITY' ? (
            /* TAB 1: UNIVERSITY EMAIL IDENTITY */
            <form onSubmit={handleSaveIdentity} className="space-y-6 max-w-3xl">
              
              {/* Status & Enabled Toggle */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                isDarkMode ? 'bg-[#131B2E] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h4 className="text-sm font-bold">University Email Notifications</h4>
                  <p className="text-xs text-slate-500">
                    When enabled, automated emails (welcome, receipts, review decisions) are dispatched using this campus identity.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={identity.isEnabled}
                    onChange={(e) => setIdentity({ ...identity, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Sender Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Sender Display Name</label>
                  <input
                    type="text"
                    value={identity.senderName}
                    onChange={(e) => setIdentity({ ...identity, senderName: e.target.value })}
                    required
                    placeholder="e.g. Miami University"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">Shown in student email inbox as sender.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Sender Email / Verified Alias</label>
                  <input
                    type="email"
                    value={identity.senderEmail}
                    onChange={(e) => setIdentity({ ...identity, senderEmail: e.target.value })}
                    required
                    placeholder="e.g. miami@notifications.campusconnect.app"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 font-mono ${
                      isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">Must be on the central platform's verified sender domain.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Reply-To Address</label>
                  <input
                    type="email"
                    value={identity.replyTo || ''}
                    onChange={(e) => setIdentity({ ...identity, replyTo: e.target.value })}
                    placeholder="e.g. admissions@miamioh.edu"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">Where student replies will be delivered.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">University Logo URL</label>
                  <input
                    type="url"
                    value={identity.logoUrl || ''}
                    onChange={(e) => setIdentity({ ...identity, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">Rendered in the email header (PNG/SVG, max height 48px).</p>
                </div>
              </div>

              {/* Branding Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={identity.primaryColor || '#1D64EC'}
                      onChange={(e) => setIdentity({ ...identity, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      value={identity.primaryColor || '#1D64EC'}
                      onChange={(e) => setIdentity({ ...identity, primaryColor: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                        isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Used for CTA buttons, header gradients, and accent rules.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Secondary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={identity.secondaryColor || '#38BDF8'}
                      onChange={(e) => setIdentity({ ...identity, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      value={identity.secondaryColor || '#38BDF8'}
                      onChange={(e) => setIdentity({ ...identity, secondaryColor: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                        isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Used for subtle badges, secondary borders, and highlights.</p>
                </div>
              </div>

              {/* Email Signature */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Email Signature Block</label>
                <textarea
                  rows={3}
                  value={identity.signature || ''}
                  onChange={(e) => setIdentity({ ...identity, signature: e.target.value })}
                  placeholder="Warm regards,&#10;The Student Media & Community Team"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 leading-relaxed ${
                    isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                  }`}
                />
                <p className="text-[10px] text-slate-400">Appended to the bottom of all emails sent for this university.</p>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingIdentity}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingIdentity ? 'Saving Identity...' : 'Save University Email Identity'}</span>
                </button>
              </div>

            </form>
          ) : (
            /* TAB 2: UNIVERSITY EMAIL TEMPLATES */
            <div className="space-y-6">
              
              {/* 1. Event Type Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select Notification Event:
                  </label>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isCurrentCustom
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-slate-200/50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                  }`}>
                    {isCurrentCustom ? 'Customized for Campus' : 'Inheriting System Default'}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {EVENT_TYPE_OPTIONS.map((opt) => {
                    const isSelected = selectedEventType === opt.type;
                    const hasCustom = templates.some(t => t.eventType === opt.type && t.isCustom);
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setSelectedEventType(opt.type)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : (isDarkMode ? 'bg-[#131B2E] text-slate-400 hover:text-white border border-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                        }`}
                      >
                        <span>{opt.label}</span>
                        {hasCustom && (
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-blue-500'}`} title="Has custom template" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Side-by-side Editor & Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left: Template Inputs (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Subject Line */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Email Subject</label>
                    <input
                      type="text"
                      value={currentTemplateDraft.subject || ''}
                      onChange={(e) => setCurrentTemplateDraft({ ...currentTemplateDraft, subject: e.target.value })}
                      placeholder="Email subject..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 font-medium ${
                        isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Preheader & Headline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Preheader (Preview Snippet)</label>
                      <input
                        type="text"
                        value={currentTemplateDraft.preheader || ''}
                        onChange={(e) => setCurrentTemplateDraft({ ...currentTemplateDraft, preheader: e.target.value })}
                        placeholder="Snippet visible in inbox..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Header Banner Title</label>
                      <input
                        type="text"
                        value={currentTemplateDraft.headline || ''}
                        onChange={(e) => setCurrentTemplateDraft({ ...currentTemplateDraft, headline: e.target.value })}
                        placeholder="Card headline..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Variable Tag Inserter */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      <span>Click to insert dynamic variable tag:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {VARIABLE_TAGS.map(v => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => insertVariableTag(v.tag)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 text-[10px] font-mono font-semibold cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Markdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Body Markdown Content</label>
                    <textarea
                      rows={8}
                      value={currentTemplateDraft.bodyMarkdown || ''}
                      onChange={(e) => setCurrentTemplateDraft({ ...currentTemplateDraft, bodyMarkdown: e.target.value })}
                      placeholder="Write message in markdown..."
                      className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-blue-500 font-mono leading-relaxed ${
                        isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Button Text & Button Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">CTA Button Text</label>
                      <input
                        type="text"
                        value={currentTemplateDraft.buttonText || ''}
                        onChange={(e) => setCurrentTemplateDraft({ ...currentTemplateDraft, buttonText: e.target.value })}
                        placeholder="e.g. Open Campus Portal"
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">CTA Button URL</label>
                      <input
                        type="text"
                        value={currentTemplateDraft.buttonLink || ''}
                        onChange={(e) => setCurrentTemplateDraft({ ...currentTemplateDraft, buttonLink: e.target.value })}
                        placeholder="{{continuation_link}}"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Footer Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">University Footer Note</label>
                    <input
                      type="text"
                      value={currentTemplateDraft.footerText || ''}
                      onChange={(e) => setCurrentTemplateDraft({ ...currentTemplateDraft, footerText: e.target.value })}
                      placeholder="e.g. Questions? Contact support@university.edu"
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                        isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingTemplate ? 'Saving...' : 'Save Custom Template'}</span>
                      </button>

                      {isCurrentCustom && (
                        <button
                          type="button"
                          onClick={handleResetTemplate}
                          disabled={resettingTemplate}
                          className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset to Default</span>
                        </button>
                      )}
                    </div>

                    {/* Test Email Dispatch */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="email"
                        value={testEmailRecipient}
                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                        placeholder="Recipient email"
                        className={`w-40 px-2.5 py-1.5 rounded-lg border text-[11px] focus:outline-none focus:border-blue-500 ${
                          isDarkMode ? 'bg-[#131B2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={sendingTest || !testEmailRecipient}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{sendingTest ? 'Sending...' : 'Test Send'}</span>
                      </button>
                    </div>

                  </div>

                </div>

                {/* Right: Live Rendered Preview (5 cols) */}
                <div className="lg:col-span-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>Live Branded Preview</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {loadingPreview && <span className="text-[10px] text-blue-500 font-normal">Rendering...</span>}
                      
                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('DESKTOP')}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold cursor-pointer transition-colors ${
                            previewDevice === 'DESKTOP'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Desktop View"
                        >
                          <Monitor className="w-3 h-3" />
                          <span>Desktop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('MOBILE')}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold cursor-pointer transition-colors ${
                            previewDevice === 'MOBILE'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Mobile Phone View"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>Mobile</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-[#F1F5F9] dark:bg-slate-950 p-3 flex justify-center min-h-[500px]">
                    {previewHtml ? (
                      <div className={`transition-all duration-300 flex justify-center ${
                        previewDevice === 'MOBILE' ? 'w-[340px]' : 'w-full max-w-[560px]'
                      }`}>
                        <iframe
                          title="Live Preview"
                          srcDoc={previewHtml}
                          className="w-full h-[520px] rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-xs text-slate-400">
                        Generating live email preview...
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-[#131B2E]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="text-xs text-slate-400">
            University: <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>{university.name}</strong> • Slug: <span className="font-mono">/university/{university.slug}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
