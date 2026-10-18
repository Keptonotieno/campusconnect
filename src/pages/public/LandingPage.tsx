import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Check, 
  ArrowRight, 
  MessageSquare, 
  MessageCircle, 
  BarChart3, 
  Users, 
  ShieldCheck, 
  Send,
  Sparkles,
  Lock,
  Instagram
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigateTo, isAuthenticated } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Which Instagram accounts can/cannot connect?',
      a: 'Business and Creator accounts. If yours is a personal account, you can switch it for free in the Instagram app under Settings > Account type and tools.'
    },
    {
      q: 'Do you see or store my Instagram password?',
      a: 'No. You connect through Instagram itself via Meta OAuth. Your password is never shared with CampusConnect and we only receive secure scoped tokens.'
    },
    {
      q: 'Can I manage more than one account?',
      a: 'Yes, you can link several Instagram Business and Creator accounts and switch between them in one click from the dashboard sidebar.'
    },
    {
      q: 'Can I reply to direct messages in CampusConnect?',
      a: 'Yes, you can read and reply to incoming customer messages in the unified inbox right from your computer keyboard.'
    },
    {
      q: 'How do I disconnect an account?',
      a: 'You can remove an account at any time from your settings. The access token is deleted immediately and all permissions are revoked.'
    }
  ];

  const features = [
    {
      icon: Send,
      title: 'One inbox for DMs',
      description: 'Answer customer and student inquiries from your desk, with a dedicated chat interface built for busy campus teams.'
    },
    {
      icon: MessageCircle,
      title: 'Comments, handled',
      description: "Read every comment and reply without opening the app. Moderate feedback, hide spam, or filter what doesn't belong."
    },
    {
      icon: BarChart3,
      title: 'Insights that matter',
      description: 'Track reach, views, engagement, and interactions for the last 28 days across all your connected profiles.'
    },
    {
      icon: Users,
      title: 'Every account you run',
      description: 'Link several official Instagram accounts and switch between them in one click. Ideal for organizations with multiple pages.'
    },
    {
      icon: Sparkles,
      title: 'Instant synchronization',
      description: 'Live real-time updates for incoming direct messages, notifications, and customer comments with zero latency.'
    },
    {
      icon: ShieldCheck,
      title: 'Official Meta security',
      description: 'Connect securely via official Meta Graph API OAuth dialogs. No passwords stored, with instant permission revocation.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      
      {/* 1. HERO SECTION */}
      <section className="pt-14 pb-20 px-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Pill Capsule */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D64EC]" />
              <span>For Instagram Business and Creator accounts</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-slate-950 leading-[1.12]">
              Run your Instagram<br />
              business from one<br />
              place.
            </h1>

            {/* Subtitle */}
            <p className="text-base text-slate-600 leading-relaxed max-w-lg font-normal">
              Connect your business accounts and handle comments, direct messages, and real-time insights in a single unified dashboard with CampusConnect.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isAuthenticated ? (
                <button
                  onClick={() => navigateTo('/app/dashboard')}
                  className="px-6 py-3.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Open my dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigateTo('/register')}
                    className="px-6 py-3.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Create business account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigateTo('/login')}
                    className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm transition-colors cursor-pointer shadow-xs"
                  >
                    Log in to your business
                  </button>
                </>
              )}
            </div>

            {/* Trust Checklist (Evenly distributed) */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#1D64EC] stroke-[2.5]" />
                <span>Official Meta OAuth</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#1D64EC] stroke-[2.5]" />
                <span>Multiple accounts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#1D64EC] stroke-[2.5]" />
                <span>Disconnect any time</span>
              </div>
            </div>
          </div>

          {/* Right Product Mockup */}
          <div className="lg:col-span-6 relative">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 border border-slate-200/90 relative">
              
              {/* Window dots & header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="ml-2 font-medium text-slate-600">campusconnect • yourbrand</span>
                </div>
              </div>

              {/* Account Profile Header */}
              <div className="py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-2 border-fuchsia-500 p-0.5 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-800 text-lg">
                      Y
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-7 text-center">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">248</div>
                    <div className="text-[11px] text-slate-400 font-medium">followers</div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">12.4K</div>
                    <div className="text-[11px] text-slate-400 font-medium">reached</div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">98%</div>
                    <div className="text-[11px] text-slate-400 font-medium">response rate</div>
                  </div>
                </div>
              </div>

              {/* Metric Box Strip */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Reach · 28d</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">48.2K</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Engaged</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">6.1K</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Interactions</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">9.8K</div>
                </div>
              </div>

              {/* 6 Pastel Grid Squares */}
              <div className="grid grid-cols-3 gap-3">
                <div className="aspect-square rounded-2xl bg-[#C7E3F4]" />
                <div className="aspect-square rounded-2xl bg-[#FDE2B8]" />
                <div className="aspect-square rounded-2xl bg-[#B9D5F9]" />
                <div className="aspect-square rounded-2xl bg-[#A3E5D4]" />
                <div className="aspect-square rounded-2xl bg-[#E7C6F3]" />
                <div className="aspect-square rounded-2xl bg-[#FCE198]" />
              </div>

              {/* Floating DM notification toast */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-3 shadow-xl border border-slate-200/80 flex items-center gap-3 max-w-[240px]">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1D64EC] font-bold flex items-center justify-center text-xs shrink-0">
                  J
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium">New message</div>
                  <div className="text-xs text-slate-800 font-semibold truncate">Is the blue one in stock?</div>
                </div>
              </div>

              {/* Floating Comment Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl border border-slate-200/80 max-w-[280px] space-y-2">
                <div className="text-xs text-slate-800">
                  <strong className="text-slate-950 mr-1.5 font-bold">maya.k</strong>
                  <span>Do you deliver on weekends?</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="Yes, Saturdays too!"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 font-medium"
                  />
                  <button className="px-3 py-1 rounded-lg bg-[#1D64EC] text-white text-xs font-bold shadow-xs">
                    Reply
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 2. SECTION 2: EVERYTHING IN ONE DASHBOARD (3x2 Grid Evenly Distributed) */}
      <section id="features-section" className="py-20 px-6 max-w-6xl mx-auto w-full">
        <div className="text-left mb-12">
          <span className="text-xs font-bold text-[#1D64EC] uppercase tracking-wider block mb-2 font-mono">
            EVERYTHING IN ONE DASHBOARD
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
            The day-to-day of Instagram,<br className="hidden sm:inline" />
            without the phone juggling.
          </h2>
        </div>

        {/* 6 Features - Evenly distributed in 3 equal columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between h-full"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#EBF2FE] text-[#1D64EC] flex items-center justify-center mb-5 shrink-0">
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-base font-bold text-slate-950 mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. SECTION 3: HOW IT WORKS */}
      <section id="how-it-works-section" className="py-20 px-6 max-w-6xl mx-auto w-full">
        
        {/* Top 3-step banner card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Box */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold text-[#1D64EC] uppercase tracking-wider block font-mono">
                HOW IT WORKS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
                Set up in<br />
                three steps.
              </h2>
              <div className="pt-2">
                <button
                  onClick={() => navigateTo(isAuthenticated ? '/app/dashboard' : '/register')}
                  className="px-6 py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Get started →</span>
                </button>
              </div>
            </div>

            {/* Right Steps list */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="p-4.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-[#1D64EC] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-950">Create a business account</h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">Sign up with your email. It takes under a minute.</p>
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-[#1D64EC] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-950">Connect your Instagram</h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">Log in through Instagram's own screen and choose what to allow. We never see your password.</p>
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-[#1D64EC] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-950">Manage it all here</h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">Your comments, messages and insights load straight away into CampusConnect. Add more accounts whenever you like.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3 Trust Cards below (Evenly distributed 3-column row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3.5">
            <Check className="w-5 h-5 text-emerald-500 stroke-[2.5] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">Official Instagram login</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
                You connect through Instagram itself. Your password is never shared with us.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3.5">
            <Check className="w-5 h-5 text-emerald-500 stroke-[2.5] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">You choose the access</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
                Instagram shows exactly what you're allowing before you connect.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3.5">
            <Check className="w-5 h-5 text-emerald-500 stroke-[2.5] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">Disconnect any time</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
                Remove an account from your dashboard and its access is deleted with it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION 4: FAQ */}
      <section id="faq-section" className="py-20 px-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Heading */}
          <div className="lg:col-span-5 space-y-2">
            <span className="text-xs font-bold text-[#1D64EC] uppercase tracking-wider block font-mono">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
              Good questions,<br />
              straight answers.
            </h2>
          </div>

          {/* Right Column: Questions Accordion */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-4.5 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-900 hover:text-[#1D64EC] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ml-4 transition-colors ${
                      isOpen ? 'bg-[#1D64EC] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isOpen ? '✕' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4.5 pb-4.5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 font-normal">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 5. SECTION 5: BLUE BOTTOM CTA BANNER */}
      <section className="pb-20 px-6 max-w-6xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-r from-[#1853CE] to-[#2563EB] p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-lg text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Bring your Instagram<br className="hidden sm:inline" />
              into one dashboard.
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-normal">
              Create your business account, connect Instagram, and you're managing customer communication in minutes with CampusConnect.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            {isAuthenticated ? (
              <button
                onClick={() => navigateTo('/app/dashboard')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[#1D64EC] font-bold text-xs hover:bg-slate-50 shadow-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Open my dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigateTo('/register')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[#1D64EC] font-bold text-xs hover:bg-slate-50 shadow-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  Create business account
                </button>
                <button
                  onClick={() => navigateTo('/login')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-700/60 hover:bg-blue-700 text-white font-semibold text-xs border border-blue-400/30 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Business login
                </button>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
};
