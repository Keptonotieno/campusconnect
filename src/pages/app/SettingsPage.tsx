import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Lock, Bell, Trash2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { business, currentUser, updateBusiness, updateUserProfile, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'NOTIFICATIONS' | 'ACCOUNT'>('PROFILE');

  const [bizName, setBizName] = useState(business?.name || 'Campus Workspace');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness({ name: bizName });
    updateUserProfile({ name: bizName, email, phone });
    addToast('Changes saved', 'Your business details have been updated.', 'success');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sub-nav (matching exact screenshot 8) */}
        <div className="md:col-span-4 space-y-1">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <User className="w-4 h-4 text-[#1D64EC]" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'SECURITY'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security</span>
          </button>

          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'NOTIFICATIONS'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('ACCOUNT')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ACCOUNT'
                ? 'bg-white shadow-xs text-[#1D64EC] border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Account</span>
          </button>
        </div>

        {/* Right Form Card (matching exact screenshot 8) */}
        <div className="md:col-span-8 bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xs">
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-950">Profile</h3>
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

          {activeTab === 'SECURITY' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-950">Security</h3>
                <p className="text-slate-500 mt-1">Manage passwords and login methods.</p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => addToast('Reset Link Sent', 'Password reset email sent to your address.', 'info')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold"
                >
                  Send password reset email
                </button>
              </div>
            </div>
          )}

          {activeTab === 'NOTIFICATIONS' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-950">Notifications</h3>
                <p className="text-slate-500 mt-1">Choose your email and product alerts.</p>
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                <span>Receive email summary when new Instagram messages arrive</span>
              </label>
            </div>
          )}

          {activeTab === 'ACCOUNT' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-950">Account</h3>
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
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
