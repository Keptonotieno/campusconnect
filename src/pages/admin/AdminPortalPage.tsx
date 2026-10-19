import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  Check, 
  X, 
  Instagram, 
  ExternalLink, 
  Copy, 
  Filter, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  FileText, 
  DollarSign, 
  Eye, 
  History,
  Lock,
  Download
} from 'lucide-react';
import { FeaturedSubmission, SubmissionModerationStatus, SubmissionPublishingStatus } from '../../types';

export const AdminPortalPage: React.FC = () => {
  const { 
    submissions, 
    reviewSubmission, 
    publishToInstagram, 
    universities, 
    auditLogs, 
    payments,
    addToast,
    isAdmin,
    loginAsAdmin
  } = useApp();

  const [activeTab, setActiveTab] = useState<'REVIEW_QUEUE' | 'PUBLISHING_QUEUE' | 'UNIVERSITIES' | 'AUDIT_LOGS'>('REVIEW_QUEUE');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED'>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<FeaturedSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Manual publishing inputs
  const [publishUrls, setPublishUrls] = useState<Record<string, string>>({});

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (statusFilter === 'PENDING') return sub.moderationStatus === 'PENDING' || sub.moderationStatus === 'UNDER_REVIEW';
      if (statusFilter === 'APPROVED') return sub.moderationStatus === 'APPROVED' && sub.publishingStatus !== 'PUBLISHED';
      if (statusFilter === 'REJECTED') return sub.moderationStatus === 'REJECTED';
      if (statusFilter === 'PUBLISHED') return sub.publishingStatus === 'PUBLISHED';
      return true;
    });
  }, [submissions, statusFilter]);

  // Ready to publish queue
  const readyToPublishQueue = useMemo(() => {
    return submissions.filter(
      sub => sub.moderationStatus === 'APPROVED' && sub.publishingStatus === 'READY_TO_PUBLISH'
    );
  }, [submissions]);

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    addToast('Caption Copied', 'Instagram caption copied to clipboard.', 'success');
  };

  const handleConfirmPublish = async (submissionId: string) => {
    const url = publishUrls[submissionId]?.trim();
    if (!url) {
      addToast('URL Required', 'Please enter the resulting Instagram post URL.', 'error');
      return;
    }
    await publishToInstagram(submissionId, url);
    setPublishUrls(prev => ({ ...prev, [submissionId]: '' }));
  };

  // If not admin, provide clear one-click administrator switch
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center space-y-5 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-950">Administrator Authorization Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Only authorized platform administrators can review student photo submissions, verify payments, and record Instagram publications.
          </p>
        </div>
        <button
          onClick={loginAsAdmin}
          className="w-full py-3 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          Authorize & Open Admin Portal (Demo Mode)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1D64EC] text-[10px] font-bold uppercase tracking-wider border border-blue-200">
              Admin & Moderation Console
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Full Privileges</span>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-1">
            Campus Connect Operations Portal
          </h1>
        </div>

        {/* Top KPI pills */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium">Pending Review: </span>
            <strong className="text-amber-600">{submissions.filter(s => s.moderationStatus === 'PENDING').length}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs shadow-2xs">
            <span className="text-slate-400 font-medium">Ready to Publish: </span>
            <strong className="text-[#1D64EC]">{readyToPublishQueue.length}</strong>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { id: 'REVIEW_QUEUE', label: 'Photo Review Queue', count: submissions.length },
          { id: 'PUBLISHING_QUEUE', label: 'Manual Instagram Publishing', count: readyToPublishQueue.length },
          { id: 'UNIVERSITIES', label: 'Universities & Handles', count: universities.length },
          { id: 'AUDIT_LOGS', label: 'Administrative Audit Logs', count: auditLogs.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#1D64EC] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: PHOTO REVIEW QUEUE */}
      {activeTab === 'REVIEW_QUEUE' && (
        <div className="space-y-6">
          
          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Status Filter:</span>
              </span>
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === f
                      ? 'bg-blue-50 text-[#1D64EC] border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredSubmissions.length} submissions
            </span>
          </div>

          {/* Submissions Table / Cards */}
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200/90 shadow-xs text-center text-xs text-slate-500">
                No submissions matching the current filter.
              </div>
            ) : (
              filteredSubmissions.map(sub => {
                const isPaid = sub.paymentStatus === 'PAYMENT_CONFIRMED';
                const isPending = sub.moderationStatus === 'PENDING';
                const isApproved = sub.moderationStatus === 'APPROVED';
                const isRejected = sub.moderationStatus === 'REJECTED';

                return (
                  <div
                    key={sub.id}
                    className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      
                      {/* Thumbnail toggle */}
                      <div 
                        onClick={() => setSelectedSubmission(sub)}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer relative group"
                      >
                        <img 
                          src={sub.watermarkedImagePath} 
                          alt={sub.studentDisplayName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">{sub.studentDisplayName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({sub.studentEmail})</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <span className="font-bold text-[#1D64EC]">{sub.universityName}</span>
                          <span>•</span>
                          <span className="text-pink-600 font-semibold">{sub.universityInstagramHandle}</span>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-1 italic max-w-md">
                          "{sub.caption}"
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                          <span>Ref: {sub.id}</span>
                          <span>•</span>
                          <span className={isPaid ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {isPaid ? '✓ Paid $6.00 USD' : '⏳ Awaiting Payment'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Photos</span>
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => reviewSubmission(sub.id, 'APPROVE')}
                            disabled={!isPaid}
                            title={!isPaid ? 'Cannot approve unverified payment' : 'Approve photo'}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setShowRejectModal(true);
                            }}
                            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {isApproved && sub.publishingStatus !== 'PUBLISHED' && (
                        <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                          Ready in Publishing Queue
                        </span>
                      )}

                      {sub.publishingStatus === 'PUBLISHED' && (
                        <a
                          href={sub.instagramPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 border border-pink-200 text-xs font-bold flex items-center gap-1 hover:bg-pink-100"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          <span>View Live Post</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL INSTAGRAM PUBLISHING QUEUE */}
      {activeTab === 'PUBLISHING_QUEUE' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1D64EC]" />
              <span>Manual Instagram Publishing Workflow (Procedure Eight)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              1. Download or view the official <strong>watermarked derivative</strong>.<br />
              2. Copy the student-approved caption.<br />
              3. Open the authorized university Instagram profile and publish manually.<br />
              4. Paste the resulting live Instagram post link and click <strong>"Confirm Publication"</strong>.
            </p>
          </div>

          {readyToPublishQueue.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200/90 shadow-xs text-center text-xs text-slate-500">
              No approved submissions currently awaiting manual Instagram publication.
            </div>
          ) : (
            <div className="space-y-6">
              {readyToPublishQueue.map(sub => (
                <div 
                  key={sub.id}
                  className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-5"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{sub.studentDisplayName}</span>
                        <span className="text-xs text-slate-400 font-mono">({sub.universityName})</span>
                      </div>
                      <div className="text-xs text-pink-600 font-bold flex items-center gap-1">
                        <Instagram className="w-3.5 h-3.5" />
                        <span>Destination Handle: {sub.universityInstagramHandle}</span>
                      </div>
                    </div>

                    <a
                      href={sub.watermarkedImagePath}
                      download={`${sub.universitySlug}_${sub.studentDisplayName.replace(/\s+/g, '_')}_watermarked.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#1D64EC]" />
                      <span>Download Watermarked Image</span>
                    </a>
                  </div>

                  {/* Visual Layout: Photo + Caption + Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* Watermarked photo */}
                    <div className="md:col-span-4 aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm relative">
                      <img 
                        src={sub.watermarkedImagePath} 
                        alt="Watermarked" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Caption & Actions */}
                    <div className="md:col-span-8 space-y-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700">Student-Approved Instagram Caption:</label>
                          <button
                            onClick={() => handleCopyCaption(sub.caption)}
                            className="text-[#1D64EC] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Caption</span>
                          </button>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {sub.caption}
                        </div>
                      </div>

                      {/* Destination handle action */}
                      <div className="flex items-center gap-3 pt-1">
                        <a
                          href={`https://instagram.com/${sub.universityInstagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Instagram className="w-3.5 h-3.5 text-pink-400" />
                          <span>Open {sub.universityInstagramHandle} on Instagram</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>

                      {/* URL input and Confirm Button */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <label className="block font-bold text-slate-800">
                          Paste Live Instagram Post Link after publishing:
                        </label>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <input 
                            type="url"
                            value={publishUrls[sub.id] || ''}
                            onChange={(e) => setPublishUrls({ ...publishUrls, [sub.id]: e.target.value })}
                            placeholder="https://www.instagram.com/p/DB123456789/"
                            className="w-full sm:flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] font-mono"
                          />
                          <button
                            onClick={() => handleConfirmPublish(sub.id)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Confirm & Notify Student
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UNIVERSITIES MANAGEMENT */}
      {activeTab === 'UNIVERSITIES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {universities.map(uni => (
              <div 
                key={uni.id}
                className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-3.5">
                  <img 
                    src={uni.logoUrl} 
                    alt={uni.name} 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 bg-white" 
                  />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 truncate">{uni.name}</h3>
                    <div className="text-[11px] text-pink-600 font-bold">{uni.instagramHandle}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {uni.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-emerald-600 font-bold">● Active Community</span>
                  <a
                    href={`/university/${uni.slug}`}
                    className="text-[#1D64EC] hover:underline font-bold"
                  >
                    View Community
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Immutable Administrative Audit Log
            </h3>
            <span className="text-xs text-slate-400 font-mono">{auditLogs.length} Records</span>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700 text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-slate-500 font-mono">Target: #{log.targetId}</span>
                  </div>
                  <div className="text-slate-700">{log.details}</div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHOTO INSPECTION MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-950">
                  Photo & Rights Inspection: {selectedSubmission.studentDisplayName}
                </h3>
                <div className="text-xs text-slate-500">{selectedSubmission.universityName}</div>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">1. Original Unwatermarked Photo (Protected)</div>
                <div className="aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img 
                    src={selectedSubmission.originalImagePath} 
                    alt="Original"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-[#1D64EC]">2. Official Burned-In Watermark Derivative</div>
                <div className="aspect-square rounded-2xl overflow-hidden border border-blue-300 bg-slate-950">
                  <img 
                    src={selectedSubmission.watermarkedImagePath} 
                    alt="Watermarked"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
            </div>

            {/* Verification checklist */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Payment Status:</span>
                <span className="font-bold text-emerald-600">✓ {selectedSubmission.paymentStatus} ($6.00 USD / KES 780)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Publication Consent:</span>
                <span className="font-bold text-slate-900">{selectedSubmission.publicationConsent ? '✓ Granted' : '✗ Missing'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Portrait Rights Confirmation:</span>
                <span className="font-bold text-slate-900">{selectedSubmission.rightsConfirmed ? '✓ Confirmed' : '✗ Missing'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {showRejectModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950">
              Enter Rejection Reason for {selectedSubmission.studentDisplayName}
            </h3>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Photo resolution is too low, or content violates campus community guidelines."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  reviewSubmission(selectedSubmission.id, 'REJECT', rejectionReason);
                  setShowRejectModal(false);
                  setSelectedSubmission(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
