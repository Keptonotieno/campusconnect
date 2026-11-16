import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Instagram, X, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const InstagramOAuthModal: React.FC = () => {
  const { isOAuthModalOpen, setOAuthModalOpen, connectAccount, currentUser, selectedUniversity, entryUniversityContext } = useApp();

  const [isSaving, setIsSaving] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [accountType, setAccountType] = useState<'BUSINESS' | 'CREATOR'>('BUSINESS');

  const activeUni = selectedUniversity || entryUniversityContext;

  useEffect(() => {
    if (isOAuthModalOpen) {
      setIsSaving(false);
      if (activeUni?.instagramHandle) {
        const cleanUniHandle = activeUni.instagramHandle.replace(/^@/, '');
        setUsernameInput(cleanUniHandle);
        setDisplayNameInput(activeUni.name || '');
      } else if (currentUser?.email) {
        setUsernameInput(currentUser.email.split('@')[0]);
        setDisplayNameInput(currentUser.name || '');
      } else {
        setUsernameInput('');
        setDisplayNameInput('');
      }
    }
  }, [isOAuthModalOpen, currentUser, activeUni]);

  if (!isOAuthModalOpen) return null;

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = usernameInput.trim().replace(/^@/, '');
    if (!cleanHandle) return;

    setIsSaving(true);

    setTimeout(() => {
      const displayTitle =
        displayNameInput.trim() ||
        cleanHandle
          .split(/[._-]/)
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');

      connectAccount({
        username: cleanHandle,
        displayName: displayTitle,
        accountType,
        followersCount: 0,
        mediaCount: 0,
        reach28d: 0,
        impressions28d: 0,
        interactions28d: 0,
        profilePictureUrl: activeUni?.logoUrl || ''
      });

      setIsSaving(false);
      setOAuthModalOpen(false);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      {isSaving ? (
        <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 border border-slate-200 animate-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-[#1D64EC] flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
          <div className="text-xs font-bold text-slate-800">Connecting Instagram Profile...</div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-950 leading-tight">
                  Connect Instagram Account
                </h3>
                <p className="text-[11px] text-slate-500">
                  Direct standalone CampusConnect workspace link
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOAuthModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleConnectSubmit} className="p-6 space-y-4">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#1D64EC] shrink-0 mt-0.5" />
              <span>
                No third-party Meta OAuth or Instagram password is required. Add your handle below to manage queues, publishing, comments, and analytics directly inside CampusConnect.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Instagram Handle
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">@</span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="campuscommunity2031"
                  required
                  autoFocus
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Display Name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="Official Campus Page"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Profile Type
              </label>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setAccountType('BUSINESS')}
                  className={`py-2 rounded-xl border font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    accountType === 'BUSINESS'
                      ? 'border-[#1D64EC] bg-blue-50 text-[#1D64EC]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {accountType === 'BUSINESS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Business Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('CREATOR')}
                  className={`py-2 rounded-xl border font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    accountType === 'CREATOR'
                      ? 'border-[#1D64EC] bg-blue-50 text-[#1D64EC]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {accountType === 'CREATOR' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Creator Profile</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOAuthModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Save & Connect Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
