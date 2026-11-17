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
          CampusConnect provides web-based campus community management, student feature workflows, and Instagram publishing software for universities, businesses, and creators. By using our service, you agree to these Terms.
        </p>

        <h3 className="text-sm font-bold text-slate-900">2. Standalone Instagram Workspace</h3>
        <p>
          CampusConnect lets you connect and manage university and creator Instagram handles directly inside your workspace without third-party Meta OAuth redirects or external password storage.
        </p>

        <h3 className="text-sm font-bold text-slate-900">3. Account Ownership & Disconnection</h3>
        <p>
          You retain full control over your Instagram profiles and content. You can disconnect your accounts from the dashboard at any time, which removes workspace links immediately.
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
          We take the security of your student and business data seriously. CampusConnect only stores the minimum necessary details to display your profile metrics, submissions, and workspace notifications.
        </p>

        <h3 className="text-sm font-bold text-slate-900">Data Deletion Instructions</h3>
        <p>
          Users can remove or request deletion of their CampusConnect data at any time:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-2">
          <li>Log into your CampusConnect dashboard.</li>
          <li>Go to Settings → Account.</li>
          <li>Click "Delete workspace" or disconnect your Instagram account. All linked profile records are immediately removed.</li>
        </ol>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { navigateTo, addToast, entryUniversityContext, selectedUniversity } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      addToast('Email Required', 'Please enter a valid email address.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          universityId: entryUniversityContext?.id || selectedUniversity?.id
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        addToast('Dispatch Issue', data.message || 'Could not dispatch password reset email.', 'error');
        return;
      }
      setSent(true);
      addToast('Reset Email Dispatched', data.message || 'Check your inbox for password recovery instructions.', 'info');
    } catch {
      addToast('Network Issue', 'Could not reach password reset service. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
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
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Sending Instructions...' : 'Send reset instructions'}
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
            CampusConnect respects your privacy and keeps full ownership of your data in your hands. You can unlink profiles or request full deletion at any time.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Method 1: Instant Self-Service Unlinking via Dashboard</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-2">
            <li>Log into your account at <button onClick={() => navigateTo('/login')} className="text-[#1D64EC] underline font-medium">CampusConnect Login</button>.</li>
            <li>Navigate to <strong>Settings → Account & Connected Profiles</strong>.</li>
            <li>Click <strong>Disconnect</strong> on any linked Instagram handle to erase cached workspace records.</li>
            <li>To delete your entire profile and student submission history, click <strong>Delete Workspace</strong>.</li>
          </ol>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Method 2: Direct Compliance Email Request</h3>
          <p>
            You may request complete data eradication by emailing our compliance team at <span className="font-mono text-slate-800">support@campusconnect.app</span> with your handle or registered email. All user records are permanently removed within 24–48 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export const VerifyEmailPage: React.FC = () => {
  const { navigateTo, addToast, currentUser, updateUserProfile } = useApp();
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialEmail = params?.get('email') || currentUser?.email || '';
  const initialCode = params?.get('code') || '';

  const [emailInput, setEmailInput] = useState(initialEmail);
  const [codeInput, setCodeInput] = useState(initialCode);
  const [status, setStatus] = useState<'IDLE' | 'VERIFYING' | 'VERIFIED' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');

  const submitVerification = async (targetEmail: string, targetCode: string) => {
    if (!targetEmail || !targetCode) return;
    setStatus('VERIFYING');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim(), code: targetCode.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.verified) {
        setStatus('ERROR');
        setErrorMsg(data.message || 'Verification code is invalid or expired.');
        return;
      }
      if (currentUser && currentUser.email?.toLowerCase() === targetEmail.trim().toLowerCase()) {
        updateUserProfile({ studentVerificationStatus: 'VERIFIED' });
      }
      setStatus('VERIFIED');
      addToast('Email Verified', 'Your student email address has been verified.', 'success');
    } catch {
      setStatus('ERROR');
      setErrorMsg('Unable to reach verification server.');
    }
  };

  React.useEffect(() => {
    if (initialEmail && initialCode) {
      submitVerification(initialEmail, initialCode);
    }
  }, []);

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerification(emailInput, codeInput);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm text-center space-y-4">
        {status === 'VERIFIED' ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-950">Student Email Verified</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your address <strong>{emailInput}</strong> has been verified cleanly.
            </p>
            <button
              onClick={() => navigateTo(currentUser ? '/student' : '/login')}
              className="w-full py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Continue to CampusConnect</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <form onSubmit={handleManualVerify} className="space-y-4 text-left">
            <h2 className="text-xl font-extrabold text-slate-950 text-center">Verify Student Email</h2>
            <p className="text-xs text-slate-500 text-center">
              {status === 'VERIFYING'
                ? 'Checking your verification code...'
                : 'Enter the 6-digit verification code dispatched to your inbox.'}
            </p>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Email</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@university.edu"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit Code</label>
              <input
                type="text"
                required
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="123456"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#1D64EC]"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'VERIFYING'}
              className="w-full py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {status === 'VERIFYING' ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const { navigateTo, addToast } = useApp();
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const email = params?.get('email') || '';
  const token = params?.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token) {
      addToast('Missing Recovery Token', 'Please open the password reset link directly from your email.', 'error');
      return;
    }
    if (
      newPassword.length < 10 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^a-zA-Z0-9]/.test(newPassword)
    ) {
      addToast(
        'Weak Password',
        'Please choose at least 10 characters with uppercase, lowercase, a number, and a symbol.',
        'error'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords Do Not Match', 'Please make sure both passwords match.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        addToast('Reset Failed', data.message || 'Recovery token is invalid or expired.', 'error');
        return;
      }
      setDone(true);
      addToast('Password Updated', 'Your password has been updated. You can now log in.', 'success');
    } catch {
      addToast('Network Issue', 'Could not reach password reset service.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-sm text-slate-900">
        <h2 className="text-xl font-extrabold text-slate-950 mb-2">Choose a new password</h2>
        <p className="text-xs text-slate-500 mb-6">
          {email ? `Resetting password for ${email}` : 'Enter and confirm your new CampusConnect password.'}
        </p>

        {done ? (
          <div className="text-center py-4 space-y-4">
            <p className="text-xs text-emerald-700 font-semibold">Password reset complete.</p>
            <button
              onClick={() => navigateTo('/login')}
              className="w-full py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              Sign in with new password
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 10 chars (upper, lower, number & symbol)"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

