import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Check, ArrowRight } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="py-16 px-6 max-w-3xl mx-auto space-y-6 font-sans">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
      <p className="text-xs text-slate-400">Effective Date: October 2026</p>

      <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4 text-xs text-slate-600 leading-relaxed">
        <h3 className="text-sm font-bold text-slate-900">1. Service Overview</h3>
        <p>
          CampusConnect provides web-based Instagram management software for businesses, agencies, and creators. By using our service, you agree to these Terms and Meta’s Platform Terms.
        </p>

        <h3 className="text-sm font-bold text-slate-900">2. Official Meta OAuth</h3>
        <p>
          CampusConnect connects exclusively through Meta’s official authorization screens. We never ask for or store your Instagram password.
        </p>

        <h3 className="text-sm font-bold text-slate-900">3. Account Ownership & Disconnection</h3>
        <p>
          You retain full control over your Instagram profiles and content. You can disconnect your accounts from the dashboard at any time, which terminates access tokens immediately.
        </p>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  return (
    <div className="py-16 px-6 max-w-3xl mx-auto space-y-6 font-sans">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Privacy Policy & Data Deletion</h1>
      <p className="text-xs text-slate-400">Effective Date: October 2026</p>

      <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4 text-xs text-slate-600 leading-relaxed">
        <h3 className="text-sm font-bold text-slate-900">Data Protection</h3>
        <p>
          We take the security of your business data seriously. CampusConnect only requests the minimum necessary permissions to display your metrics, comments, and messages.
        </p>

        <h3 className="text-sm font-bold text-slate-900">Data Deletion Instructions</h3>
        <p>
          According to Meta Platform rules, users can delete their data from CampusConnect at any time:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-2">
          <li>Log into your CampusConnect dashboard.</li>
          <li>Go to Settings → Account.</li>
          <li>Click "Delete workspace" or disconnect your Instagram account. All cached tokens and profile data are immediately deleted.</li>
        </ol>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { navigateTo, addToast } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    addToast('Reset Email Sent', 'Check your inbox for password instructions.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm text-slate-900">
        <h2 className="text-xl font-extrabold text-slate-950 mb-2">Reset password</h2>
        <p className="text-xs text-slate-500 mb-6">
          Enter your email to receive recovery instructions for your CampusConnect account.
        </p>

        {sent ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-xs text-slate-700">
              Recovery link dispatched to <strong>{email}</strong>.
            </p>
            <button
              onClick={() => navigateTo('/login')}
              className="text-xs font-semibold text-[#1D64EC] hover:underline cursor-pointer"
            >
              Return to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campus.edu"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              Send reset instructions
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigateTo('/login')}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const DataDeletionPage: React.FC = () => {
  const { navigateTo } = useApp();
  return (
    <div className="py-16 px-6 max-w-3xl mx-auto space-y-6 font-sans">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Data Deletion Instructions</h1>
      <p className="text-xs text-slate-400">Effective Date: October 2026</p>

      <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5 text-xs text-slate-600 leading-relaxed">
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">User Data Deletion Policy</h3>
          <p>
            CampusConnect respects your privacy and complies with Meta Platform Data Deletion requirements. You have full ownership of your data and can request deletion at any time.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Method 1: Instant Self-Service Deletion via Dashboard</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-2">
            <li>Log into your account at <button onClick={() => navigateTo('/login')} className="text-[#1D64EC] underline font-medium">CampusConnect Login</button>.</li>
            <li>Navigate to <strong>Settings → Account & Connected Profiles</strong>.</li>
            <li>Click <strong>Disconnect Instagram</strong> to immediately revoke Meta tokens and erase cached profile data.</li>
            <li>To delete your entire profile and student submission history, click <strong>Delete Account & Workspace</strong>.</li>
          </ol>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Method 2: Deletion via Meta / Instagram App</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-2">
            <li>Open the Instagram app or visit instagram.com.</li>
            <li>Go to <strong>Settings → Security → Apps and Websites</strong>.</li>
            <li>Find <strong>CampusConnect</strong> in your Active apps list.</li>
            <li>Click <strong>Remove</strong>. Instagram will notify our webhook to automatically purge your associated tokens and data.</li>
          </ol>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Method 3: Direct Email Request</h3>
          <p>
            You may also request complete data eradication by emailing our compliance team at <span className="font-mono text-slate-800">support@campusconnect.app</span> with your username or registered email. All user records will be permanently removed within 24–48 hours.
          </p>
        </div>
      </div>
    </div>
  );
};
