import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  MapPin, 
  Instagram, 
  ArrowRight, 
  Search, 
  Sparkles, 
  GraduationCap, 
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Users
} from 'lucide-react';
import { University } from '../../types';

export const CampusesDirectoryPage: React.FC = () => {
  const { universities, navigateTo, setEntryUniversityContext } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');

  // Extract available states/regions
  const states = useMemo(() => {
    const set = new Set<string>();
    universities.forEach(u => {
      if (u.location) {
        const parts = u.location.split(',');
        if (parts.length >= 2) {
          set.add(parts[1].trim());
        }
      }
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [universities]);

  // Filtered campuses
  const filteredCampuses = useMemo(() => {
    return universities.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        u.name.toLowerCase().includes(q) ||
        u.slug.toLowerCase().includes(q) ||
        u.instagramHandle.toLowerCase().includes(q) ||
        (u.location && u.location.toLowerCase().includes(q)) ||
        (u.tagline && u.tagline.toLowerCase().includes(q));

      const matchesState = selectedState === 'ALL' || (u.location && u.location.includes(selectedState));

      return matchesSearch && matchesState;
    });
  }, [universities, searchQuery, selectedState]);

  const handleSelectCampus = (campus: University, action: 'VISIT' | 'SUBMIT' = 'VISIT') => {
    setEntryUniversityContext(campus);
    if (action === 'SUBMIT') {
      navigateTo(`/submit/${campus.slug}`);
    } else {
      navigateTo(`/ig/${campus.slug}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      
      {/* 1. Header Banner */}
      <section className="bg-slate-950 text-white border-b border-slate-800 py-12 sm:py-16 px-4 sm:px-8 relative overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-20 bg-blue-600" />
        <div className="max-w-6xl mx-auto relative z-10 space-y-4 text-center sm:text-left">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
            <span>Official University Networks ({universities.length} Active Campuses)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Explore Campus Spotlight Websites
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            Choose your university to view the official student community, meet your future classmates, and submit your introduction photos to be featured on Instagram.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-2xl">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by school name, city, state, or @handle..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 focus:bg-white focus:text-slate-950 text-white placeholder-slate-400 border border-slate-700/80 focus:border-blue-500 focus:outline-none transition-all text-sm font-medium shadow-lg backdrop-blur-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-md cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 2. Filter Bar */}
      <section className="border-b border-slate-200/80 bg-white sticky top-0 z-30 shadow-2xs px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Region:</span>
            </span>
            {states.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedState === st
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {st === 'ALL' ? 'All Campuses' : st}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-semibold shrink-0">
            Showing <strong className="text-slate-900">{filteredCampuses.length}</strong> of {universities.length} universities
          </div>

        </div>
      </section>

      {/* 3. Campuses Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        {filteredCampuses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No schools match your search</h3>
              <p className="text-xs text-slate-500">
                Try searching with a different university name, mascot, or state.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedState('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampuses.map((campus) => {
              const primaryColor = campus.primaryColor || '#004B87';
              const accentColor = campus.accentColor || '#0284C7';
              const classYear = campus.classYear || '2031';

              return (
                <div
                  key={campus.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Top Color Accent Strip */}
                  <div 
                    className="h-2 w-full transition-all group-hover:h-2.5"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`
                    }}
                  />

                  <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                    
                    {/* Header Row: Circular Emblem + Class Year */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        {/* Emblem with custom gradient ring */}
                        <div 
                          className="w-13 h-13 rounded-full p-0.5 shrink-0 flex items-center justify-center shadow-xs"
                          style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
                          }}
                        >
                          <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center p-1 overflow-hidden">
                            {campus.logoUrl ? (
                              <img 
                                src={campus.logoUrl} 
                                alt={campus.name} 
                                className="w-6 h-6 object-contain"
                              />
                            ) : (
                              <span className="text-xs font-bold text-amber-500">⚡</span>
                            )}
                            <span className="text-[7px] font-black text-slate-900 leading-none font-mono">
                              {classYear}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h2 className="text-sm font-bold text-slate-950 group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">
                            {campus.name}
                          </h2>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{campus.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Class Year Pill */}
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold font-mono shrink-0">
                        '{classYear.slice(-2)}
                      </span>
                    </div>

                    {/* Official Instagram Handle Banner */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                          <Instagram className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 font-mono truncate">
                          {campus.instagramHandle}
                        </span>
                      </div>
                      <a
                        href={campus.instagramProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-400 hover:text-blue-600 p-1 transition-colors"
                        title="View Instagram feed"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Description or Tagline */}
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {campus.tagline || campus.description}
                    </p>

                    {/* 3 Metric Badges */}
                    <div className="grid grid-cols-3 gap-2 py-1 text-center border-t border-slate-100 pt-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900 font-mono">$6.00</div>
                        <div className="text-[10px] text-slate-400">Fee</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 font-mono">8 Photos</div>
                        <div className="text-[10px] text-slate-400">Feature</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 font-mono">24-48h</div>
                        <div className="text-[10px] text-slate-400">Live feed</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectCampus(campus, 'VISIT')}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Visit Campus Site</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectCampus(campus, 'SUBMIT')}
                        style={{
                          backgroundColor: primaryColor
                        }}
                        className="py-2.5 px-3 rounded-xl text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        title="Submit photos to get featured on this campus"
                      >
                        <span>Submit</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
};
