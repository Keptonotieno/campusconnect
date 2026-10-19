import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Instagram, 
  Lock, 
  CreditCard, 
  Smartphone,
  Eye,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { generateWatermarkedDerivative } from '../../lib/watermark';
import { FEATURED_POST_PRICE_USD, FEATURED_POST_PRICE_KES } from '../../lib/payment';
import { University } from '../../types';

export const SubmitPhotoPage: React.FC = () => {
  const { 
    currentUser, 
    universities, 
    selectedUniversity, 
    createSubmission, 
    payForSubmission, 
    navigateTo, 
    addToast 
  } = useApp();

  // Selected university (default to user's university or JKUAT)
  const defaultUni = universities.find(u => u.id === currentUser?.universityId || u.slug === currentUser?.universitySlug) || universities[0];
  const [targetUni, setTargetUni] = useState<University>(defaultUni);

  // Form states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>('');
  const [watermarkedPreview, setWatermarkedPreview] = useState<string>('');
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [previewTab, setPreviewTab] = useState<'WATERMARKED' | 'ORIGINAL'>('WATERMARKED');

  const [caption, setCaption] = useState(
    `Hey everyone! Enrolled in ${currentUser?.course || 'Engineering'} at ${targetUni.name}. Excited to connect with fellow campus freshmen and explore Juja!`
  );

  const [publicationConsent, setPublicationConsent] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Payment states
  const [paymentProvider, setPaymentProvider] = useState<'MPESA' | 'CARD'>('MPESA');
  const [mpesaPhone, setMpesaPhone] = useState('0712345678');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSubmissionId, setCompletedSubmissionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo File selection and watermark generation
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Invalid File Type', 'Please upload a valid JPEG, PNG, or WEBP photo.', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      addToast('File Too Large', 'Maximum image size is 8MB.', 'error');
      return;
    }

    setPhotoFile(file);
    const originalUrl = URL.createObjectURL(file);
    setOriginalPreview(originalUrl);

    setIsWatermarking(true);
    try {
      const watermarkedUrl = await generateWatermarkedDerivative(file, {
        universityName: targetUni.name,
        universityHandle: targetUni.instagramHandle,
        studentName: currentUser?.name || 'Student'
      });
      setWatermarkedPreview(watermarkedUrl);
      setPreviewTab('WATERMARKED');
      addToast('Watermark Applied', 'Official Campus Connect brand watermark applied to derivative.', 'success');
    } catch (err: any) {
      addToast('Watermark Error', err.message || 'Could not generate watermark derivative.', 'error');
    } finally {
      setIsWatermarking(false);
    }
  };

  // Submit and Pay workflow
  const handleSubmitAndPay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originalPreview || !watermarkedPreview) {
      addToast('Photo Required', 'Please upload your introduction photo.', 'error');
      return;
    }

    if (!caption.trim()) {
      addToast('Caption Required', 'Please write a brief introduction or caption for your Instagram post.', 'error');
      return;
    }

    if (!publicationConsent || !rightsConfirmed || !termsAgreed) {
      addToast('Consent Required', 'Please confirm publication consent and terms agreements.', 'error');
      return;
    }

    if (paymentProvider === 'MPESA' && !mpesaPhone.trim()) {
      addToast('M-Pesa Phone Required', 'Please provide a valid Safaricom phone number for STK Push.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create submission record
      const submission = await createSubmission({
        universityId: targetUni.id,
        originalImagePath: originalPreview,
        watermarkedImagePath: watermarkedPreview,
        caption: caption.trim(),
        publicationConsent,
        rightsConfirmed,
        termsAgreed
      });

      // 2. Initiate and verify payment
      await payForSubmission(
        submission.id,
        paymentProvider,
        paymentProvider === 'MPESA' ? mpesaPhone.trim() : undefined
      );

      setCompletedSubmissionId(submission.id);
      addToast('Submission Complete!', 'Your photo is paid and now in the administrator review queue.', 'success');
    } catch (err: any) {
      addToast('Submission Error', err.message || 'Payment or submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view with status tracker
  if (completedSubmissionId) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-10 my-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center space-y-6 font-sans">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            Payment Confirmed • $6.00 USD
          </span>
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">
            Photo Submission Received!
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your submission for <strong>{targetUni.name}</strong> ({targetUni.instagramHandle}) is now queued for administrator review.
          </p>
        </div>

        {/* Status progress bar */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
          <div className="text-xs font-bold text-slate-900">Submission Timeline:</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>1. Photo Uploaded & Watermark Derivative Created</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>2. Payment Confirmed ($6 USD / KES 780 via {paymentProvider})</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-bold">
              <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
              <span>3. Under Administrator Review & Quality Check</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
              <span>4. Published to {targetUni.instagramHandle}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigateTo('/app/dashboard')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Go to Student Dashboard
          </button>
          <button
            onClick={() => navigateTo(`/university/${targetUni.slug}`)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
          >
            Back to University Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-8 font-sans">
      
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1D64EC]">
          <Sparkles className="w-4 h-4" />
          <span>Featured Student Post Submission</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
          Get Featured on Official University Instagram
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
          Submit your introduction photo and caption for verified publication to your university's official Campus Connect Instagram handle. One-time review & consideration fee applies.
        </p>
      </div>

      <form onSubmit={handleSubmitAndPay} className="space-y-8">
        
        {/* SECTION 1: TARGET UNIVERSITY */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <label className="block text-xs font-extrabold text-slate-900 tracking-tight">
            1. Target University Instagram Destination
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {universities.map(uni => (
              <button
                type="button"
                key={uni.id}
                onClick={() => setTargetUni(uni)}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  targetUni.id === uni.id
                    ? 'border-[#1D64EC] bg-blue-50/70 shadow-xs ring-1 ring-[#1D64EC]'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <img 
                  src={uni.logoUrl} 
                  alt={uni.name} 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0 bg-white" 
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-950 truncate">{uni.name}</div>
                  <div className="text-[11px] text-pink-600 font-semibold flex items-center gap-1">
                    <Instagram className="w-3 h-3" />
                    <span>{uni.instagramHandle}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 2: PHOTO UPLOAD & WATERMARK PREVIEW */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-extrabold text-slate-900 tracking-tight">
                2. Upload Your Introduction Photo
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload a clear solo or campus photo. Our backend creates a verified watermark derivative.
              </p>
            </div>
            
            {originalPreview && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('WATERMARKED')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    previewTab === 'WATERMARKED' ? 'bg-white text-[#1D64EC] shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Watermarked Derivative
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('ORIGINAL')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    previewTab === 'ORIGINAL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Original Image
                </button>
              </div>
            )}
          </div>

          <input 
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          {!originalPreview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#1D64EC] bg-slate-50/70 hover:bg-blue-50/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D64EC] group-hover:scale-105 flex items-center justify-center transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900">
                  Click to select photo or drag and drop here
                </div>
                <div className="text-[11px] text-slate-400">
                  Supported formats: High resolution JPEG, PNG, WEBP (Max 8MB)
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Image Preview Box */}
              <div className="md:col-span-6 relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                <img 
                  src={previewTab === 'WATERMARKED' ? watermarkedPreview : originalPreview}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />

                {isWatermarking && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-bold gap-2">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    <span>Applying Official Watermark...</span>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/80 text-[10px] text-white font-mono">
                  {previewTab === 'WATERMARKED' ? 'Burned-in CC Watermark' : 'Unwatermarked Protected Original'}
                </div>
              </div>

              {/* Explanatory notes */}
              <div className="md:col-span-6 space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/60 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#1D64EC]" />
                    <span>Protected Watermark Derivative</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    The watermarked derivative contains the official <strong>Campus Connect</strong> brand badge and target handle <strong>{targetUni.instagramHandle}</strong>. It will be downloaded by administrators for manual publishing to Instagram.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Change Photo
                </button>
              </div>

            </div>
          )}
        </div>

        {/* SECTION 3: CAPTION & INTRO */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <label className="block text-xs font-extrabold text-slate-900 tracking-tight">
            3. Instagram Post Caption or Introduction
          </label>
          <textarea 
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Introduce yourself to your campus community! Share your course, hobbies, what you are looking forward to, or Instagram handle..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D64EC] focus:bg-white transition-all leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Will be formatted and posted verbatim by the admin</span>
            <span>{caption.length} / 500 characters</span>
          </div>
        </div>

        {/* SECTION 4: LEGAL CONSENT & VERIFICATION CHECKBOXES */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <label className="block text-xs font-extrabold text-slate-900 tracking-tight">
            4. Consent & Rights Confirmation (Required)
          </label>

          <div className="space-y-3 pt-1 text-xs">
            {/* Consent 1 */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={publicationConsent}
                onChange={(e) => setPublicationConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#1D64EC] focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-700 leading-relaxed">
                I hereby grant <strong>Campus Connect</strong> and the administrators of <strong>{targetUni.name}</strong> explicit consent to publish my submitted photo and caption to the official Instagram account (<strong>{targetUni.instagramHandle}</strong>).
              </span>
            </label>

            {/* Consent 2 */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#1D64EC] focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-700 leading-relaxed">
                I confirm that I am the individual in the photograph and hold all necessary intellectual property and portrait rights to submit this image for publication.
              </span>
            </label>

            {/* Consent 3 */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#1D64EC] focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-700 leading-relaxed">
                I understand that the <strong>$6 USD (KES 780)</strong> fee is a one-time processing and consideration fee. Publishing is subject to review and moderation; content violating safety or university policies will be handled according to the disclosed resubmission/refund policy.
              </span>
            </label>
          </div>
        </div>

        {/* SECTION 5: ONE-TIME $6 PAYMENT CHECKOUT */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Step 5: One-Time Featured Post Fee
              </div>
              <h3 className="text-xl font-extrabold text-white">
                Complete Single Submission Payment
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                One-time charge of USD $6.00 (or KES 780 for Kenya via M-Pesa). No recurring subscription.
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                $6.00 <span className="text-sm font-normal text-slate-400">USD</span>
              </div>
              <div className="text-xs text-blue-400 font-mono">
                or KES {FEATURED_POST_PRICE_KES} (M-Pesa)
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentProvider('MPESA')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  paymentProvider === 'MPESA'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">M-Pesa (Kenya)</div>
                  <div className="text-[10px] text-emerald-400 font-mono">KES {FEATURED_POST_PRICE_KES}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider('CARD')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  paymentProvider === 'CARD'
                    ? 'border-blue-500 bg-blue-950/40 text-white ring-1 ring-blue-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Credit / Debit Card</div>
                  <div className="text-[10px] text-blue-400 font-mono">$6.00 USD</div>
                </div>
              </button>
            </div>

            {/* Provider Input Fields */}
            {paymentProvider === 'MPESA' ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Safaricom M-Pesa Mobile Number for STK Push Prompt:
                </label>
                <input 
                  type="text"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="e.g. 0712345678 or 254712345678"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  An automated M-Pesa prompt will be sent to your phone to authorize KES {FEATURED_POST_PRICE_KES}.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Card Number (Visa / Mastercard):
                </label>
                <input 
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Card Number"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Submit & Pay Button */}
          <button
            type="submit"
            disabled={isSubmitting || !originalPreview || !publicationConsent}
            className="w-full py-4 rounded-2xl bg-[#1D64EC] hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                <span>Processing & Verifying Transaction...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  Confirm & Pay {paymentProvider === 'MPESA' ? `KES ${FEATURED_POST_PRICE_KES}` : '$6.00 USD'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
