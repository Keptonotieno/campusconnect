import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Grid, MessageSquare, MessageCircle, BarChart3, Info, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isStudentMode, setIsStudentMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await login(email.trim(), password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-12 font-sans selection:bg-blue-600 selection:text-white">
      
      <div className="flex-1 flex items-center justify-center max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
          
          {/* Left Column: Realistic iPhone Frame Mockup (Desktop - matching screenshots 00:24, 00:35, 00:53) */}
          <div className="hidden lg:flex lg:col-span-6 justify-center relative">
            
            {/* Ambient colorful glow behind the phone */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 via-rose-500/25 to-blue-600/25 blur-3xl rounded-full transform -rotate-6" />

            {/* Phone Chassis */}
            <div className="relative w-[300px] h-[610px] bg-slate-950 rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-800 border-[3px] border-slate-700/60 flex flex-col">
              
              {/* Dynamic Island / Notch */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20 flex items-center justify-end pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#18181b] border border-slate-800" />
              </div>

              {/* Inner Screen */}
              <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col p-4 pt-10 text-slate-800 select-none shadow-inner">
                
                {/* Brand in phone */}
                <div className="flex items-center justify-center pt-1 pb-3">
                  <span className="text-sm font-extrabold tracking-tight">
                    <span className="text-slate-900">campus</span>
                    <span className="text-[#1D64EC]">connect</span>
                  </span>
                </div>

                {/* Profile Header */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-12 h-12 rounded-full border-2 border-fuchsia-500 p-0.5 shrink-0 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-sm">
                      Y
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-3 text-center">
                    <div>
                      <div className="text-xs font-bold text-slate-900">248</div>
                      <div className="text-[9px] text-slate-400">posts</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">12.4K</div>
                      <div className="text-[9px] text-slate-400">followers</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">310</div>
                      <div className="text-[9px] text-slate-400">following</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-left">
                  <div className="text-xs font-extrabold text-slate-900">Your Brand</div>
                  <div className="text-[10px] text-slate-500">Handmade goods · Ships worldwide</div>
                </div>

                {/* 4 Feature Tabs */}
                <div className="grid grid-cols-4 gap-1.5 pt-4 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 flex flex-col items-center gap-1">
                    <Grid className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[9px] font-medium text-slate-500">Posts</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 flex flex-col items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[9px] font-medium text-slate-500">Comments</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 flex flex-col items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[9px] font-medium text-slate-500">DMs</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 flex flex-col items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[9px] font-medium text-slate-500">Insights</span>
                  </div>
                </div>

                {/* Post Grid */}
                <div className="grid grid-cols-3 gap-1.5 pt-4 flex-1">
                  <div className="rounded-xl bg-[#BFDBFE]" />
                  <div className="rounded-xl bg-gradient-to-br from-[#FEF08A] to-[#FBCFE8]" />
                  <div className="rounded-xl bg-[#DDD6FE]" />
                  <div className="rounded-xl bg-[#BBF7D0]" />
                  <div className="rounded-xl bg-[#FED7AA]" />
                  <div className="rounded-xl bg-[#FDE047]" />
                </div>

              </div>

            </div>

          </div>

          {/* Right Column: Exact Login Card from Screenshots 00:24, 11:34:41, 11:35:47 */}
          <div className="lg:col-span-6 flex flex-col items-center">
            
            <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl space-y-6">
              
              {/* Logo with Colorful Gradient */}
              <div className="text-center space-y-1">
                <div 
                  onClick={() => navigateTo('/')}
                  className="inline-block cursor-pointer"
                >
                  <span className="text-3xl font-extrabold tracking-tight">
                    <span className="text-slate-900">campus</span>
                    <span className="text-[#1D64EC]">connect</span>
                  </span>
                </div>
                <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
                  GLOBAL CAMPUS & CREATOR NETWORK
                </div>
              </div>

              {/* Title & Description */}
              <div className="text-center space-y-1">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  {isStudentMode ? 'Log in to Campus Connect Student Hub' : 'Log in to your CampusConnect dashboard'}
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  {isStudentMode 
                    ? 'Track your featured submission, view university community, and get updates.'
                    : 'Posts, comments, messages, university communities and insights in one place.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* Info Note from Screenshot */}
                <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Use your <strong className="text-slate-700">CampusConnect</strong> email and password, not your Instagram login.
                  </span>
                </div>

                {/* Keep logged in */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="rounded text-[#1D64EC] focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Keep me logged in</span>
                  </label>
                </div>

                {/* Blue Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Log in'}
                </button>

                {/* OR & Forgot password */}
                <div className="text-center pt-2 space-y-2">
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    OR
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('/forgot-password')}
                    className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>

                  {/* Stealth Admin Portal Link (Positioned directly beneath at the red mark from user image) */}
                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => navigateTo('/admin')}
                      className="text-[11px] text-slate-400/90 hover:text-slate-700 cursor-pointer transition-colors flex items-center gap-1 select-none font-medium hover:underline"
                      title="Admin Portal Access"
                    >
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Admin Portal</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Bottom Card Area */}
              <div className="pt-4 border-t border-slate-100 text-center text-xs">
                <span className="text-slate-500">New here? </span>
                <button
                  onClick={() => navigateTo('/register')}
                  className="font-bold text-[#1D64EC] hover:underline cursor-pointer"
                >
                  Create a business account
                </button>
              </div>

            </div>

            {/* Sub-link below card (Matching Screenshot 11:34:41 / 11:35:47) */}
            <div className="mt-4 text-center text-xs text-slate-500">
              <span>Submitting to a student page? </span>
              <button
                onClick={() => setIsStudentMode(!isStudentMode)}
                className="font-bold text-slate-800 hover:underline cursor-pointer"
              >
                {isStudentMode ? 'Switch to business login' : 'Use the student login'}
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center pt-8 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-center gap-4 text-slate-500 font-medium">
          <button onClick={() => navigateTo('/')} className="hover:text-slate-900">Home</button>
          <button onClick={() => navigateTo('/#features')} className="hover:text-slate-900">Features</button>
          <button onClick={() => navigateTo('/terms')} className="hover:text-slate-900">Terms</button>
          <button onClick={() => navigateTo('/privacy')} className="hover:text-slate-900">Privacy</button>
          <button onClick={() => navigateTo('/register')} className="hover:text-slate-900">Sign up</button>
        </div>
        <div>
          © 2026 CampusConnect. Not affiliated with or endorsed by Instagram or Meta.
        </div>
      </footer>

    </div>
  );
};
