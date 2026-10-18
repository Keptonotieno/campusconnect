import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Instagram, Check } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register, navigateTo } = useApp();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms || !businessName.trim() || !email.trim()) return;
    setLoading(true);
    await register(businessName.trim(), email.trim(), password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        {/* Left Side Phone Mockup with Warm Glow */}
        <div className="hidden md:flex md:col-span-5 items-center justify-center relative">
          <div className="absolute w-72 h-96 bg-gradient-to-tr from-pink-400/35 via-rose-300/30 to-amber-300/25 blur-3xl rounded-full pointer-events-none" />

          <div className="relative w-64 h-[490px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-900 ring-1 ring-slate-800">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20" />

            <div className="w-full h-full bg-white rounded-[36px] overflow-hidden flex flex-col p-4 text-xs font-sans">
              <div className="text-center font-bold text-sm tracking-tight text-slate-900 pt-5 pb-3">
                campusconnect
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full border-2 border-fuchsia-500 p-0.5 flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center font-bold text-[#1D64EC] text-sm">
                    C
                  </div>
                </div>
                <div className="flex-1 flex justify-around text-center">
                  <div>
                    <div className="font-extrabold text-slate-950">128</div>
                    <div className="text-[9px] text-slate-500">posts</div>
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-950">8.4K</div>
                    <div className="text-[9px] text-slate-500">followers</div>
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-950">210</div>
                    <div className="text-[9px] text-slate-500">following</div>
                  </div>
                </div>
              </div>

              <div className="pt-1 pb-2">
                <div className="font-bold text-slate-950">Campus Connect</div>
                <div className="text-[10px] text-slate-600">Student media, direct messages & community ✨</div>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] text-center my-2 text-slate-600 font-medium">
                <div className="py-1 bg-slate-50 border border-slate-200 rounded">Direct Messages</div>
                <div className="py-1 bg-slate-50 border border-slate-200 rounded">Comments</div>
                <div className="py-1 bg-slate-50 border border-slate-200 rounded">Analytics</div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 flex-1 pt-1">
                <div className="rounded-md bg-[#C7E3F4]" />
                <div className="rounded-md bg-[#FDE2B8]" />
                <div className="rounded-md bg-[#B9D5F9]" />
                <div className="rounded-md bg-[#A3E5D4]" />
                <div className="rounded-md bg-[#E7C6F3]" />
                <div className="rounded-md bg-[#FCE198]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sign up Form */}
        <div className="md:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#1D64EC] flex items-center justify-center text-white">
              <Instagram className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-950">
              campusconnect
            </span>
          </div>

          {/* 3 Step Breadcrumb (1 Sign up -> 2 Connect -> 3 Manage) */}
          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 mb-6 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-[#1D64EC]">
              <span className="w-4 h-4 rounded-full bg-[#1D64EC] text-white flex items-center justify-center text-[10px]">1</span>
              <span>Sign up</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">2</span>
              <span>Connect</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
              <span>Manage</span>
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">
            Sign up to manage your Instagram workspace in one place.
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Workspace or Organization name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Stanford Campus Press or Your Brand"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campus.edu"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:ring-1 focus:ring-[#1D64EC]"
              />
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                You'll connect Instagram on the next step through Instagram's official authorization dialog. We never see your Instagram password.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="agree"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="rounded border-slate-300 text-[#1D64EC] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="agree" className="text-xs text-slate-600 cursor-pointer">
                I agree to the <span onClick={() => navigateTo('/terms')} className="text-[#1D64EC] underline">Terms</span> and <span onClick={() => navigateTo('/privacy')} className="text-[#1D64EC] underline">Privacy policy</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreeTerms}
              className="w-full py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer mt-2"
            >
              {loading ? 'Creating workspace account...' : 'Create workspace account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            <span>Have an account? </span>
            <button
              onClick={() => navigateTo('/login')}
              className="text-[#1D64EC] font-semibold hover:underline cursor-pointer"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
