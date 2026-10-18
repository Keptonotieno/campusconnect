import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Instagram, 
  X, 
  Minus, 
  Square, 
  Lock, 
  RefreshCw, 
  Check, 
  Eye, 
  EyeOff, 
  KeyRound,
  ExternalLink
} from 'lucide-react';

export const InstagramOAuthModal: React.FC = () => {
  const { isOAuthModalOpen, setOAuthModalOpen, connectAccount, currentUser } = useApp();
  
  // Stages:
  // 'WINDOW': The realistic Google Chrome Instagram popup window (video 01:00-01:16)
  // 'PARENT_CARD': The "Continue in the Instagram window" prompt on the parent page (video 01:17)
  // 'SAVING': The spinner card (video 00:07, 00:12, 00:54)
  const [viewState, setViewState] = useState<'WINDOW' | 'PARENT_CARD' | 'SAVING'>('WINDOW');
  const [usernameInput, setUsernameInput] = useState(currentUser?.email?.split('@')[0] || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<'BUSINESS' | 'CREATOR'>('BUSINESS');
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [customAppId, setCustomAppId] = useState('meta_app_184920');

  useEffect(() => {
    if (isOAuthModalOpen) {
      setViewState('WINDOW');
      if (currentUser?.email) {
        setUsernameInput(currentUser.email.split('@')[0]);
      } else {
        setUsernameInput('');
      }
      setPasswordInput('');
    }
  }, [isOAuthModalOpen, currentUser]);

  if (!isOAuthModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setViewState('SAVING');

    setTimeout(() => {
      const cleanHandle = usernameInput.trim().replace(/^@/, '') || 'brand';
      const displayTitle = cleanHandle
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      connectAccount({
        username: cleanHandle,
        displayName: displayTitle,
        accountType,
        followersCount: 14200,
        mediaCount: 38,
        reach28d: 48200,
        impressions28d: 79000,
        interactions28d: 6100,
        profilePictureUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`
      });

      setOAuthModalOpen(false);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      
      {/* 1. SAVING / LOADING SPINNER CARD (matching video 00:07, 00:12, 00:29, 00:54) */}
      {viewState === 'SAVING' && (
        <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 border border-slate-200 animate-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-[#1D64EC] flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
          <div className="text-xs font-bold text-slate-800">Saving...</div>
        </div>
      )}

      {/* 2. PARENT MODAL: "Continue in the Instagram window" (matching exact video 01:17) */}
      {viewState === 'PARENT_CARD' && (
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-150">
          {/* Gradient Instagram Icon */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <Instagram className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-950">
              Continue in the Instagram window
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Log in to Instagram and choose what to allow. This page updates as soon as you're done.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <button
              onClick={() => setViewState('WINDOW')}
              className="w-full py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Show the Instagram window
            </button>
            <button
              onClick={() => setOAuthModalOpen(false)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="text-[11px] text-slate-400 pt-1">
            We never see your Instagram password.
          </div>
        </div>
      )}

      {/* 3. GOOGLE CHROME INSTAGRAM POPUP WINDOW (matching exact video 01:00-01:16) */}
      {viewState === 'WINDOW' && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-150">
          
          {/* Windows / Chrome Style Header Bar (matching video 01:01) */}
          <div className="bg-[#E9EEF4] border-b border-slate-300 px-3.5 py-2 flex items-center justify-between text-xs text-slate-600 select-none">
            <div className="flex items-center gap-2 truncate">
              <Instagram className="w-3.5 h-3.5 text-pink-600 shrink-0" />
              <span className="font-medium text-slate-800 truncate text-[11px]">
                Log in • Instagram - Google Chrome
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-slate-500">
              <Minus 
                onClick={() => setViewState('PARENT_CARD')}
                className="w-3.5 h-3.5 cursor-pointer hover:text-slate-800" 
              />
              <Square className="w-3 h-3 cursor-pointer hover:text-slate-800" />
              <X 
                onClick={() => setOAuthModalOpen(false)} 
                className="w-3.5 h-3.5 cursor-pointer hover:text-rose-600 transition-colors" 
              />
            </div>
          </div>

          {/* Chrome URL Address Bar (matching video 01:02) */}
          <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 text-[11px] text-slate-500">
            <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate text-slate-700 font-mono text-[10px]">
              https://instagram.com/oauth/authorize?client_id={customAppId}&response_type=code
            </span>
          </div>

          {/* Instagram Interior Login Form (matching video 01:04-01:15) */}
          <div className="p-6 sm:p-8 flex flex-col items-center max-h-[82vh] overflow-y-auto">
            
            {/* Instagram Camera Icon & Logo */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Instagram className="w-8 h-8" />
              </div>
              <div className="text-2xl font-bold font-serif italic mt-2 tracking-tight text-slate-900">
                Instagram
              </div>
            </div>

            {/* Note */}
            <div className="text-center mb-5">
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs font-normal">
                Log in to link your Instagram Business or Creator account to <strong>CampusConnect</strong>.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="w-full space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone number, username or email
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="username or campus handle"
                  required
                  className="w-full bg-[#FAFAFA] border border-slate-300 rounded-lg px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full bg-[#FAFAFA] border border-slate-300 rounded-lg pl-3 pr-14 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Account Type Selector */}
              <div className="pt-1">
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => setAccountType('BUSINESS')}
                    className={`py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                      accountType === 'BUSINESS'
                        ? 'border-[#0095F6] bg-blue-50 text-[#0095F6]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Business Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('CREATOR')}
                    className={`py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                      accountType === 'CREATOR'
                        ? 'border-[#0095F6] bg-blue-50 text-[#0095F6]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Creator Account
                  </button>
                </div>
              </div>

              {/* Log In Button (exact blue color from video #0095F6) */}
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer mt-1"
              >
                Log In
              </button>

              <div className="flex items-center my-3 text-slate-400 text-xs">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-3 font-semibold uppercase text-[10px] text-slate-400">OR</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleLoginSubmit}
                className="w-full py-2 text-center text-xs font-semibold text-[#385185] hover:text-blue-900 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Log in with Facebook</span>
              </button>

              <div className="text-center pt-1">
                <span className="text-[11px] text-slate-600 hover:underline cursor-pointer">
                  Forgotten your password?
                </span>
              </div>
            </form>

            {/* Footer Links (matching video 01:05) */}
            <div className="mt-8 pt-4 border-t border-slate-200 w-full text-center text-[10px] text-slate-400 space-y-1">
              <div className="flex flex-wrap justify-center gap-2">
                <span>Meta</span>
                <span>About</span>
                <span>Blog</span>
                <span>Jobs</span>
                <span>Help</span>
                <span>API</span>
                <span>Privacy</span>
                <span>Terms</span>
              </div>
              <div className="pt-1">
                © 2026 Instagram from Meta
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
