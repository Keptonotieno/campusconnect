import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  GraduationCap, 
  Building2, 
  User, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Instagram, 
  Home, 
  BookOpen, 
  HelpCircle 
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { currentUser, universities, completeOnboarding, navigateTo } = useApp();

  const [course, setCourse] = useState(currentUser?.course || '');
  const [graduationYear, setGraduationYear] = useState(currentUser?.graduationYear || '2028');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [interestsInput, setInterestsInput] = useState(currentUser?.interests?.join(', ') || '');
  const [personalInstagram, setPersonalInstagram] = useState(currentUser?.personalInstagramHandle || '');
  const [housingPreference, setHousingPreference] = useState<'On Campus' | 'Off Campus' | 'Looking for Roommate' | 'Not Specified'>(
    (currentUser as any)?.housingPreference || 'Not Specified'
  );

  const selectedUni = universities.find(u => u.id === currentUser?.universityId || u.slug === currentUser?.universitySlug) || universities[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const interests = interestsInput
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);

    completeOnboarding({
      course: course.trim(),
      graduationYear,
      bio: bio.trim(),
      interests,
      personalInstagramHandle: personalInstagram.trim() ? personalInstagram.replace(/^@/, '') : undefined,
      housingPreference
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-6 font-sans flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
        
        {/* Progress Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="text-[#1D64EC] uppercase tracking-wider">Step 2 of 2: Student Profile Setup</span>
            <span>Almost Done!</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="w-4/5 h-full bg-[#1D64EC] rounded-full" />
          </div>

          <div className="pt-2">
            <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
              Complete Your Student Profile for {selectedUni.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Help your university peers get to know you, your course, and your campus interests.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Course / Major & Grad Year */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Course or Academic Major
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input 
                  type="text"
                  required
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. BSc. Software Engineering or Law"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
                />
              </div>
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Graduation Year
              </label>
              <select
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
              >
                <option value="2026">Class of 2026</option>
                <option value="2027">Class of 2027</option>
                <option value="2028">Class of 2028</option>
                <option value="2029">Class of 2029</option>
                <option value="2030">Class of 2030</option>
              </select>
            </div>
          </div>

          {/* 2. Short Biography */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Short Biography & Introduction
            </label>
            <textarea 
              rows={3}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your classmates about yourself, hobbies, or what you are excited about..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
            />
          </div>

          {/* 3. Interests tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Interests & Clubs (Comma-separated)
            </label>
            <input 
              type="text"
              value={interestsInput}
              onChange={(e) => setInterestsInput(e.target.value)}
              placeholder="e.g. Tech, Football, Chess, Music, Entrepreneurship"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
            />
          </div>

          {/* 4. Housing & Roommate Preference */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Housing / Roommate Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['On Campus', 'Off Campus', 'Looking for Roommate', 'Not Specified'] as const).map(opt => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setHousingPreference(opt)}
                  className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                    housingPreference === opt
                      ? 'border-[#1D64EC] bg-blue-50 text-[#1D64EC]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Optional Personal Instagram Handle */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Optional: Your Personal Instagram Handle
              </label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <div className="relative">
              <Instagram className="w-4 h-4 text-pink-500 absolute left-3.5 top-3" />
              <input 
                type="text"
                value={personalInstagram}
                onChange={(e) => setPersonalInstagram(e.target.value)}
                placeholder="@yourhandle (e.g. @sarah_w)"
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1D64EC]"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We never ask for your Instagram password. This handle is displayed only on your student directory card so campus peers can message you.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#1D64EC] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Complete Setup & Join {selectedUni.name} Hub</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>
      </div>
    </div>
  );
};
