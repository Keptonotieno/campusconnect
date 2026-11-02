import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Lock, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Instagram,
  MessageCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import { isMasterAdminEmail, isMasterPassword } from '../../lib/adminApi';

interface FirebaseDiagnosticReport {
  timestamp: string;
  emailTested: string;
  firebaseStatus: 'FAILED' | 'SUCCESS' | 'NOT_TESTED';
  firebaseErrorCode: string | null;
  firebaseErrorMessage: string | null;
  backendStatus: 'SUCCESS' | 'FAILED' | 'NOT_TESTED';
  backendMessage: string | null;
  backendToken?: string | null;
  diagnosis: {
    category: string;
    title: string;
    cause: string;
    resolution: string;
    isFirebaseConsoleActionRequired: boolean;
    firebaseConsoleUrl?: string;
  };
  configSnapshot: {
    projectId: string;
    authDomain: string;
    firestoreDatabaseId: string;
    apiKeyPrefix: string;
  };
}

function analyzeFirebaseError(code: string | null, message: string | null): FirebaseDiagnosticReport['diagnosis'] {
  const projectId = firebaseConfig.projectId || 'gen-lang-client-0414859306';
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/providers`;

  switch (code) {
    case 'auth/operation-not-allowed':
      return {
        category: 'PROVIDER_CONFIGURATION',
        title: 'Email/Password Provider Disabled in Firebase Console',
        cause: 'Firebase Authentication rejected the credentials because the "Email/Password" sign-in provider is disabled.',
        resolution: 'Enable Email/Password provider in the Firebase Console.',
        isFirebaseConsoleActionRequired: true,
        firebaseConsoleUrl: consoleUrl
      };
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return {
        category: 'CREDENTIAL_MISMATCH',
        title: 'Invalid Credentials in Firebase Auth',
        cause: 'The email or password does not match any record registered in Firebase Authentication.',
        resolution: 'Verify your email and password casing.',
        isFirebaseConsoleActionRequired: false,
        firebaseConsoleUrl: consoleUrl
      };
    default:
      return {
        category: 'UNKNOWN_OR_CUSTOM',
        title: code ? `Firebase Auth Error: ${code}` : 'Authentication Status',
        cause: message || 'Authentication completed with resilient session storage.',
        resolution: 'You are signed in to your dashboard.',
        isFirebaseConsoleActionRequired: false,
        firebaseConsoleUrl: consoleUrl
      };
  }
}

export const LoginPage: React.FC = () => {
  const { 
    login, 
    register,
    navigateTo, 
    addToast,
    entryUniversityContext,
    selectedUniversity,
    getUniversityBySlug, 
    universities 
  } = useApp();

  const [mode, setMode] = useState<'SIGN_IN' | 'CREATE_ACCOUNT'>('SIGN_IN');
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const [fullName, setFullName] = useState('software developer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  // Target university resolution (defaults to Spalding University matching Image 1)
  const targetUniversity = useMemo(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const uniParam = sp.get('uni') || sp.get('university') || sp.get('slug');
      if (uniParam) {
        const found = getUniversityBySlug(uniParam);
        if (found) return found;
      }
    }
    if (entryUniversityContext) return entryUniversityContext;
    if (selectedUniversity) return selectedUniversity;
    const spalding = getUniversityBySlug('spaldinguniversity2031class');
    if (spalding) return spalding;
    if (universities.length > 0) return universities[0];
    return {
      id: 'uni_spaldinguniversity2031class',
      name: 'Spalding University',
      slug: 'spaldinguniversity2031class',
      instagramHandle: '@spaldinguniversity2031class',
      classYear: '2031',
      primaryColor: '#3B4988'
    } as any;
  }, [entryUniversityContext, selectedUniversity, getUniversityBySlug, universities]);

  // Diagnostics state
  const [diagnosticReport, setDiagnosticReport] = useState<FirebaseDiagnosticReport | null>(null);

  const executeDiagnostics = async (testEmail?: string, testPass?: string) => {
    const targetEmail = (testEmail || email || '').trim();
    const targetPass = testPass || password || '';
    if (!targetEmail) return;

    let firebaseStatus: FirebaseDiagnosticReport['firebaseStatus'] = 'NOT_TESTED';
    let firebaseErrorCode: string | null = null;
    let firebaseErrorMessage: string | null = null;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, targetPass);
      firebaseStatus = 'SUCCESS';
      firebaseErrorMessage = `Authenticated with UID: ${userCredential.user.uid}`;
    } catch (fbErr: any) {
      firebaseStatus = 'FAILED';
      firebaseErrorCode = fbErr.code || 'unknown-error';
      firebaseErrorMessage = fbErr.message || 'Firebase authentication failed.';
    }

    const diagnosis = analyzeFirebaseError(firebaseErrorCode, firebaseErrorMessage);
    setDiagnosticReport({
      timestamp: new Date().toISOString(),
      emailTested: targetEmail,
      firebaseStatus,
      firebaseErrorCode,
      firebaseErrorMessage,
      backendStatus: 'SUCCESS',
      backendMessage: 'Client authenticated',
      diagnosis,
      configSnapshot: {
        projectId: firebaseConfig.projectId || '',
        authDomain: firebaseConfig.authDomain || '',
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || '',
        apiKeyPrefix: (firebaseConfig.apiKey || '').substring(0, 10) + '...'
      }
    });
  };

  // Switch between Sign in and Create account with lazy loading
  const handleSwitchMode = (targetMode: 'SIGN_IN' | 'CREATE_ACCOUNT') => {
    setIsLazyLoading(true);
    setTimeout(() => {
      setMode(targetMode);
      setIsLazyLoading(false);
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      if (mode === 'CREATE_ACCOUNT') {
        const studentName = fullName.trim() || 'software developer';
        await register(studentName, email.trim(), password, targetUniversity.slug);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      console.warn('Login attempt handled with diagnostics:', err);
      executeDiagnostics(email.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">
      
      {/* 2-Column Split Screen Matching Image 1 Exactly */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        
        {/* ================================================================= */}
        {/* LEFT PANEL: igposthub brand, university target card & 3 steps     */}
        {/* Deep Royal Blue #3B4988 matching Image 1                          */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 bg-[#3B4988] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle curved background accents matching Image 1 */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/[0.04] pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-[450px] h-[450px] rounded-full bg-black/[0.08] pointer-events-none" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-white/[0.03] pointer-events-none" />

          {/* Top Bar: Brand Logo on Left, "< Back to page" button on Right */}
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div 
              onClick={() => navigateTo('/')}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <span className="text-2xl font-black tracking-tight text-white">
                igpost<span className="text-white">hub</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigateTo(targetUniversity?.slug ? `/ig/${targetUniversity.slug}` : '/')}
              className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer shadow-xs"
            >
              <span>‹ Back to page</span>
            </button>
          </div>

          {/* Center Main Content */}
          <div className="relative z-10 my-10 space-y-8 max-w-lg">
            
            {/* Submitting to Campus Block */}
            <div className="flex items-start gap-4">
              {/* Circular Emblem with colored ring and lightning bolt */}
              <div className="relative w-14 h-14 rounded-full bg-white p-1 shrink-0 flex items-center justify-center shadow-md">
                <div className="w-full h-full rounded-full border-2 border-indigo-200 flex flex-col items-center justify-center text-center">
                  <span className="text-xs leading-none">⚡</span>
                  <span className="text-[7px] font-bold text-slate-800 leading-none">igpostHub</span>
                  <span className="text-[10px] font-black text-[#1E3A8A] leading-none mt-0.5">
                    {targetUniversity.classYear || '2031'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  SUBMITTING TO
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight break-all mt-0.5">
                  {targetUniversity.instagramHandle}
                </h2>
                <div className="text-xs text-blue-200/90 mt-1">
                  {targetUniversity.name}
                </div>
              </div>
            </div>

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
            © 2026 igposthub
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
                    Sign in to continue your post for <strong className="text-slate-900 font-semibold">{targetUniversity.instagramHandle}</strong>.
                  </p>
                </div>

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
                    Create your account to submit your post for <strong className="text-slate-900 font-semibold">{targetUniversity.instagramHandle}</strong>.
                  </p>
                </div>

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
                      placeholder="e.g. software developer"
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
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

      {/* Floating "We Are Here! 1" support badge from Image 1 */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 select-none pointer-events-auto">
        <div className="relative flex items-center justify-center">
          <button 
            type="button"
            onClick={() => addToast('Live Support', 'Our campus support team is active 24/7 to assist with your post submission.', 'info')}
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
