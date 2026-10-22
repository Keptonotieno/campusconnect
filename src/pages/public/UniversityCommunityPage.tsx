import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  MapPin, 
  Instagram, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  ShieldCheck, 
  Eye, 
  ArrowRight,
  Search,
  Users,
  AlertCircle
} from 'lucide-react';
import { University } from '../../types';

interface UniversityCommunityPageProps {
  university: University;
}

export const UniversityCommunityPage: React.FC<UniversityCommunityPageProps> = ({ university }) => {
  const { 
    submissions, 
    navigateTo, 
    isAuthenticated, 
    setEntryUniversityContext,
    addToast 
  } = useApp();

  // Accordion open states
  const [openFaq, setOpenFaq] = useState<number | null>(0); // First open by default as in video
  const [showDirectory, setShowDirectory] = useState(false);
  const [searchDirectory, setSearchDirectory] = useState('');

  // Primary brand colors for this specific university
  const primaryColor = university.primaryColor || '#004B87';
  const accentColor = university.accentColor || '#0284C7';
  const tagline = university.tagline || `${university.name} forever.`;
  const classYear = university.classYear || '2031';

  // Filter approved & published submissions for this university
  const universityFeaturedPosts = useMemo(() => {
    return submissions.filter(
      (s) => (s.universityId === university.id || s.universitySlug === university.slug) &&
             s.moderationStatus === 'APPROVED' &&
             s.publishingStatus === 'PUBLISHED'
    );
  }, [submissions, university]);

  // Handle CTA to get featured for this university
  const handleBuildProfile = () => {
    if (!university.communityEnabled) {
      addToast('Campus Inactive', 'This campus network is currently deactivated by administration. Submissions are paused.', 'info');
      return;
    }
    setEntryUniversityContext(university);
    if (!isAuthenticated) {
      addToast('Create Your Account', `Sign up to submit your introduction for ${university.name}.`, 'info');
      navigateTo(`/register?uni=${university.slug}`);
    } else {
      navigateTo(`/app/submit?uni=${university.slug}`);
    }
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: "How long until I'm posted?",
      a: "Most profiles are reviewed and posted within 24-48 hours of payment."
    },
    {
      q: "Can I see my post before paying?",
      a: "Yes! You'll see a complete live preview of your photos, handle, and formatted caption before proceeding to the $6 Stripe checkout."
    },
    {
      q: "Is my payment secure?",
      a: "Yes. All transactions are securely processed directly through Stripe with 256-bit SSL encryption. We never see or store your payment details."
    },
    {
      q: "Do I need an Instagram account?",
      a: "Yes, you need a public or personal Instagram handle so classmates and future friends can find, tag, and connect with you."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Deactivated Notice Banner if campus is disabled */}
      {!university.communityEnabled && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs font-bold border-b border-amber-600 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-950 shrink-0" />
          <span>Notice: This campus portal is currently paused by administration. Submissions will reopen soon.</span>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 1. TOP NAVBAR / BRAND BAR                                           */}
      {/* ------------------------------------------------------------------- */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Left: Crest + Name + Handle link */}
          <div className="flex items-center gap-3">
            <img 
              src={university.logoUrl} 
              alt={university.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 shadow-2xs shrink-0 bg-white p-0.5"
            />
            <div className="leading-tight">
              <div className="font-extrabold text-sm sm:text-base text-slate-950 tracking-tight">
                {university.name}
              </div>
              <a 
                href={university.instagramProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 font-mono"
              >
                <span>{university.instagramHandle}</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Right: Submissions link + Get featured button */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (!isAuthenticated) {
                  navigateTo(`/login?uni=${university.slug}`);
                } else {
                  navigateTo('/app/student');
                }
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer px-2 py-1.5 hidden sm:block"
            >
              My submissions
            </button>

            <button
              onClick={handleBuildProfile}
              style={{ backgroundColor: primaryColor }}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Get featured</span>
            </button>
          </div>

        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* 2. HERO SECTION (EXACT LAYOUT FROM VIDEO)                           */}
      {/* ------------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-14 bg-gradient-to-b from-slate-50/50 via-white to-white">
        
        {/* Subtle decorative brand color glow */}
        <div 
          className="absolute -top-32 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Accepting profiles pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Accepting profiles now</span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-mono text-slate-500">LIVE ON IG</span>
              </div>

              {/* Big bold headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-slate-950 leading-[1.07]">
                You're not just <br />
                joining college. <br />
                <span style={{ color: primaryColor }}>
                  You're joining the spotlight.
                </span>
              </h1>

              {/* Subheadline */}
              <div className="space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
                <div>
                  Get featured on <strong className="text-slate-950 font-bold">{university.instagramHandle}</strong>
                </div>
                <div className="text-slate-500 text-xs sm:text-sm">
                  {tagline}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center gap-3.5 flex-wrap">
                <button
                  onClick={handleBuildProfile}
                  style={{ backgroundColor: primaryColor }}
                  className="px-6 sm:px-7 py-3.5 rounded-xl text-white font-bold text-sm sm:text-base shadow-md hover:opacity-90 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Build my profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={scrollToHowItWorks}
                  className="px-5 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-semibold text-sm transition-all cursor-pointer"
                >
                  How it works
                </button>
              </div>

              {/* Security / trust badge */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium pt-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>One-time payment. Secured by Stripe</span>
              </div>

            </div>

            {/* Right Column: Instagram Post Card Mockup */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-[340px] sm:max-w-[360px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-3.5 space-y-3 relative select-none">
                
                {/* IG Post Header */}
                <div className="flex items-center justify-between px-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <img 
                      src={university.logoUrl} 
                      alt="" 
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 bg-white" 
                    />
                    <span className="font-bold text-xs text-slate-900 tracking-tight">
                      {university.instagramHandle.replace('@', '')}
                    </span>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>

                {/* IG Image Box */}
                <div 
                  className="aspect-[4/5] rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 text-center text-white shadow-inner"
                  style={{
                    background: `linear-gradient(145deg, ${primaryColor} 0%, ${accentColor} 100%)`
                  }}
                >
                  {/* Floating Live Badge */}
                  <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live on IG in 24-48h</span>
                  </div>

                  {/* Centered Graphic / Headline */}
                  <div className="space-y-1 z-10">
                    <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-2 text-white">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                      Meet you.
                    </div>
                    <div className="text-xs text-white/90 font-medium">
                      Your pictures go here.
                    </div>
                  </div>

                  {/* Floating + New followers Sticker */}
                  <div className="absolute bottom-3 right-3 bg-white text-slate-900 text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-slate-100 animate-in fade-in">
                    <span className="text-emerald-600 font-extrabold">+</span>
                    <span>New followers</span>
                  </div>
                </div>

                {/* IG Post Actions Bar */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="flex items-center gap-3 text-slate-800">
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500 hover:scale-110 transition-transform cursor-pointer" />
                    <MessageCircle className="w-5 h-5 hover:text-slate-600 cursor-pointer" />
                    <Send className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                  </div>
                  <Bookmark className="w-4 h-4 text-slate-800 hover:text-slate-600 cursor-pointer" />
                </div>

                {/* IG Post Caption info */}
                <div className="px-1 text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-[11px]">
                    Liked by your future classmates
                  </div>
                  <div className="text-slate-700 text-[11px] leading-snug">
                    <strong className="text-slate-900">{university.instagramHandle.replace('@', '')}</strong>{' '}
                    Say hi to @you 👋 Welcome to the Class of {classYear}! #{university.slug} #Spotlight
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* 3. 4 METRIC HIGHLIGHT CARDS (AS IN VIDEO)                           */}
      {/* ------------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-6 sm:py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
              ONE-TIME FEE
            </div>
            <div className="text-3xl font-black text-slate-950">
              $6
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
              PICTURES PER PROFILE
            </div>
            <div className="text-3xl font-black text-slate-950">
              8
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
              TIME TO DELIVER
            </div>
            <div className="text-3xl font-black text-slate-950">
              24-48h
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
              BE ONE OF THE FIRST
            </div>
            <div className="text-3xl font-black text-slate-950" style={{ color: primaryColor }}>
              New
            </div>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* 4. HOW IT WORKS SECTION (THREE STEPS TO GO LIVE)                    */}
      {/* ------------------------------------------------------------------- */}
      <section id="how-it-works-section" className="max-w-6xl mx-auto px-6 py-14 sm:py-20 border-t border-slate-100">
        
        <div className="space-y-1 mb-10">
          <div 
            className="text-xs uppercase font-extrabold tracking-widest"
            style={{ color: primaryColor }}
          >
            HOW IT WORKS
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
            Three steps to go live.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-400 font-mono">01</div>
            <h3 className="text-base sm:text-lg font-bold text-slate-950">
              Create your account
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Sign up with your email in under a minute.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-400 font-mono">02</div>
            <h3 className="text-base sm:text-lg font-bold text-slate-950">
              Build your profile
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Upload your pictures, your handle and a few details, then preview the post.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-400 font-mono">03</div>
            <h3 className="text-base sm:text-lg font-bold text-slate-950">
              Pay once, go live
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              A one-time $6 fee through Stripe. You're posted on {university.instagramHandle} within 24-48 hours.
            </p>
          </div>

        </div>

      </section>

      {/* ------------------------------------------------------------------- */}
      {/* 5. WHAT GOES IN YOUR PROFILE SECTION                                */}
      {/* ------------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-2xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-950 tracking-tight">
                What goes in your profile
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Everything needed for your feature post. It takes about five minutes.
              </p>
            </div>
            
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Preview before you pay</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-950">Your pictures</div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Up to 8, in the order you choose
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-950">Your @handle</div>
              <div className="text-xs text-slate-500 leading-relaxed">
                So everyone can find and follow you
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-950">3+ hashtags</div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Your hometown, major, interests
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-sm text-slate-950">A few details</div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Major, year, a short bio — all optional
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* 6. FAQ ACCORDION SECTION                                            */}
      {/* ------------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-14 sm:py-20 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* FAQ Left Column */}
          <div className="lg:col-span-4 space-y-2">
            <div 
              className="text-xs uppercase font-extrabold tracking-widest"
              style={{ color: primaryColor }}
            >
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Questions, answered.
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              Something not covered here? Submit and we'll reach out directly.
            </p>
          </div>

          {/* FAQ Right Column: Accordions */}
          <div className="lg:col-span-8 space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <span className="text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-50 mt-1">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* 7. FINAL CALL-TO-ACTION CARD (EXACT LAYOUT FROM VIDEO)              */}
      {/* ------------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div 
          className="rounded-3xl border border-slate-200/90 p-8 sm:p-16 text-center space-y-5 relative overflow-hidden shadow-sm"
          style={{
            background: `radial-gradient(circle at 50% 20%, rgba(2, 132, 199, 0.05) 0%, rgba(255, 255, 255, 1) 80%)`
          }}
        >
          {/* Headline */}
          <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            Your moment is <br />
            <span style={{ color: primaryColor }}>
              one click away.
            </span>
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Join the students already featured on {university.instagramHandle}. Build your profile and get seen.
          </p>

          {/* Button */}
          <div className="pt-2">
            <button
              onClick={handleBuildProfile}
              style={{ backgroundColor: primaryColor }}
              className="px-7 sm:px-8 py-3.5 rounded-xl text-white font-bold text-sm sm:text-base shadow-md hover:opacity-90 active:scale-98 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Build my profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pricing subtext */}
          <div className="text-xs text-slate-400 font-medium">
            $6.00 one-time • Stripe • no hidden fees
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* 8. FEATURED CLASSMATES DIRECTORY (OPTIONAL COLLAPSIBLE SECTION)      */}
      {/* ------------------------------------------------------------------- */}
      {universityFeaturedPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-10 border-t border-slate-100">
          <div className="flex items-center justify-between pb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-950">
                Classmates on {university.instagramHandle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real students already published to the official campus feed.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {universityFeaturedPosts.length} Published
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {universityFeaturedPosts.map(post => (
              <div 
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  <img 
                    src={post.watermarkedImagePath} 
                    alt={post.studentDisplayName} 
                    className="w-full h-full object-cover" 
                  />
                  <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                    Verified
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="font-bold text-xs text-slate-950">{post.studentDisplayName}</div>
                  <p className="text-xs text-slate-600 line-clamp-2">"{post.caption}"</p>
                  {post.instagramPostUrl && (
                    <a 
                      href={post.instagramPostUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 pt-1"
                    >
                      <span>View on Instagram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 9. FOOTER (EXACT LAYOUT FROM VIDEO)                                */}
      {/* ------------------------------------------------------------------- */}
      <footer className="border-t border-slate-100 bg-white py-8 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="font-mono text-slate-600">
            {university.instagramHandle}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => navigateTo('/terms')} className="hover:text-slate-800 transition-colors">
              Terms
            </button>
            <span>•</span>
            <button onClick={() => navigateTo('/privacy')} className="hover:text-slate-800 transition-colors">
              Privacy
            </button>
            <span>•</span>
            <span>Payments secured by Stripe</span>
            <span>•</span>
            <span>© 2026</span>
          </div>

        </div>
      </footer>

    </div>
  );
};
