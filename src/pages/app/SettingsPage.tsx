import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Lock, Bell, Trash2, MessageCircle, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { business, currentUser, updateBusiness, updateUserProfile, addToast } = useApp();

  // Parse active tab from URL query params (e.g. /app/settings?tab=notifications)
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'NOTIFICATIONS' | 'ACCOUNT'>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get('tab')?.toUpperCase();
      if (tabParam === 'NOTIFICATIONS') return 'NOTIFICATIONS';
      if (tabParam === 'SECURITY') return 'SECURITY';
      if (tabParam === 'ACCOUNT') return 'ACCOUNT';
    }
    return 'PROFILE';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get('tab')?.toUpperCase();
      if (tabParam === 'NOTIFICATIONS') setActiveTab('NOTIFICATIONS');
      else if (tabParam === 'SECURITY') setActiveTab('SECURITY');
      else if (tabParam === 'ACCOUNT') setActiveTab('ACCOUNT');
      else if (tabParam === 'PROFILE') setActiveTab('PROFILE');
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Form states
  const [bizName, setBizName] = useState(business?.name || 'Campus Workspace');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // Notifications preference toggles (Image 6)
  const [accountAlerts, setAccountAlerts] = useState(true);
  const [publishingAlerts, setPublishingAlerts] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness({ name: bizName });
    updateUserProfile({ name: bizName, email, phone });
    addToast('Changes saved', 'Your business details have been updated.', 'success');
  };

  const handleSaveNotifications = () => {
    setIsSavingNotifications(true);
    setTimeout(() => {
      setIsSavingNotifications(false);
      addToast('Preferences Saved', 'Your email notification preferences have been saved.', 'success');
    }, 400);
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto font-sans space-y-6 relative">
      
      {/* Settings Top Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Left Sub-nav (matching Image 6 exactly) */}
        <div className="md:col-span-4 space-y-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SECURITY')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'SECURITY'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'NOTIFICATIONS'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200/90 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Bell className="w-4 h-4 text-[#1D64EC]" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACCOUNT')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ACCOUNT'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Trash2 className="w-4 h-4 text-slate-500" />
            <span>Account</span>
          </button>
        </div>

        {/* Right Content Card (matching Image 6 exactly) */}
        <div className="md:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          
          {/* ================= NOTIFICATIONS TAB (Image 6) ================= */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header */}
              <div>
                <h2 className="text-xl font-bold text-slate-950 tracking-tight">
                  Email notifications
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Everything also appears under Notifications in your dashboard. Choose what to get by email to{' '}
                  <strong className="text-slate-800 font-semibold">{currentUser?.email || 'your account email'}</strong>.
                </p>
              </div>

              {/* Preferences Card with 3 Rows */}
              <div className="border border-slate-200/90 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white">
                
                {/* 1. Account alerts */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Account alerts
                    </h3>
                    <p className="text-xs text-slate-500">
                      When an Instagram account is connected, disconnected or needs reconnecting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccountAlerts(!accountAlerts)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      accountAlerts ? 'bg-[#1D64EC]' : 'bg-slate-200'
                    }`}
                    role="switch"
                    aria-checked={accountAlerts}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        accountAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Publishing */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Publishing
                    </h3>
                    <p className="text-xs text-slate-500">
                      When a post you created goes live.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublishingAlerts(!publishingAlerts)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      publishingAlerts ? 'bg-[#1D64EC]' : 'bg-slate-200'
                    }`}
                    role="switch"
                    aria-checked={publishingAlerts}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        publishingAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Security (Always on) */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-slate-50/30">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Security
                    </h3>
                    <p className="text-xs text-slate-500">
                      Password and sign-in email changes. Always sent, to keep your account safe.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Always on
                    </span>
                  </div>
                </div>

              </div>

              {/* Save Preferences Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSavingNotifications}
                  onClick={handleSaveNotifications}
                  className="px-6 py-2.5 rounded-xl bg-[#6A9BF6] hover:bg-blue-600 active:scale-98 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingNotifications ? 'Saving...' : 'Save preferences'}
                </button>
              </div>

            </div>
          )}

          {/* ================= PROFILE TAB ================= */}
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Profile</h2>
                <p className="text-xs text-slate-500 mt-1">
                  The name and contact details for your business account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business name
                </label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sign-in email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder=""
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Save changes
                </button>
              </div>
            </form>
          )}

          {/* ================= SECURITY TAB ================= */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Security</h2>
                <p className="text-slate-500 mt-1">Manage passwords and login methods.</p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => addToast('Reset Link Sent', 'Password reset email sent to your address.', 'info')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Send password reset email
                </button>
              </div>
            </div>
          )}

          {/* ================= ACCOUNT TAB ================= */}
          {activeTab === 'ACCOUNT' && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Account</h2>
                <p className="text-slate-500 mt-1">Workspace account and data deletion.</p>
              </div>
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-rose-900">Delete workspace</div>
                  <div className="text-slate-500 text-[11px]">Permanently delete your account and unlink Instagram</div>
                </div>
                <button
                  type="button"
                  onClick={() => addToast('Notice', 'Please contact support to request account purge.', 'info')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

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
