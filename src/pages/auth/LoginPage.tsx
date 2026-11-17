import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Lock, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { 
    login, 
    register,
    navigateTo, 
    currentUser,
    entryUniversityContext,
    setEntryUniversityContext,
    selectedUniversity,
    setSelectedUniversity,
    getUniversityBySlug, 
    universities 
  } = useApp();

  const [mode, setMode] = useState<'SIGN_IN' | 'CREATE_ACCOUNT'>('SIGN_IN');
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);

  // Target university resolution: strictly reflects what the student/user selected earlier (never hardcoded)
  const targetUniversity = useMemo(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const uniParam = sp.get('uni') || sp.get('university') || sp.get('slug') || sp.get('campus');
      if (uniParam) {
        const found = getUniversityBySlug(uniParam);
        if (found) return found;
      }
      const redirectParam = sp.get('redirect') || '';
      if (redirectParam) {
        const cleanRedirect = redirectParam.split('?')[0];
        const parts = cleanRedirect.replace(/^\//, '').split('/');
        if (parts.length >= 2 && ['ig', 'u', 'university', 'submit'].includes(parts[0])) {
          const found = getUniversityBySlug(parts[1]);
          if (found) return found;
        }
      }
    }
    if (selectedUniversity) return selectedUniversity;
    if (entryUniversityContext) return entryUniversityContext;

    try {
      const storedSlug =
        localStorage.getItem('campusconnect_selected_uni') ||
        localStorage.getItem('campusconnect_entry_uni');
      if (storedSlug) {
        const found = getUniversityBySlug(storedSlug);
        if (found) return found;
      }
      const draftRaw = localStorage.getItem('campusconnect_active_draft');
      if (draftRaw) {
        const parsed = JSON.parse(draftRaw);
        if (parsed?.universitySlug) {
          const found = getUniversityBySlug(parsed.universitySlug);
          if (found) return found;
        }
      }
    } catch {}

    if (currentUser?.universitySlug) {
      const found = getUniversityBySlug(currentUser.universitySlug);
      if (found) return found;
    }

    return null;
  }, [entryUniversityContext, selectedUniversity, getUniversityBySlug, currentUser?.universitySlug]);

  const sortedUniversities = useMemo(() => {
    return (universities || [])
      .filter((u): u is NonNullable<typeof u> => Boolean(u && u.slug && u.name))
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [universities]);

  const handleSelectUniversityOnLogin = (slug: string) => {
    if (!slug) {
      setSelectedUniversity(null);
      setEntryUniversityContext(null);
      setShowSchoolPicker(false);
      return;
    }
    const chosen = getUniversityBySlug(slug);
    if (chosen) {
      setSelectedUniversity(chosen);
      setEntryUniversityContext(chosen);
      setShowSchoolPicker(false);
    }
  };

  const [authError, setAuthError] = useState<string | null>(null);

  // Switch between Sign in and Create account with lazy loading
  const handleSwitchMode = (targetMode: 'SIGN_IN' | 'CREATE_ACCOUNT') => {
    setAuthError(null);
    setIsLazyLoading(true);
    setTimeout(() => {
      setMode(targetMode);
      setIsLazyLoading(false);
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAuthError(null);
    setLoading(true);

    try {
      if (mode === 'CREATE_ACCOUNT') {
        const studentName = fullName.trim() || email.trim().split('@')[0] || 'Student';
        await register(studentName, email.trim(), password, targetUniversity?.slug);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to authenticate with those credentials. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">
      
      {/* 2-Column Split Screen Matching Image 1 Exactly */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        
        {/* ================================================================= */}
        {/* LEFT PANEL: CampusConnect brand, selected university (if any)     */}
        {/* ================================================================= */}
        <div
          className="lg:col-span-5 text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: targetUniversity?.primaryColor || '#3B4988' }}
        >
          
          {/* Subtle curved background accents */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/[0.04] pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-[450px] h-[450px] rounded-full bg-black/[0.10] pointer-events-none" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-white/[0.03] pointer-events-none" />

          {/* Top Bar: Brand Logo on Left, Back button on Right */}
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div 
              onClick={() => navigateTo('/')}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <span className="text-2xl font-black tracking-tight text-white">
                Campus<span className="text-white">Connect</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigateTo(targetUniversity?.slug ? `/ig/${targetUniversity.slug}` : '/')}
              className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer shadow-xs"
            >
              <span>{targetUniversity ? '‹ Back to page' : '‹ Back to home'}</span>
            </button>
          </div>

          {/* Center Main Content */}
          <div className="relative z-10 my-10 space-y-8 max-w-lg">
            
            {targetUniversity ? (
              /* Selected University Header Block */
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  {/* Circular Emblem with colored ring and lightning bolt */}
                  <div className="relative w-14 h-14 rounded-full bg-white p-1 shrink-0 flex items-center justify-center shadow-md">
                    <div className="w-full h-full rounded-full border-2 border-indigo-200 flex flex-col items-center justify-center text-center">
                      <span className="text-xs leading-none">⚡</span>
                      <span className="text-[7px] font-bold text-slate-800 leading-none">CampusConnect</span>
                      <span className="text-[10px] font-black text-[#1E3A8A] leading-none mt-0.5">
                        {targetUniversity.classYear || '2031'}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-100/90">
                      SUBMITTING TO
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight break-all mt-0.5">
                      {targetUniversity.instagramHandle}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-blue-100/90 mt-1">
                      <span>{targetUniversity.name}</span>
                      <button
                        type="button"
                        onClick={() => setShowSchoolPicker(!showSchoolPicker)}
                        className="text-[11px] underline text-white/80 hover:text-white cursor-pointer"
                      >
                        {showSchoolPicker ? 'Cancel' : 'Change'}
                      </button>
                    </div>
                  </div>
                </div>

                {showSchoolPicker && (
                  <div className="pt-1">
                    <select
                      value={targetUniversity.slug}
                      onChange={(e) => handleSelectUniversityOnLogin(e.target.value)}
                      className="w-full rounded-xl bg-white/95 text-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none shadow-sm cursor-pointer"
                    >
                      <option value="">No specific university (general login)</option>
                      {sortedUniversities.map((u) => (
                        <option key={u.id} value={u.slug}>
                          {u.name} ({u.instagramHandle})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              /* Neutral CampusConnect Header when no university was previously selected */
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/10 text-white text-[11px] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>University & Creator Network</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    Sign in to your CampusConnect account
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100/85 leading-relaxed">
                    Access your dashboard, manage Instagram pages, or choose your university to get featured on your class page.
                  </p>
                </div>

                {/* Optional quick university selector for students arriving directly */}
                <div className="pt-1 space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-100/80">
                    Submitting to a university page? (Optional)
                  </label>
                  <select
                    value=""
                    onChange={(e) => handleSelectUniversityOnLogin(e.target.value)}
                    className="w-full rounded-xl bg-white/15 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:text-slate-900 transition-colors cursor-pointer"
                  >
                    <option value="" className="text-slate-900">Select your university...</option>
                    {sortedUniversities.map((u) => (
                      <option key={u.id} value={u.slug} className="text-slate-900">
                        {u.name} ({u.instagramHandle})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Pill: Lock + $6 to get featured · secure checkout */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/10 text-white text-xs font-medium backdrop-blur-xs shadow-xs">
                <Lock className="w-3.5 h-3.5 text-white/90" />
                <span>$6 to get featured · secure checkout</span>
              </div>
            </div>

            {/* 3 Numbered Steps matching Image 1 */}
            <div className="space-y-5 pt-2">
              
              {/* Step 1 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-snug">
                    Add your photos & caption
                  </div>
                  <div className="text-xs text-blue-200/80 mt-0.5">
                    See exactly how the post will look
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-snug">
                    Pay $6 securely
                  </div>
                  <div className="text-xs text-blue-200/80 mt-0.5">
                    Stripe checkout
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-snug">
                    Get featured
                  </div>
                  <div className="text-xs text-blue-200/80 mt-0.5">
                    Your whole class sees it on their feed
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="relative z-10 text-xs text-blue-200/70 font-normal">
            © 2026 CampusConnect
          </div>

        </div>

        {/* ================================================================= */}
        {/* RIGHT PANEL: Welcome back / Create Account Card on light gray     */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 bg-[#F4F5F8] p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center">
          
          <div className="w-full max-w-[460px] bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 transition-all">
            
            {/* Lazy Loading Spinner state */}
            {isLazyLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-200">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-[#3B4988] animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900">
                    {mode === 'SIGN_IN' ? 'Loading account creation...' : 'Loading sign in...'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Preparing your personalized submission options...
                  </p>
                </div>
              </div>
            ) : mode === 'SIGN_IN' ? (
              /* ================= SIGN IN FORM (Image 1) ================= */
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Header */}
                <div className="space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome back
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {targetUniversity ? (
                      <>
                        Sign in to continue your post for <strong className="text-slate-900 font-semibold">{targetUniversity.instagramHandle}</strong>.
                      </>
                    ) : (
                      'Sign in to continue to your CampusConnect dashboard.'
                    )}
                  </p>
                </div>

                {/* Inline Auth Error Alert */}
                {authError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                  
                  {/* Email address */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#3B4988] focus:ring-1 focus:ring-[#3B4988] transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => navigateTo('/forgot-password')}
                        className="text-xs font-medium text-[#3B4988] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        autoComplete="current-password"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#3B4988] focus:ring-1 focus:ring-[#3B4988] transition-colors shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Keep me signed in for 30 days */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#3B4988] focus:ring-[#3B4988] cursor-pointer"
                      />
                      <span>Keep me signed in for 30 days</span>
                    </label>

                    {/* Admin portal backdoor link */}
                    <button
                      type="button"
                      onClick={() => navigateTo('/admin')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                      title="Master Admin Gateway"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Admin</span>
                    </button>
                  </div>

                  {/* Sign in Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-[#2B386C] hover:bg-[#222E58] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Sign in</span>
                  </button>

                  {/* Divider: New here? */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-slate-400 font-medium">New here?</span>
                    </div>
                  </div>

                  {/* Create a free account Button (triggers lazy load then opens registration) */}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('CREATE_ACCOUNT')}
                    className="w-full py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-bold text-sm shadow-2xs transition-colors cursor-pointer text-center"
                  >
                    Create a free account
                  </button>

                </form>

              </div>
            ) : (
              /* ================= CREATE ACCOUNT FORM ================= */
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Header */}
                <div className="space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Create an account
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {targetUniversity ? (
                      <>
                        Create your account to submit your post for <strong className="text-slate-900 font-semibold">{targetUniversity.instagramHandle}</strong>.
                      </>
                    ) : (
                      'Create your free CampusConnect account to get started.'
                    )}
                  </p>
                </div>

                {/* Inline Auth Error Alert */}
                {authError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#3B4988] focus:ring-1 focus:ring-[#3B4988] transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Email address */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#3B4988] focus:ring-1 focus:ring-[#3B4988] transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Create password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={10}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 10 chars (upper, lower, number & symbol)"
                        autoComplete="new-password"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#3B4988] focus:ring-1 focus:ring-[#3B4988] transition-colors shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Keep me signed in for 30 days */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#3B4988] focus:ring-[#3B4988] cursor-pointer"
                      />
                      <span>Keep me signed in for 30 days</span>
                    </label>
                  </div>

                  {/* Create account Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-[#2B386C] hover:bg-[#222E58] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Create account</span>
                  </button>

                  {/* Divider: Already have an account? */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-slate-400 font-medium">Already have an account?</span>
                    </div>
                  </div>

                  {/* Sign in button (triggers lazy load then switches to SIGN_IN) */}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('SIGN_IN')}
                    className="w-full py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-bold text-sm shadow-2xs transition-colors cursor-pointer text-center"
                  >
                    Sign in with existing account
                  </button>

                </form>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
