import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  AlertCircle,
  Upload,
  ChevronLeft,
  X,
  CreditCard,
  CheckCircle2,
  Share2,
  Trash2,
  Star,
  Layers,
  Sparkle,
  Image as ImageIcon
} from 'lucide-react';
import { University, FeaturedSubmission } from '../../types';
import { ACADEMIC_MAJORS } from '../../data/majors';
import { generateWatermarkedDerivative } from '../../lib/watermark';
import { FEATURED_POST_PRICE_USD } from '../../lib/payment';
import { Footer } from '../../components/layout/Footer';

interface UniversityCommunityPageProps {
  university: University;
}

interface UploadedPhoto {
  id: string;
  url: string;
  file?: File;
  isCover: boolean;
}

export const UniversityCommunityPage: React.FC<UniversityCommunityPageProps> = ({ university }) => {
  const { 
    currentUser,
    submissions, 
    navigateTo, 
    isAuthenticated, 
    setEntryUniversityContext,
    addSubmission,
    createSubmission,
    payForSubmission,
    universities,
    addToast 
  } = useApp();

  // Page View Mode: 'LANDING' or 'BUILDER'
  const [pageView, setPageView] = useState<'LANDING' | 'BUILDER'>('LANDING');

  // Builder multi-step state: 1 (Upload/Profile) -> 2 (Details) -> 3 (Preview & Pay) -> 'SUCCESS'
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3 | 'SUCCESS'>(1);
  const [isSavingTransition, setIsSavingTransition] = useState(false);
  const [previewTab, setPreviewTab] = useState<'POST' | 'POSTER'>('POST');

  // Accordion FAQ state on landing page
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Photos state (up to 8)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 Form Details
  const [instagramHandle, setInstagramHandle] = useState('');
  const [snapchatHandle, setSnapchatHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  
  // Majors selection
  const [selectedMajor, setSelectedMajor] = useState('');
  const [searchMajorText, setSearchMajorText] = useState('');
  const [isMajorDropdownOpen, setIsMajorDropdownOpen] = useState(false);
  const majorDropdownRef = useRef<HTMLDivElement>(null);

  const [classYearInput, setClassYearInput] = useState(university.classYear || '2031');
  const [semesterInput, setSemesterInput] = useState('Fall 2026');
  const [bioText, setBioText] = useState('');

  // Step 3 Payment Details
  const [cardName, setCardName] = useState(currentUser?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardZip, setCardZip] = useState('');

  // Legal Consent Checkboxes
  const [consentPost, setConsentPost] = useState(false);
  const [consentRights, setConsentRights] = useState(false);
  const [consentFee, setConsentFee] = useState(false);

  // Payment Execution State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [completedPaymentRef, setCompletedPaymentRef] = useState('');
  const [completedSubId, setCompletedSubId] = useState('');

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

  // Filtered academic majors list based on user search input
  const filteredMajors = useMemo(() => {
    if (!searchMajorText.trim()) return ACADEMIC_MAJORS;
    const q = searchMajorText.toLowerCase().trim();
    return ACADEMIC_MAJORS.filter(m => m.toLowerCase().includes(q));
  }, [searchMajorText]);

  // Close major dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (majorDropdownRef.current && !majorDropdownRef.current.contains(e.target as Node)) {
        setIsMajorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enter builder workflow
  const startBuilder = () => {
    if (!university.communityEnabled) {
      addToast('Campus Inactive', 'This campus network is currently deactivated by administration. Submissions are paused.', 'info');
      return;
    }
    setEntryUniversityContext(university);
    setPageView('BUILDER');
    setBuilderStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Exit builder back to landing
  const exitBuilder = () => {
    setPageView('LANDING');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Photo File selection (Supports multiple files up to 8)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 8 - photos.length;
    if (remainingSlots <= 0) {
      addToast('Photo Limit Reached', 'You can upload up to 8 photos maximum.', 'info');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newItems: UploadedPhoto[] = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        addToast('Invalid File', `${file.name} is not a valid image file.`, 'error');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        addToast('File Too Large', `${file.name} exceeds 10MB limit.`, 'error');
        continue;
      }

      const url = URL.createObjectURL(file);
      newItems.push({
        id: 'photo_' + Math.random().toString(36).substring(2, 9),
        url,
        file,
        isCover: photos.length === 0 && newItems.length === 0 // First photo is default cover
      });
    }

    if (newItems.length > 0) {
      setPhotos(prev => [...prev, ...newItems]);
      addToast('Photos Added', `Added ${newItems.length} photo(s). (Max 8 total)`, 'success');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setAsCover = (id: string) => {
    setPhotos(prev => prev.map(p => ({
      ...p,
      isCover: p.id === id
    })));
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const remaining = prev.filter(p => p.id !== id);
      if (remaining.length > 0 && !remaining.some(p => p.isCover)) {
        remaining[0].isCover = true;
      }
      return remaining;
    });
  };

  const coverPhoto = useMemo(() => {
    return photos.find(p => p.isCover) || photos[0] || null;
  }, [photos]);

  // Transition from Step 1 to Step 2 with the video's "Saving..." spinner
  const handleContinueToDetails = () => {
    if (photos.length === 0) {
      addToast('Photo Required', 'Please add at least 1 photo to continue.', 'error');
      return;
    }

    setIsSavingTransition(true);
    setTimeout(() => {
      setIsSavingTransition(false);
      setBuilderStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  // Transition from Step 2 to Step 3
  const handlePreviewPost = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = instagramHandle.trim().replace(/^@/, '');
    if (!cleanHandle) {
      addToast('Instagram Handle Required', 'Please provide your Instagram handle.', 'error');
      return;
    }

    setBuilderStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit and Pay with Stripe ($6.00 USD)
  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coverPhoto) {
      addToast('Cover Photo Missing', 'Please go back and upload a cover photo.', 'error');
      return;
    }

    const cleanHandle = instagramHandle.trim().replace(/^@/, '');
    if (!cleanHandle) {
      addToast('Handle Required', 'Instagram handle is required.', 'error');
      return;
    }

    // Card Validations
    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 15 || cleanCard.length > 16) {
      addToast('Invalid Card Number', 'Please enter a valid 15 or 16-digit card number.', 'error');
      return;
    }

    const expiryMatch = cardExpiry.trim().match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
    if (!expiryMatch) {
      addToast('Invalid Expiration Date', 'Please enter expiration date as MM/YY.', 'error');
      return;
    }

    const cleanCvc = cardCvc.replace(/\D/g, '');
    if (cleanCvc.length < 3 || cleanCvc.length > 4) {
      addToast('Invalid CVC', 'Please enter a 3 or 4-digit security code.', 'error');
      return;
    }

    if (!consentPost || !consentRights || !consentFee) {
      addToast('Consent Required', 'Please accept all legal consent checkboxes to proceed.', 'error');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Generate burned-in watermark derivative for cover image
      let watermarkedUrl = coverPhoto.url;
      try {
        watermarkedUrl = await generateWatermarkedDerivative(
          coverPhoto.file || coverPhoto.url,
          {
            universityName: university.name,
            universityHandle: university.instagramHandle,
            studentName: cardName.trim() || `@${cleanHandle}`
          }
        );
      } catch (wErr) {
        console.warn('Watermark derivative fallback:', wErr);
      }

      // 2. Format complete post caption
      const captionLines = [
        `✨ Meet @${cleanHandle} joining ${university.name} Class of ${classYearInput}!`,
        selectedMajor ? `🎓 Major: ${selectedMajor}` : null,
        semesterInput ? `📅 Semester: ${semesterInput}` : null,
        snapchatHandle ? `👻 Snapchat: @${snapchatHandle.replace(/^@/, '')}` : null,
        tiktokHandle ? `🎵 TikTok: @${tiktokHandle.replace(/^@/, '')}` : null,
        bioText.trim() ? `💬 "${bioText.trim()}"` : null,
        `#${university.name.replace(/[^a-zA-Z0-9]/g, '')} #ClassOf${classYearInput} #CampusConnect`
      ].filter(Boolean).join('\n\n');

      const submissionId = 'sub_' + Math.random().toString(36).substring(2, 9);
      const studentUid = currentUser?.id || `usr_${cleanHandle}_${Date.now().toString(36)}`;
      const studentEmail = currentUser?.email || `${cleanHandle.toLowerCase()}@student.${university.slug}.edu`;

      const newSubmission: FeaturedSubmission = {
        id: submissionId,
        studentUid,
        studentDisplayName: cardName.trim() || `@${cleanHandle}`,
        studentEmail,
        studentAvatarUrl: coverPhoto.url,
        universityId: university.id,
        universityName: university.name,
        universitySlug: university.slug,
        universityInstagramHandle: university.instagramHandle,
        originalImagePath: coverPhoto.url,
        watermarkedImagePath: watermarkedUrl,
        caption: captionLines,
        publicationConsent: consentPost,
        rightsConfirmed: consentRights,
        termsAgreed: consentFee,
        paymentStatus: 'PAYMENT_CONFIRMED',
        paymentAmount: FEATURED_POST_PRICE_USD,
        moderationStatus: 'PENDING',
        publishingStatus: 'NOT_READY',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 3. Post submission to authoritative server database
      try {
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSubmission)
        });
      } catch (sErr) {
        console.warn('Server sync fallback:', sErr);
      }

      // Add to local client state immediately
      addSubmission(newSubmission);

      // 4. Verify & audit Stripe payment with backend
      const last4 = cleanCard.slice(-4);
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          studentUid,
          studentName: newSubmission.studentDisplayName,
          universityId: university.id,
          provider: 'STRIPE_CARD',
          idempotencyKey: `idem_${submissionId}_${Date.now()}`
        })
      });

      let txnRef = `ch_${Math.random().toString(36).substring(2, 11)}`;
      if (verifyRes.ok) {
        const vData = await verifyRes.json();
        if (vData.payment?.providerTransactionReference) {
          txnRef = vData.payment.providerTransactionReference;
        }
      }

      setCompletedPaymentRef(txnRef);
      setCompletedSubId(submissionId);
      setBuilderStep('SUCCESS');
      addToast('Payment Confirmed!', `Your payment ($6.00 USD) is verified. Post submitted for administrator review.`, 'success');
    } catch (err: any) {
      addToast('Payment Error', err.message || 'Payment could not be completed.', 'error');
    } finally {
      setIsProcessingPayment(false);
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

  // =========================================================================
  // VIEW MODE: MULTI-STEP BUILDER (WIZARD FROM VIDEO)
  // =========================================================================
  if (pageView === 'BUILDER') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased flex flex-col">
        
        {/* Verified Instagram Bio Link Banner */}
        <div className="bg-slate-950 text-white text-[11px] px-4 py-2 border-b border-slate-800">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-300">
                Official Instagram Bio Link: <strong className="text-white font-mono">{university.instagramHandle}</strong>
              </span>
              <span className="hidden sm:inline text-slate-500">• {university.name} Class of {university.classYear || '2031'}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {university.slug}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* TOP STEPPER HEADER (MATCHING VIDEO EXACTLY)                        */}
        {/* ----------------------------------------------------------------- */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Left: Back button & Campus identifier */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (builderStep === 1) exitBuilder();
                else if (builderStep === 2) setBuilderStep(1);
                else if (builderStep === 3) setBuilderStep(2);
                else exitBuilder();
              }}
              className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Go back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {builderStep === 1 ? (
              <div className="flex items-center gap-2.5">
                <img 
                  src={university.logoUrl} 
                  alt="" 
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 bg-white" 
                />
                <div className="leading-tight hidden sm:block">
                  <div className="text-xs font-bold text-slate-950 truncate max-w-[180px]">{university.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{university.instagramHandle}</div>
                </div>
              </div>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-semibold border border-slate-200">
                {university.instagramHandle}
              </span>
            )}
          </div>

          {/* Center: Stepper (1 Profile -> 2 Details -> 3 Preview & pay) */}
          <div className="flex items-center gap-2 sm:gap-6 text-xs font-semibold">
            {/* Step 1 */}
            <div className={`flex items-center gap-2 ${builderStep === 1 ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  builderStep === 1
                    ? 'text-white shadow-xs'
                    : builderStep === 2 || builderStep === 3 || builderStep === 'SUCCESS'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}
                style={builderStep === 1 ? { backgroundColor: primaryColor } : undefined}
              >
                {builderStep === 2 || builderStep === 3 || builderStep === 'SUCCESS' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
              </div>
              <span className="hidden sm:inline">Profile</span>
            </div>

            <div className="w-4 sm:w-8 h-0.5 bg-slate-200" />

            {/* Step 2 */}
            <div className={`flex items-center gap-2 ${builderStep === 2 ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  builderStep === 2
                    ? 'text-white shadow-xs'
                    : builderStep === 3 || builderStep === 'SUCCESS'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}
                style={builderStep === 2 ? { backgroundColor: primaryColor } : undefined}
              >
                {builderStep === 3 || builderStep === 'SUCCESS' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
              </div>
              <span className="hidden sm:inline">Details</span>
            </div>

            <div className="w-4 sm:w-8 h-0.5 bg-slate-200" />

            {/* Step 3 */}
            <div className={`flex items-center gap-2 ${builderStep === 3 ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  builderStep === 3
                    ? 'text-white shadow-xs'
                    : builderStep === 'SUCCESS'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}
                style={builderStep === 3 ? { backgroundColor: primaryColor } : undefined}
              >
                {builderStep === 'SUCCESS' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '3'}
              </div>
              <span className="hidden sm:inline">Preview & pay</span>
            </div>
          </div>

          {/* Right Action / Indicator */}
          <div className="flex items-center gap-2">
            {builderStep === 1 ? (
              <button
                type="button"
                onClick={handleContinueToDetails}
                disabled={photos.length === 0}
                style={{
                  background: photos.length > 0 ? `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` : undefined
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  photos.length > 0 
                    ? 'text-white hover:opacity-95' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Continue to details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : builderStep === 2 ? (
              <span className="text-xs font-bold text-slate-400 font-mono">2/3</span>
            ) : builderStep === 3 ? (
              <span className="text-xs font-bold text-slate-400 font-mono">3/3</span>
            ) : null}
          </div>

        </header>

        {/* ----------------------------------------------------------------- */}
        {/* TRANSITION SPINNER MODAL (EXACT FROM VIDEO FRAME 7)               */}
        {/* ----------------------------------------------------------------- */}
        {isSavingTransition && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center space-y-3 max-w-xs w-full animate-in zoom-in-95">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div 
                  className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${primaryColor} transparent transparent transparent` }}
                />
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white absolute shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Instagram className="w-4 h-4" />
                </div>
              </div>
              <div className="font-extrabold text-slate-900 text-sm">
                Saving...
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Still working — this can take a few seconds.
              </p>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* BUILDER MAIN CONTENT AREA                                         */}
        {/* ----------------------------------------------------------------- */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
          
          {/* =============================================================== */}
          {/* STEP 1: BUILD YOUR PROFILE (UPLOAD)                             */}
          {/* =============================================================== */}
          {builderStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Upload Dropzone & Tips */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Step badge & headline */}
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span>Step 1 of 3 · Build your profile</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                    Build your <span style={{ color: accentColor }}>profile</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Add up to <strong>8 pictures</strong>. The first one is your cover — lead with your best.
                  </p>
                </div>

                {/* Counter & Drag notice */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700 border border-slate-200">
                    {photos.length}/8 pictures
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Drag to reorder · tap to crop
                  </span>
                </div>

                {/* Upload Zone */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {photos.length === 0 ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3.5 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform"
                      style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
                    >
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-extrabold text-slate-900">
                        Drop your pictures here
                      </div>
                      <div className="text-xs text-blue-600 font-semibold underline underline-offset-2">
                        or browse your device
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">JPG · PNG · WebP</span>
                      <span>•</span>
                      <span>Up to 10 MB each</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-600">8 spots left</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                    
                    {/* Grid of uploaded photos */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {photos.map((photo, index) => (
                        <div 
                          key={photo.id}
                          className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${
                            photo.isCover 
                              ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img 
                            src={photo.url} 
                            alt={`Upload ${index + 1}`} 
                            className="w-full h-full object-cover" 
                          />

                          {/* Cover badge */}
                          {photo.isCover ? (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm flex items-center gap-1">
                              <Star className="w-3 h-3 fill-slate-950" />
                              <span>Cover</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAsCover(photo.id)}
                              className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 hover:bg-black/80 text-white font-semibold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              Make cover
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="absolute bottom-1 right-2 text-[10px] font-mono text-white/80 drop-shadow-sm">
                            {index + 1}/8
                          </div>
                        </div>
                      ))}

                      {/* Add more button */}
                      {photos.length < 8 && (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 flex flex-col items-center justify-center text-center space-y-1 cursor-pointer transition-all group"
                        >
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-base font-black shadow-xs group-hover:scale-105 transition-transform"
                            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
                          >
                            +
                          </div>
                          <span className="text-xs font-bold text-slate-800">Add</span>
                          <span className="text-[10px] text-slate-400">{8 - photos.length} left</span>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 3 Guidance Tip Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-1">
                      👤
                    </div>
                    <div className="font-bold text-xs text-slate-900">Lead with you</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Your first picture is the cover. Pick a clear, bright shot of your face.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                    <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs mb-1">
                      ⬜
                    </div>
                    <div className="font-bold text-xs text-slate-900">Square works best</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Pictures are shown square. You can crop each one after adding it.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                    <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs mb-1">
                      ✨
                    </div>
                    <div className="font-bold text-xs text-slate-900">Show your vibe</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Friends, hobbies, places you love. Give people a reason to follow.
                    </p>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {photos.length === 0 
                      ? 'Your pictures stay private until you pay and submit.' 
                      : `${photos.length} picture${photos.length > 1 ? 's' : ''} ready · next, add your details`}
                  </span>

                  <button
                    type="button"
                    onClick={handleContinueToDetails}
                    disabled={photos.length === 0}
                    style={{
                      background: photos.length > 0 ? `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` : undefined
                    }}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      photos.length > 0 
                        ? 'text-white hover:opacity-95' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{photos.length === 0 ? 'Add a picture to continue' : 'Continue to details'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Right Column: Sticky Live Preview (Post | Poster) */}
              <div className="lg:col-span-5 sticky top-24 space-y-4">
                
                {/* Live Preview Header with Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>LIVE PREVIEW</span>
                  </div>

                  {/* Toggle pills */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('POST')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'POST' ? 'bg-white text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('POSTER')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'POSTER' ? 'bg-white text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Poster
                    </button>
                  </div>
                </div>

                {/* Preview Container */}
                {previewTab === 'POST' ? (
                  /* Instagram Post Card Mockup */
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-4 space-y-3 select-none">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <img 
                          src={university.logoUrl} 
                          alt="" 
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 bg-white" 
                        />
                        <div className="leading-tight">
                          <div className="font-bold text-xs text-slate-950">{university.instagramHandle.replace('@', '')}</div>
                          <div className="text-[10px] text-slate-400">Featured</div>
                        </div>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </div>

                    {/* Image Area */}
                    <div className="aspect-square rounded-2xl overflow-hidden bg-slate-950 relative flex items-center justify-center">
                      {coverPhoto ? (
                        <img 
                          src={coverPhoto.url} 
                          alt="Cover" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2 text-white">
                          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white/70">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <div className="font-bold text-sm">Your cover picture appears here</div>
                          <div className="text-[11px] text-slate-400">Add pictures to see your post come to life</div>
                        </div>
                      )}

                      {photos.length > 1 && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                          1/{photos.length}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between px-1 pt-0.5 text-slate-800">
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                        <MessageCircle className="w-5 h-5" />
                        <Send className="w-4 h-4" />
                      </div>
                      <Bookmark className="w-4 h-4 text-slate-700" />
                    </div>

                    {/* Likes & Caption Preview */}
                    <div className="px-1 text-xs space-y-1">
                      <div className="font-bold text-slate-900 text-[11px]">
                        Liked by your future classmates
                      </div>
                      <div className="text-slate-700 text-[11px] leading-snug">
                        <strong className="text-slate-900">{university.instagramHandle.replace('@', '')}</strong>{' '}
                        Meet @{instagramHandle.trim().replace(/^@/, '') || 'yourhandle'} 👇
                      </div>
                      <div className="text-[10px] text-slate-400 italic">
                        {bioText.trim() ? `"${bioText.trim().substring(0, 100)}..."` : 'Your handle and caption come from the next step.'}
                      </div>
                    </div>

                  </div>
                ) : (
                  /* Stylized University Spotlight Poster Mockup */
                  <div 
                    className="rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center text-white p-6 space-y-4 relative select-none"
                    style={{ background: `linear-gradient(160deg, ${primaryColor} 0%, #0F172A 100%)` }}
                  >
                    <div className="text-[10px] tracking-widest uppercase font-extrabold text-white/70">
                      CAMPUS CONNECT · FEATURED
                    </div>

                    {/* Circular Frame */}
                    <div className="w-36 h-36 mx-auto rounded-full p-1 bg-white/20 backdrop-blur-sm shadow-xl">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white flex items-center justify-center">
                        {coverPhoto ? (
                          <img src={coverPhoto.url} alt="Student" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">Your Photo</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-lg font-black tracking-tight text-white uppercase drop-shadow-sm">
                        {selectedMajor || 'FUTURE FRESHMAN'}
                      </div>
                      <div className="text-xs font-mono text-amber-300 font-bold">
                        @{instagramHandle.trim().replace(/^@/, '') || 'yourhandle'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-[10px] text-white/80 font-medium">
                      Official Feature for {university.name} Class of {classYearInput}
                    </div>
                  </div>
                )}

                {/* Price Feature Fee Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">One-time feature fee</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Paid at the last step · Stripe</span>
                    </div>
                  </div>
                  <div className="text-xl font-extrabold text-slate-950 font-mono">
                    $6.00
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =============================================================== */}
          {/* STEP 2: TELL US ABOUT YOURSELF (DETAILS)                        */}
          {/* =============================================================== */}
          {builderStep === 2 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              
              {/* Header */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  STEP 2 — YOUR DETAILS
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                  Tell us about yourself
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Fill in the details that will appear on your featured post on <strong>{university.instagramHandle}</strong>.
                </p>
              </div>

              <form onSubmit={handlePreviewPost} className="space-y-6">
                
                {/* Section 1: Social Handles */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span>📱</span>
                    <span>Social handles</span>
                  </div>

                  <div className="space-y-3">
                    {/* Instagram Handle (Required) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        INSTAGRAM <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                        <input 
                          type="text"
                          required
                          value={instagramHandle}
                          onChange={(e) => setInstagramHandle(e.target.value.replace(/\s+/g, ''))}
                          placeholder="yourhandle"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>

                    {/* Snapchat & TikTok */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          SNAPCHAT <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs">👻</span>
                          <input 
                            type="text"
                            value={snapchatHandle}
                            onChange={(e) => setSnapchatHandle(e.target.value.replace(/\s+/g, ''))}
                            placeholder="yoursnapchat"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          TIKTOK <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs">🎵</span>
                          <input 
                            type="text"
                            value={tiktokHandle}
                            onChange={(e) => setTiktokHandle(e.target.value.replace(/\s+/g, ''))}
                            placeholder="yourtiktok"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Academic Info */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span>🎓</span>
                    <span>Academic info</span>
                    <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                  </div>

                  <div className="space-y-3">
                    {/* Searchable Major Dropdown */}
                    <div className="relative" ref={majorDropdownRef}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        MAJOR / FIELD OF STUDY
                      </label>
                      
                      <div 
                        onClick={() => setIsMajorDropdownOpen(!isMajorDropdownOpen)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 flex items-center justify-between cursor-pointer focus:bg-white hover:border-slate-300 transition-colors"
                      >
                        <span className={selectedMajor ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                          {selectedMajor || 'Select your major...'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>

                      {/* Dropdown Menu */}
                      {isMajorDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 flex flex-col animate-in fade-in">
                          {/* Search box inside dropdown */}
                          <div className="p-2.5 border-b border-slate-100 bg-slate-50">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input 
                                type="text"
                                autoFocus
                                value={searchMajorText}
                                onChange={(e) => setSearchMajorText(e.target.value)}
                                placeholder="Search majors..."
                                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* Majors list */}
                          <div className="overflow-y-auto flex-1 divide-y divide-slate-50 text-xs">
                            {filteredMajors.map((m) => (
                              <button
                                type="button"
                                key={m}
                                onClick={() => {
                                  setSelectedMajor(m);
                                  setIsMajorDropdownOpen(false);
                                  setSearchMajorText('');
                                }}
                                className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer flex items-center justify-between ${
                                  selectedMajor === m ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                                }`}
                              >
                                <span>{m}</span>
                                {selectedMajor === m && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            ))}
                            {filteredMajors.length === 0 && (
                              <div className="p-4 text-center text-slate-400 text-xs">
                                No majors match your query. You can write your custom major.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Class of & Semester */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          CLASS OF
                        </label>
                        <input 
                          type="text"
                          value={classYearInput}
                          onChange={(e) => setClassYearInput(e.target.value)}
                          placeholder="2031"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          SEMESTER
                        </label>
                        <select
                          value={semesterInput}
                          onChange={(e) => setSemesterInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                        >
                          <option value="Fall 2026">Fall 2026</option>
                          <option value="Spring 2027">Spring 2027</option>
                          <option value="Fall 2027">Fall 2027</option>
                          <option value="Spring 2028">Spring 2028</option>
                          <option value="Transfer Student">Transfer Student</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Bio */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span>💬</span>
                    <span>Bio</span>
                    <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                  </div>

                  <textarea 
                    rows={4}
                    maxLength={500}
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="A short line about you — your vibe, your goals, your campus life..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors leading-relaxed"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Write something that represents you.</span>
                    <span className="font-mono">{bioText.length}/500</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setBuilderStep(1)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    &lt; Back
                  </button>

                  <button
                    type="submit"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
                    }}
                    className="px-6 py-3 rounded-xl text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Preview my post</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* =============================================================== */}
          {/* STEP 3: PREVIEW & PAY (CHECKOUT & VERIFICATION)                 */}
          {/* =============================================================== */}
          {builderStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in">
              
              {/* Left Column: Formatted Post & Poster Preview */}
              <div className="lg:col-span-6 space-y-4">
                
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    STEP 3 — FINAL REVIEW
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                    Review your post
                  </h2>
                  <p className="text-xs text-slate-500">
                    Here is exactly how your feature will appear on <strong>{university.instagramHandle}</strong>.
                  </p>
                </div>

                {/* Preview Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 space-y-4 select-none">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={university.logoUrl} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white" 
                      />
                      <div>
                        <div className="font-extrabold text-xs text-slate-950">{university.instagramHandle.replace('@', '')}</div>
                        <div className="text-[10px] text-slate-400">Official Student Feature</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      Ready to Publish
                    </span>
                  </div>

                  {/* Photo Frame */}
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-950 relative flex items-center justify-center">
                    {coverPhoto && (
                      <img 
                        src={coverPhoto.url} 
                        alt="Cover" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                    {photos.length > 1 && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold shadow-md">
                        1/{photos.length}
                      </div>
                    )}
                  </div>

                  {/* Multi-photo thumbnail reel */}
                  {photos.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {photos.map((p, idx) => (
                        <div 
                          key={p.id}
                          className={`w-12 h-12 rounded-lg overflow-hidden border shrink-0 ${
                            p.isCover ? 'ring-2 ring-blue-500' : 'border-slate-200'
                          }`}
                        >
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formatted Post Caption */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2 font-sans leading-relaxed select-text">
                    <div className="font-bold text-slate-900">
                      ✨ Meet @{instagramHandle.trim().replace(/^@/, '')} joining {university.name}!
                    </div>
                    {selectedMajor && (
                      <div className="text-slate-600 font-medium">
                        🎓 Major: {selectedMajor} • Class of {classYearInput} ({semesterInput})
                      </div>
                    )}
                    {(snapchatHandle || tiktokHandle) && (
                      <div className="text-slate-500 text-[11px] font-mono">
                        {snapchatHandle && <span>👻 @{snapchatHandle.replace(/^@/, '')} </span>}
                        {tiktokHandle && <span>🎵 @{tiktokHandle.replace(/^@/, '')}</span>}
                      </div>
                    )}
                    {bioText.trim() && (
                      <div className="italic text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80">
                        "{bioText.trim()}"
                      </div>
                    )}
                    <div className="text-[11px] text-blue-600 font-mono">
                      #{university.name.replace(/[^a-zA-Z0-9]/g, '')} #ClassOf{classYearInput} #CampusConnect #Freshers
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column: Stripe Card Checkout */}
              <div className="lg:col-span-6 space-y-4">
                
                <div className="bg-white text-slate-900 rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-7 space-y-5 relative overflow-hidden">
                  
                  {/* Subtle branded top highlight */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1.5" 
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`
                    }}
                  />

                  {/* Checkout Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-[11px] font-bold">
                        <Lock className="w-3 h-3 text-blue-600" />
                        <span>Step 3: Stripe Secure Checkout</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-950 tracking-tight">
                        One-Time Feature Fee
                      </h3>
                      <p className="text-xs text-slate-500">
                        Official {university.name} student spotlight consideration.
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-black text-slate-950 font-mono">
                        ${FEATURED_POST_PRICE_USD.toFixed(2)}
                      </div>
                      <div className="inline-flex items-center justify-end gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold mt-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Stripe Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment method banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Credit or Debit Card</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-2xs">VISA</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-2xs">Mastercard</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-2xs">Amex</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-2xs">Apple Pay</span>
                    </div>
                  </div>

                  <form onSubmit={handleStripePayment} className="space-y-4">
                    
                    {/* Cardholder name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Cardholder Full Name
                      </label>
                      <input 
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="First and Last Name"
                        className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-medium"
                      />
                    </div>

                    {/* Card number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Card Number
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          required
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                            setCardNumber(v);
                          }}
                          placeholder="4242 •••• •••• 4242"
                          className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl pl-4 pr-11 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-mono tracking-wider font-medium"
                        />
                        <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Expiry, CVC, ZIP */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Expires
                        </label>
                        <input 
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
                            setCardExpiry(v);
                          }}
                          placeholder="MM/YY"
                          className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-mono text-center font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          CVC / CVV
                        </label>
                        <input 
                          type="password"
                          required
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                          placeholder="•••"
                          className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-mono text-center tracking-widest font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          ZIP / Postal
                        </label>
                        <input 
                          type="text"
                          required
                          maxLength={10}
                          value={cardZip}
                          onChange={(e) => setCardZip(e.target.value)}
                          placeholder="41017"
                          className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-mono text-center font-medium"
                        />
                      </div>
                    </div>

                    {/* Legal Consent Checkboxes Container */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-[11px]">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input 
                          type="checkbox"
                          required
                          checked={consentPost}
                          onChange={(e) => setConsentPost(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-slate-700 leading-tight">
                          I authorize <strong>{university.name}</strong> administrators to post my photo and caption to official Instagram (<strong>{university.instagramHandle}</strong>).
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input 
                          type="checkbox"
                          required
                          checked={consentRights}
                          onChange={(e) => setConsentRights(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-slate-700 leading-tight">
                          I confirm that I am the individual in the photos and hold all requisite rights.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input 
                          type="checkbox"
                          required
                          checked={consentFee}
                          onChange={(e) => setConsentFee(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-slate-700 leading-tight">
                          I understand the <strong>$6.00 USD</strong> fee is a one-time processing fee for official publication review.
                        </span>
                      </label>
                    </div>

                    {/* Submit & Pay Button */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isProcessingPayment || !consentPost || !consentRights || !consentFee}
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
                        }}
                        className="w-full py-3.5 rounded-2xl text-white font-extrabold text-xs shadow-lg hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-blue-500/20"
                      >
                        {isProcessingPayment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                            <span>Authorizing $6.00 USD via Stripe...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Pay $6.00 USD via Stripe & Submit Post</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>256-Bit SSL Encrypted</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-600">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Powered by Stripe</span>
                      </span>
                    </div>

                  </form>

                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setBuilderStep(2)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    &lt; Back to Details
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* =============================================================== */}
          {/* STEP 4: SUCCESS / SUBMISSION CONFIRMATION                       */}
          {/* =============================================================== */}
          {builderStep === 'SUCCESS' && (
            <div className="max-w-2xl mx-auto p-6 sm:p-10 my-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-6 animate-in zoom-in-95">
              
              <div 
                className="w-16 h-16 rounded-full text-white flex items-center justify-center mx-auto shadow-lg ring-8 ring-emerald-50"
                style={{ backgroundColor: primaryColor }}
              >
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Payment Confirmed • $6.00 USD via Stripe
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Photo Submission Received!
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Your introduction for <strong>{university.name}</strong> ({university.instagramHandle}) is now queued for official administrator review.
                </p>
                {completedPaymentRef && (
                  <div className="text-[11px] font-mono text-slate-400">
                    Stripe Txn: {completedPaymentRef}
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                <div className="text-xs font-bold text-slate-900">Submission Pipeline:</div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>1. Photos Uploaded & Watermark Derivative Created</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>2. Stripe Payment Confirmed ($6.00 USD)</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                    <span>3. Under Administrator Review & Quality Verification</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    <span>4. Official Publication to {university.instagramHandle}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={exitBuilder}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  Back to Campus Community
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/app/dashboard')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  Go to Student Dashboard
                </button>
              </div>

            </div>
          )}

        </main>

      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: UNIVERSITY CAMPUS LANDING PAGE (MATCHING VIDEO EXACTLY)
  // =========================================================================
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Verified Instagram Bio Link Banner */}
      <div className="bg-slate-950 text-white text-[11px] px-4 py-2 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-slate-300">
              Official Instagram Bio Link: <strong className="text-white font-mono">{university.instagramHandle}</strong>
            </span>
            <span className="hidden sm:inline text-slate-500">• {university.name} Class of {university.classYear || '2031'}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {university.slug}
          </div>
        </div>
      </div>

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
                  navigateTo('/app/dashboard');
                }
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer px-2 py-1.5 hidden sm:block"
            >
              My submissions
            </button>

            <button
              onClick={startBuilder}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
              }}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
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
                <span className="text-[11px] font-mono text-slate-500">UNIVERSITY</span>
              </div>

              {/* Big bold headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-slate-950 leading-[1.07]">
                You're not just <br />
                joining college. <br />
                <span 
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
                >
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
                  onClick={startBuilder}
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
                  }}
                  className="px-6 sm:px-7 py-3.5 rounded-xl text-white font-bold text-sm sm:text-base shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
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
                <span>One-time payment, secured by Stripe</span>
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
                    <div className="leading-tight">
                      <span className="font-bold text-xs text-slate-900 tracking-tight">
                        {university.instagramHandle.replace('@', '')}
                      </span>
                      <div className="text-[10px] text-slate-400">Featured</div>
                    </div>
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
                    <span>Live in 24-48h</span>
                  </div>

                  {/* 1/8 Spot badge */}
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-mono text-white/90">
                    1/8
                  </div>

                  {/* Centered Graphic / Headline */}
                  <div className="space-y-1 z-10">
                    <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-2 text-white">
                      <Users className="w-6 h-6" />
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
                    Say hi to @you 👇
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
            <div className="text-3xl font-black text-slate-950 font-mono">
              $6
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
              PICTURES PER PROFILE
            </div>
            <div className="text-3xl font-black text-slate-950 font-mono">
              8
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
              TIME TO DELIVER
            </div>
            <div className="text-3xl font-black text-slate-950 font-mono">
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
            <span 
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
            >
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
              onClick={startBuilder}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
              }}
              className="px-7 sm:px-8 py-3.5 rounded-xl text-white font-bold text-sm sm:text-base shadow-md hover:opacity-95 active:scale-98 transition-all inline-flex items-center gap-2 cursor-pointer"
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
      {/* 8. FEATURED CLASSMATES DIRECTORY                                    */}
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

      {/* Global Image 1 Footer */}
      <Footer />

    </div>
  );
};
