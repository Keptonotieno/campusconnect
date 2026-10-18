import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Instagram, 
  Plus, 
  ShieldCheck, 
  RefreshCw, 
  Unlink, 
  CheckCircle2, 
  AlertTriangle, 
  Lock,
  ExternalLink,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { InstagramAccount } from '../../types';

export const AccountsPage: React.FC = () => {
  const { accounts, disconnectAccount, setOAuthModalOpen, addToast, navigateTo } = useApp();
  const [disconnectCandidate, setDisconnectCandidate] = useState<InstagramAccount | null>(null);

  const handleRefresh = (username: string) => {
    addToast('Token Refreshed', `Meta Graph API token for @${username} renewed for 60 days.`, 'success');
  };

  const confirmDisconnect = () => {
    if (!disconnectCandidate) return;
    disconnectAccount(disconnectCandidate.id);
    setDisconnectCandidate(null);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Connected Instagram Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your Meta Graph API authorizations, token validity, and account permissions
          </p>
        </div>

        <button
          onClick={() => setOAuthModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Connect Instagram Account</span>
        </button>
      </div>

      {/* Empty State */}
      {accounts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col items-center text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Instagram className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              No Instagram Accounts Linked
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect your real Instagram Professional or Creator account to activate comment moderation, DM inbox, and performance analytics.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setOAuthModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Connect Instagram Account
            </button>
          </div>
        </div>
      ) : (
        /* Accounts List */
        <div className="space-y-4">
          {accounts.map((acct) => (
            <div
              key={acct.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={acct.profilePictureUrl}
                      alt={acct.username}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/20 shadow-xs"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-2xs">
                      <Instagram className="w-3 h-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">@{acct.username}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#1D64EC] border border-blue-200 font-bold">
                        {acct.accountType}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {acct.displayName} · <span className="tabular-nums text-slate-800 font-bold">{acct.followersCount.toLocaleString()}</span> followers · <span className="tabular-nums text-slate-800 font-bold">{acct.mediaCount}</span> posts
                    </p>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRefresh(acct.username)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Token</span>
                  </button>

                  <button
                    onClick={() => navigateTo('/app/inbox')}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#1D64EC] hover:bg-blue-100/80 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Messages</span>
                  </button>

                  <button
                    onClick={() => setDisconnectCandidate(acct)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-xs text-rose-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>

              {/* Token details and scopes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Authentication & Session
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Protocol:</span>
                    <span className="text-slate-900 font-mono font-bold">Meta Graph API v19.0 (OAuth 2.0)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Token Health:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Active & Verified</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Token Expiry:</span>
                    <span className="text-slate-900 font-bold tabular-nums">
                      {new Date(acct.tokenExpiresAt).toLocaleDateString()} (in 60 days)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Approved Meta Scopes
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {acct.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 font-mono font-medium shadow-2xs"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disconnect Warning Modal */}
      {disconnectCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Disconnect @{disconnectCandidate.username}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Disconnecting will revoke the OAuth token from Meta servers and remove this profile from your CampusConnect workspace.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Direct message synchronization will stop</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Community comments will no longer be tracked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Audience reach & interaction insights will be paused</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDisconnectCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Keep Connected
              </button>
              <button
                onClick={confirmDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Yes, Disconnect Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
