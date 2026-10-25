import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Check, 
  ArrowRight, 
  Grid, 
  MessageCircle, 
  MessageSquare, 
  BarChart3, 
  PlusSquare, 
  Users, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Instagram 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigateTo, isAuthenticated } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Which Instagram accounts can I connect?',
      a: 'Business and Creator accounts. If yours is a personal account, you can switch it for free in the Instagram app under Settings → Account type and tools.'
    },
    {
      q: 'Do you see or store my Instagram password?',
      a: 'Never. You connect directly through Instagram’s official authorization screen on Meta’s own servers. Your password is never shared with us or stored anywhere.'
    },
    {
      q: 'Can I manage more than one account?',
      a: 'Yes! You can link several Instagram Business or Creator accounts and switch between them in one click right from your sidebar.'
    },
    {
      q: 'Can I reply to direct messages?',
      a: 'Yes. Answer customer messages from your computer desk in a real-time chat interface built for keeping up with busy direct message inboxes.'
    },
    {
      q: 'How do I disconnect an account?',
      a: 'You can remove any linked account from your dashboard in Workspace Settings or Connected Accounts. All associated authorization access is immediately deleted.'
    },
    {
      q: 'How does CampusConnect student feature work?',
      a: 'CampusConnect allows university students to join their campus network and submit introduction photos for consideration on official university Instagram pages with automated watermark review and approval tracking.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. HERO SECTION (matching Screenshot 00:02 - 00:06 and 11:34) */}
      <section className="pt-10 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>For Students, Creators & Global Universities</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-slate-950 leading-[1.12]">
              Run your campus &<br />
              <span className="text-[#1D64EC]">Instagram from one place.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl font-normal">
              CampusConnect unites student communities at top abroad universities (Harvard, Oxford, Miami, Stanford and more) with unified Instagram management.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={() => navigateTo(isAuthenticated ? '/app/dashboard' : '/register')}
                className="px-6 py-3.5 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create business account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigateTo(isAuthenticated ? '/app/dashboard' : '/login')}
                className="px-6 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm transition-colors text-center cursor-pointer shadow-2xs"
              >
                Log in to your business
              </button>
            </div>

            {/* Trust checkmarks */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#1D64EC]" />
                <span>Official Instagram login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#1D64EC]" />
                <span>Multiple accounts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#1D64EC]" />
                <span>Disconnect any time</span>
              </div>
            </div>

          </div>

          {/* Right Hero Dashboard Mockup Card (Exact replica from screenshots 00:02 and 11:34) */}
          <div className="lg:col-span-5 relative">
            
            {/* The white dashboard card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-5 sm:p-6 space-y-4">
              
              {/* Window Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="text-[11px] font-semibold text-slate-400">
                  Dashboard · @yourbrand
                </div>
              </div>

              {/* Floating DM notification pill (top right) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-2.5 flex items-center gap-2.5 max-w-[240px] ml-auto animate-in slide-in-from-top-1">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1D64EC] font-bold text-xs flex items-center justify-center shrink-0">
                  J
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-[10px] font-bold text-slate-800">New message</div>
                  <div className="text-[10px] text-slate-500 truncate">Is the blue one in stock?</div>
                </div>
              </div>

              {/* Profile stats header */}
              <div className="flex items-center gap-4 pt-1">
                <div className="w-14 h-14 rounded-full border-2 border-fuchsia-500 p-0.5 flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-lg">
                    Y
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 text-center">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">248</div>
                    <div className="text-[10px] text-slate-400">posts</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">12.4K</div>
                    <div className="text-[10px] text-slate-400">followers</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">310</div>
                    <div className="text-[10px] text-slate-400">following</div>
                  </div>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[9px] font-medium text-slate-400">Reach · 28d</div>
                  <div className="text-xs font-extrabold text-slate-900 mt-0.5">48.2K</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[9px] font-medium text-slate-400">Engaged</div>
                  <div className="text-xs font-extrabold text-slate-900 mt-0.5">6.1K</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[9px] font-medium text-slate-400">Interactions</div>
                  <div className="text-xs font-extrabold text-slate-900 mt-0.5">9.8K</div>
                </div>
              </div>

              {/* Post Grid (Pastel tiles from screenshot) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="aspect-square rounded-xl bg-[#BFDBFE]" />
                <div className="aspect-square rounded-xl bg-gradient-to-br from-[#FEF08A] to-[#FBCFE8]" />
                <div className="aspect-square rounded-xl bg-[#DDD6FE]" />
                <div className="aspect-square rounded-xl bg-[#BBF7D0]" />
                <div className="aspect-square rounded-xl bg-[#FED7AA]" />
                <div className="aspect-square rounded-xl bg-[#FDE047]" />
              </div>

              {/* Floating reply card overlay */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-2.5 flex items-center justify-between gap-2 max-w-[280px]">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-800">maya: Do you deliver on weekends?</div>
                  <div className="text-[9px] text-[#1D64EC] font-medium mt-0.5">We deliver Saturdays!</div>
                </div>
                <button
                  onClick={() => navigateTo(isAuthenticated ? '/app/inbox' : '/login')}
                  className="px-2.5 py-1 rounded-lg bg-[#1D64EC] text-white text-[10px] font-bold shrink-0 hover:bg-blue-600 cursor-pointer"
                >
                  Reply
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>


      {/* 2. SECTION: EVERYTHING IN ONE DASHBOARD (Matching Screenshot 00:04 / 11:34) */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t border-slate-100">
        
        <div className="max-w-2xl mb-12 sm:mb-16">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Everything in one dashboard
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
            The day-to-day of Instagram,<br />
            without the phone juggling.
          </h2>
        </div>

        {/* 6 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Posts at a glance */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Grid className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Posts at a glance</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Your whole grid with likes and comments on every post. Open one to see it in full, carousels and videos included.
            </p>
          </div>

          {/* Card 2: Comments, handled */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Comments, handled</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Read every comment and reply without opening the app. Hide spam or delete what doesn't belong.
            </p>
          </div>

          {/* Card 3: One inbox for DMs */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">One inbox for DMs</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Answer customer messages from your desk, in a proper chat view built for keeping up with a busy inbox.
            </p>
          </div>

          {/* Card 4: Insights that matter */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Insights that matter</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Reach, views, engagement and interactions for the last 28 days, plus the numbers behind each post.
            </p>
          </div>

          {/* Card 5: Publish from here */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <PlusSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Publish from here</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Upload a picture or a carousel of up to ten, write the caption, preview it, and post straight to your feed.
            </p>
          </div>

          {/* Card 6: Every account you run */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D64EC] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950">Every account you run</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Link several Instagram accounts and switch between them in one click. Ideal for brands with more than one page.
            </p>
          </div>

        </div>

      </section>

      {/* 3. SECTION: HOW IT WORKS (Set up in three steps - matching Screenshot 00:01 / 11:34) */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Title */}
          <div className="lg:col-span-4 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1D64EC]">
              How it works
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
              Set up in<br />
              <span className="text-[#1D64EC]">three steps.</span>
            </h2>
            <button
              onClick={() => navigateTo(isAuthenticated ? '/app/dashboard' : '/register')}
              className="px-5 py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <span>Get started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Steps */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
                1
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-950">Create a business account</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Sign up with your email. It takes under a minute.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
                2
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-950">Connect your Instagram</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Log in through Instagram’s own screen and choose what to allow. We never see your password.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
                3
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-950">Manage it all here</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Your posts, comments, messages and insights load straight away. Add more accounts whenever you like.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* 3 Security Badges (Matching Screenshot 00:01 / 11:34) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-950">Official Instagram login</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              You connect through Instagram itself. Your password is never shared with us.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-950">You choose the access</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instagram shows exactly what you’re allowing before you connect.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-950">Disconnect any time</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Remove an account from your dashboard and its access is deleted with it.
            </p>
          </div>

        </div>

      </section>

      {/* 5. SECTION: FAQ ("Good questions, straight answers." - matching Screenshot 00:01 / 11:34) */}
      <section id="faq" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full border-t border-slate-100">
        <div className="text-left mb-10 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Good questions,<br />
            straight answers.
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all shadow-2xs"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {faq.q}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1D64EC] flex items-center justify-center shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. BIG BLUE CTA BANNER (matching Screenshot 00:00 / 00:18 / 11:34) */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-r from-[#1858D9] via-[#1D64EC] to-[#2565EE] p-8 sm:p-14 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Bring your Instagram<br />
              into one dashboard.
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 font-normal">
              Create your business account, connect Instagram, and you’re managing it in minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => navigateTo(isAuthenticated ? '/app/dashboard' : '/register')}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#1D64EC] font-extrabold text-xs sm:text-sm shadow-md transition-colors text-center cursor-pointer"
            >
              Create business account
            </button>
            <button
              onClick={() => navigateTo(isAuthenticated ? '/app/dashboard' : '/login')}
              className="px-6 py-3.5 rounded-xl border border-white/30 hover:bg-white/10 text-white font-extrabold text-xs sm:text-sm transition-colors text-center cursor-pointer"
            >
              Business login
            </button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER (matching Screenshot 00:00 / 11:34) */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-10 px-4 sm:px-6 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4 text-center">
          
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-[#1D64EC] flex items-center justify-center text-white">
              <Instagram className="w-3 h-3" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              campus<span className="text-[#1D64EC]">connect</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">global university & creator network</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <button onClick={() => navigateTo('/terms')} className="hover:text-slate-900 cursor-pointer">Terms</button>
            <button onClick={() => navigateTo('/privacy')} className="hover:text-slate-900 cursor-pointer">Privacy</button>
            <button onClick={() => navigateTo('/privacy')} className="hover:text-slate-900 cursor-pointer">Data deletion</button>
            <button onClick={() => navigateTo('/')} className="hover:text-slate-900 cursor-pointer">Campus Network</button>
          </div>

          <div className="text-[11px] text-slate-400 max-w-lg leading-relaxed">
            Not affiliated with or endorsed by Instagram or Meta. © 2026 CampusConnect. All rights reserved.
          </div>

        </div>
      </footer>

    </div>
  );
};
