import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  MapPin, 
  Instagram, 
  ExternalLink, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  GraduationCap,
  Heart,
  Share2
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
    currentUser, 
    setEntryUniversityContext,
    addToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'FEATURED' | 'DIRECTORY' | 'ABOUT'>('FEATURED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState('ALL');

  // Filter approved & published submissions for this university
  const universityFeaturedPosts = useMemo(() => {
    return submissions.filter(
      (s) => (s.universityId === university.id || s.universitySlug === university.slug) &&
             s.moderationStatus === 'APPROVED' &&
             s.publishingStatus === 'PUBLISHED'
    );
  }, [submissions, university]);

  // Handle CTA to get featured for this university
  const handleGetFeatured = () => {
    setEntryUniversityContext(university);
    if (!isAuthenticated) {
      addToast('Sign In Required', `Create an account to submit your photo for ${university.name}.`, 'info');
      navigateTo(`/register?uni=${university.slug}`);
    } else {
      navigateTo(`/app/submit?uni=${university.slug}`);
    }
  };

  // Sample student community members
  const communityMembers = useMemo(() => {
    return [
      {
        id: 'mem_1',
        name: 'Brian Kiprop',
        major: 'BSc. Civil Engineering',
        gradYear: '2027',
        bio: 'Juja campus enthusiast, marathon runner, and chess player.',
        interests: ['Engineering', 'Running', 'Chess'],
        housing: 'Off Campus (Gate C)',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
        instagram: '@briankiprop_'
      },
      {
        id: 'mem_2',
        name: 'Amina Mohamed',
        major: 'BSc. Information Technology',
        gradYear: '2026',
        bio: 'Fullstack builder, UI designer, and tech club lead.',
        interests: ['React', 'Design', 'Photography'],
        housing: 'On Campus Hostels',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
        instagram: '@amina_tech'
      },
      {
        id: 'mem_3',
        name: 'Dennis Mutua',
        major: 'Bachelor of Architecture',
        gradYear: '2028',
        bio: 'Passionate about sustainable campus design and 3D modeling.',
        interests: ['Architecture', 'Art', 'Travel'],
        housing: 'Looking for Roommate',
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
        instagram: '@dennis_arch'
      }
    ];
  }, []);

  const filteredMembers = communityMembers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.interests.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-16">
      
      {/* 1. HERO BANNER */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        {/* Cover Photo Backdrop */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity filter blur-xs"
          style={{ backgroundImage: `url(${university.coverUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* University Identity */}
            <div className="flex items-start sm:items-center gap-5">
              <img 
                src={university.logoUrl} 
                alt={university.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/10 bg-white p-1 shadow-xl shrink-0" 
              />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold tracking-wide uppercase">
                    Verified Campus Community
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>{university.location}</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {university.name}
                </h1>

                <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 flex-wrap">
                  <a 
                    href={university.instagramProfileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-pink-400 hover:text-pink-300 font-bold transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>{university.instagramHandle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>{university.studentCount?.toLocaleString() || '3,800+'} Students</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <a 
                    href={university.officialWebsiteUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Official Portal
                  </a>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleGetFeatured}
                className="px-6 py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Get Featured on {university.instagramHandle}</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="sticky top-16 z-20 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto py-3">
            {[
              { id: 'FEATURED', label: 'Featured Student Posts', count: universityFeaturedPosts.length },
              { id: 'DIRECTORY', label: 'Student Directory', count: communityMembers.length },
              { id: 'ABOUT', label: 'About Community' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-[#1D64EC]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? 'bg-[#1D64EC] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${university.name} on Campus Connect`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                addToast('Link Copied', 'University community link copied to clipboard.', 'success');
              }
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Community</span>
          </button>
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* TAB A: FEATURED STUDENTS */}
        {activeTab === 'FEATURED' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  Featured on {university.instagramHandle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified student introductions submitted via Campus Connect and published by administrators.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Submission Fee: <strong className="text-slate-900">$6 USD (KES 780)</strong>
                </span>
                <button
                  onClick={handleGetFeatured}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-[#1D64EC] hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Submit Photo
                </button>
              </div>
            </div>

            {universityFeaturedPosts.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200/90 shadow-xs text-center max-w-lg mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1D64EC] flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Be the First Featured Student!</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Submit your introduction photo and caption. Once reviewed and payment is verified, your post will be published to the official {university.instagramHandle} page.
                  </p>
                </div>
                <button
                  onClick={handleGetFeatured}
                  className="px-6 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Submit Your Photo ($6)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {universityFeaturedPosts.map(post => (
                  <div 
                    key={post.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
                  >
                    {/* Watermarked Photo Preview */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden">
                      <img 
                        src={post.watermarkedImagePath} 
                        alt={post.studentDisplayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      
                      {/* Instagram badge */}
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                        <Instagram className="w-3 h-3 text-pink-400" />
                        <span>Live on IG</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-sm text-slate-950">
                            {post.studentDisplayName}
                          </h3>
                          <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-normal line-clamp-3">
                          "{post.caption}"
                        </p>
                      </div>

                      {/* Instagram Link */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[10px] font-mono">
                          {new Date(post.publishedAt || post.submittedAt).toLocaleDateString()}
                        </span>

                        {post.instagramPostUrl && (
                          <a 
                            href={post.instagramPostUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[#1D64EC] hover:underline font-bold flex items-center gap-1"
                          >
                            <span>View on Instagram</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB B: STUDENT DIRECTORY */}
        {activeTab === 'DIRECTORY' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">
                  {university.name} Student Community
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse and connect with registered students enrolled at this university.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by major or interests..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMembers.map(member => (
                <div 
                  key={member.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={member.avatarUrl} 
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20" 
                    />
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-slate-950 truncate">{member.name}</h3>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-1 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{member.major} • Class of {member.gradYear}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {member.bio}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {member.interests.map(interest => (
                      <span 
                        key={interest}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      🏡 {member.housing}
                    </span>
                    <span className="font-bold text-[#1D64EC]">
                      {member.instagram}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB C: ABOUT UNIVERSITY */}
        {activeTab === 'ABOUT' && (
          <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xs">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">About {university.name}</h2>
              <p className="text-xs text-slate-500 mt-1">Established {university.established} • {university.location}</p>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {university.description}
            </p>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#1D64EC]" />
                <span>Official Campus Connect Instagram Account</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Campus Connect manages the dedicated university Instagram account at <strong className="text-slate-900">{university.instagramHandle}</strong>. Students who want their photo published can submit their photo through this portal for a one-time consideration fee of $6 USD (KES 780).
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
              <a 
                href={university.officialWebsiteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Visit Official Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleGetFeatured}
                className="px-4 py-2 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Submit Featured Photo
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
