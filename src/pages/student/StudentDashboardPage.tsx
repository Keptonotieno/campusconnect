import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Instagram, 
  Plus, 
  GraduationCap, 
  MapPin, 
  Building2, 
  Bell, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { FeaturedSubmission } from '../../types';

export const StudentDashboardPage: React.FC = () => {
  const { 
    currentUser, 
    mySubmissions, 
    navigateTo, 
    notifications, 
    selectedUniversity, 
    universities 
  } = useApp();

  const userUni = universities.find(u => u.id === currentUser?.universityId || u.slug === currentUser?.universitySlug) || universities[0] || { 
    id: 'default',
    name: 'Campus Hub', 
    slug: 'all', 
    instagramHandle: '@campusconnect' 
  };

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8 font-sans">
      
      {/* 1. TOP PROFILE & UNIVERSITY SUMMARY CARD */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5">
          {currentUser?.avatarUrl ? (
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser?.name || 'Student'} 
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-blue-500/10 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs shrink-0 ring-4 ring-blue-500/10">
              {(currentUser?.name || 'S').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                {currentUser?.name || 'Student'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Student Member
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
              <span className="font-bold text-[#1D64EC] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{currentUser?.universityName || userUni.name}</span>
              </span>
              <span>•</span>
              <span className="text-slate-500 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>
                  {currentUser?.course 
                    ? `${currentUser.course} • Class of ${currentUser.graduationYear || '2028'}` 
                    : 'Profile details not set'}
                </span>
              </span>
            </div>

            <p className="text-xs text-slate-500 line-clamp-1 max-w-lg">
              {currentUser?.bio || 'No bio added yet.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo(`/university/${userUni.slug}`)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
          >
            Visit Campus Hub
          </button>
          <button
            onClick={() => navigateTo('/app/submit')}
            className="px-5 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Submit Photo ($6)</span>
          </button>
        </div>
      </div>

      {/* 2. SUBMISSIONS TIMELINE & TRACKING */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 tracking-tight">
              My Featured Post Submissions
            </h2>
            <p className="text-xs text-slate-500">
              Track review status, payment verification, and live Instagram publishing for your photos.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-50 text-[#1D64EC] text-xs font-bold font-mono">
            {mySubmissions.length} Total Submissions
          </span>
        </div>

        {mySubmissions.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-slate-200/90 shadow-xs text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1D64EC] flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No Submissions Yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Submit an introduction photo to be featured on your official university Instagram page ({userUni.instagramHandle}).
              </p>
            </div>
            <button
              onClick={() => navigateTo('/app/submit')}
              className="px-6 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Get Featured on Instagram ($6)
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {mySubmissions.map((sub: FeaturedSubmission) => {
              const isPublished = sub.publishingStatus === 'PUBLISHED';
              const isApproved = sub.moderationStatus === 'APPROVED';
              const isRejected = sub.moderationStatus === 'REJECTED';
              const isPaid = sub.paymentStatus === 'PAYMENT_CONFIRMED';

              return (
                <div 
                  key={sub.id}
                  className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-6"
                >
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">#{sub.id}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-bold text-slate-800">{sub.universityName}</span>
                        <span className="text-xs text-pink-600 font-bold flex items-center gap-1">
                          <Instagram className="w-3 h-3" />
                          <span>{sub.universityInstagramHandle}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isPublished ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Published on Instagram</span>
                        </span>
                      ) : isRejected ? (
                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Changes Requested / Rejected</span>
                        </span>
                      ) : isApproved ? (
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Approved • Queued for Publishing</span>
                        </span>
                      ) : isPaid ? (
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Paid ($6) • Under Admin Review</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                          Awaiting Payment ($6.00)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Photo & Caption */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* Watermarked photo thumbnail */}
                    <div className="md:col-span-4 aspect-square max-w-[220px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs relative">
                      <img 
                        src={sub.watermarkedImagePath} 
                        alt="Submission preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[9px] text-white font-mono">
                        Watermarked Derivative
                      </div>
                    </div>

                    {/* Caption & Status Details */}
                    <div className="md:col-span-8 space-y-4">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                          Submitted Caption
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-normal p-3 rounded-xl bg-slate-50 border border-slate-100 italic">
                          "{sub.caption}"
                        </p>
                      </div>

                      {/* Rejection notice if any */}
                      {isRejected && sub.rejectionReason && (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Administrator Review Feedback</span>
                          </div>
                          <p className="text-[11px]">{sub.rejectionReason}</p>
                        </div>
                      )}

                      {/* Published link if available */}
                      {isPublished && sub.instagramPostUrl && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-blue-50 border border-pink-200/60 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Instagram className="w-4 h-4 text-pink-600" />
                              <span>Live on {sub.universityInstagramHandle}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Your photo introduction is public for all students to see and connect!
                            </div>
                          </div>

                          <a 
                            href={sub.instagramPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
                          >
                            <span>Open Post</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual 4-Step Timeline */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                      
                      {/* Step 1 */}
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-700">1. Submitted</span>
                      </div>

                      {/* Step 2 */}
                      <div className="space-y-1">
                        <div className={`h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <span className={`font-bold ${isPaid ? 'text-slate-700' : 'text-slate-400'}`}>
                          2. Paid ($6)
                        </span>
                      </div>

                      {/* Step 3 */}
                      <div className="space-y-1">
                        <div className={`h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : isPaid ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
                        <span className={`font-bold ${isApproved ? 'text-emerald-700' : isRejected ? 'text-rose-600' : isPaid ? 'text-blue-600' : 'text-slate-400'}`}>
                          {isRejected ? '3. Rejected' : isApproved ? '3. Approved' : '3. Reviewing'}
                        </span>
                      </div>

                      {/* Step 4 */}
                      <div className="space-y-1">
                        <div className={`h-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <span className={`font-bold ${isPublished ? 'text-emerald-700' : 'text-slate-400'}`}>
                          4. Published
                        </span>
                      </div>

                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
