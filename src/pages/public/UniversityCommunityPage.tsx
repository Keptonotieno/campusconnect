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
  Zap,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { University, FeaturedSubmission } from '../../types';
import { ACADEMIC_MAJORS } from '../../data/majors';
import { generateWatermarkedDerivative } from '../../lib/watermark';
import { FEATURED_POST_PRICE_USD } from '../../lib/payment';
import { Footer } from '../../components/layout/Footer';
import { CampusEmblemBadge } from '../../components/common/CampusEmblemBadge';

interface UniversityCommunityPageProps {
  university: University;
  initialView?: 'LANDING' | 'BUILDER';
}

interface UploadedPhoto {
  id: string;
  url: string;
  file?: File;
  isCover: boolean;
}

export const UniversityCommunityPage: React.FC<UniversityCommunityPageProps> = ({ university, initialView }) => {
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
  const [pageView, setPageView] = useState<'LANDING' | 'BUILDER'>(() => {
    if (initialView) return initialView;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/submit/')) {
      return 'BUILDER';
    }
    return 'LANDING';
  });

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
  const [studentEmailInput, setStudentEmailInput] = useState(currentUser?.email || '');
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

  useEffect(() => {
    if (currentUser?.email && !studentEmailInput) {
      setStudentEmailInput(currentUser.email);
    }
  }, [currentUser?.email]);

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

  // Check if a post was promoted via Stripe payment integration ($6 feature)
  const isStripePromoted = (s: FeaturedSubmission) => {
    return s.paymentStatus === 'PAYMENT_CONFIRMED' || 
           s.paymentAmount === 6 ||
           (typeof s.paymentReference === 'string' && s.paymentReference.length > 0);
  };

  // Filter approved & published submissions (plus current student's confirmed submissions) for this university
  const universityFeaturedPosts = useMemo(() => {
    const list = submissions.filter(
      (s) => (s.universityId === university.id || s.universitySlug === university.slug) &&
             ((s.moderationStatus === 'APPROVED' && s.publishingStatus === 'PUBLISHED') ||
              (currentUser && s.studentUid === currentUser.id && s.paymentStatus === 'PAYMENT_CONFIRMED'))
    );

    // Prioritized sorting: Stripe promoted posts come FIRST, then sorted by most recent
    return [...list].sort((a, b) => {
      const aPromoted = isStripePromoted(a) ? 1 : 0;
      const bPromoted = isStripePromoted(b) ? 1 : 0;
      if (bPromoted !== aPromoted) return bPromoted - aPromoted;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }, [submissions, university, currentUser]);

  // Post filter state (All vs Featured Promoted only)
  const [postFilter, setPostFilter] = useState<'ALL' | 'FEATURED_ONLY'>('ALL');

  const stripePromotedCount = useMemo(() => {
    return universityFeaturedPosts.filter(isStripePromoted).length;
  }, [universityFeaturedPosts]);

  const displayedPosts = useMemo(() => {
    if (postFilter === 'FEATURED_ONLY') {
      return universityFeaturedPosts.filter(isStripePromoted);
    }
    return universityFeaturedPosts;
  }, [universityFeaturedPosts, postFilter]);

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

  // Draft initialization and persistence tracking
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);
  const [savedDraftForCampus, setSavedDraftForCampus] = useState<any | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Check for existing draft on initial mount:
  // - If URL has ?resume=true or ?step=..., explicitly restore draft
  // - Otherwise, start with 100% clean inputs for new students, offering an optional resume prompt
  useEffect(() => {
    try {
      const draftKey = `campusconnect_draft_${university.slug}`;
      const savedRaw = localStorage.getItem(draftKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && (saved.universitySlug === university.slug || saved.universityId === university.id)) {
          const hasContent = (Array.isArray(saved.photos) && saved.photos.length > 0) || 
                             saved.instagramHandle || 
                             saved.bioText || 
                             saved.selectedMajor;

          if (hasContent) {
            setSavedDraftForCampus(saved);

            const urlParams = new URLSearchParams(window.location.search);
            const isResume = urlParams.get('resume') === 'true';
            const explicitStep = urlParams.get('step');

            if (isResume || explicitStep) {
              if (Array.isArray(saved.photos) && saved.photos.length > 0) {
                setPhotos(saved.photos);
              }
              if (saved.studentEmail) setStudentEmailInput(saved.studentEmail);
              if (saved.instagramHandle) setInstagramHandle(saved.instagramHandle);
              if (saved.snapchatHandle) setSnapchatHandle(saved.snapchatHandle);
              if (saved.tiktokHandle) setTiktokHandle(saved.tiktokHandle);
              if (saved.selectedMajor) setSelectedMajor(saved.selectedMajor);
              if (saved.bioText) setBioText(saved.bioText);
              if (saved.classYear) setClassYearInput(saved.classYear);
              if (saved.semester) setSemesterInput(saved.semester);

              setPageView('BUILDER');
              const stepNum = explicitStep ? parseInt(explicitStep) : (saved.builderStep || 1);
              if (stepNum === 2 || stepNum === 3) {
                setBuilderStep(stepNum as 2 | 3);
              } else {
                setBuilderStep(1);
              }
            } else {
              // New student visit defaults to pristine clean slate; draft banner gives choice to resume
              setShowDraftBanner(true);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to inspect draft:', e);
    } finally {
      setHasInitializedDraft(true);
    }
  }, [university.slug, university.id]);

  // Handler to explicitly resume a previous unfinished submission for this school
  const handleResumeSavedDraft = () => {
    if (!savedDraftForCampus) return;
    if (Array.isArray(savedDraftForCampus.photos) && savedDraftForCampus.photos.length > 0) {
      setPhotos(savedDraftForCampus.photos);
    }
    if (savedDraftForCampus.studentEmail) setStudentEmailInput(savedDraftForCampus.studentEmail);
    if (savedDraftForCampus.instagramHandle) setInstagramHandle(savedDraftForCampus.instagramHandle);
    if (savedDraftForCampus.snapchatHandle) setSnapchatHandle(savedDraftForCampus.snapchatHandle);
    if (savedDraftForCampus.tiktokHandle) setTiktokHandle(savedDraftForCampus.tiktokHandle);
    if (savedDraftForCampus.selectedMajor) setSelectedMajor(savedDraftForCampus.selectedMajor);
    if (savedDraftForCampus.bioText) setBioText(savedDraftForCampus.bioText);
    if (savedDraftForCampus.classYear) setClassYearInput(savedDraftForCampus.classYear);
    if (savedDraftForCampus.semester) setSemesterInput(savedDraftForCampus.semester);

    const stepNum = savedDraftForCampus.builderStep || 1;
    if (stepNum === 2 || stepNum === 3) {
      setBuilderStep(stepNum as 2 | 3);
    } else {
      setBuilderStep(1);
    }
    setPageView('BUILDER');
    setShowDraftBanner(false);
    addToast('Draft Resumed', `Resumed your previous submission for ${university.name}.`, 'info');
  };

  // Handler to discard existing draft and start fresh from Step 1
  const handleStartFreshSubmission = () => {
    try {
      localStorage.removeItem(`campusconnect_draft_${university.slug}`);
      const activeRaw = localStorage.getItem('campusconnect_active_draft');
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        if (parsed?.universitySlug === university.slug) {
          localStorage.removeItem('campusconnect_active_draft');
        }
      }
    } catch {}
    setSavedDraftForCampus(null);
    setShowDraftBanner(false);
    setPhotos([]);
    setInstagramHandle('');
    setSnapchatHandle('');
    setTiktokHandle('');
    setSelectedMajor('');
    setBioText('');
    setClassYearInput('2031');
    setSemesterInput('Fall 2026');
    setBuilderStep(1);
    addToast('Clean Slate', `Started fresh submission for ${university.name}.`, 'success');
  };

  // Auto-save draft strictly isolated to this university slug whenever builder state changes
  useEffect(() => {
    if (!hasInitializedDraft) return;
    if (builderStep === 'SUCCESS') return;

    if (photos.length === 0 && !instagramHandle && !selectedMajor && !bioText) {
      return;
    }

    try {
      const cover = photos.find(p => p.isCover) || photos[0];
      const draftObj = {
        id: `draft_${university.slug}`,
        universityId: university.id,
        universityName: university.name,
        universitySlug: university.slug,
        universityInstagramHandle: university.instagramHandle,
        photoUrl: cover ? cover.url : '',
        photos: photos.map(p => ({ id: p.id, url: p.url, isCover: p.isCover })),
        photosCount: photos.length,
        builderStep,
        studentEmail: studentEmailInput,
        instagramHandle,
        snapchatHandle,
        tiktokHandle,
        selectedMajor,
        classYear: classYearInput,
        semester: semesterInput,
        bioText,
        updatedAt: new Date().toISOString(),
        detailsSummary: selectedMajor 
          ? `${selectedMajor} • @${instagramHandle.replace(/^@/, '') || 'profile'}` 
          : (instagramHandle ? `@${instagramHandle.replace(/^@/, '')}` : `${photos.length} photo(s) uploaded`)
      };

      localStorage.setItem(`campusconnect_draft_${university.slug}`, JSON.stringify(draftObj));
      localStorage.setItem('campusconnect_active_draft', JSON.stringify(draftObj));
    } catch (err) {
      console.warn('Auto-save draft warning:', err);
    }
  }, [
    hasInitializedDraft,
    photos, 
    studentEmailInput,
    instagramHandle, 
    snapchatHandle, 
    tiktokHandle, 
    selectedMajor, 
    classYearInput, 
    semesterInput, 
    bioText, 
    builderStep, 
    university
  ]);

  // Loading overlay state matching the video
  const [isNavLoading, setIsNavLoading] = useState(false);

  // Check if student has signed in before
  const hasSignedInBefore = useMemo(() => {
    if (isAuthenticated) return true;
    try {
      return localStorage.getItem('campusconnect_auth') === 'true' || !!localStorage.getItem('campusconnect_user');
    } catch {
      return false;
    }
  }, [isAuthenticated]);

  // Check if student has started the procedure of posting photos to this university
  const hasStartedProcedure = useMemo(() => {
    if (photos.length > 0) return true;
    try {
      const uniDraft = localStorage.getItem(`campusconnect_draft_${university.slug}`);
      if (uniDraft) {
        const parsed = JSON.parse(uniDraft);
        if (parsed && ((parsed.photos && parsed.photos.length > 0) || parsed.photosCount > 0 || parsed.builderStep >= 1)) {
          return true;
        }
      }
    } catch {}
    return false;
  }, [photos, university.slug]);

  // Requirement: "this option of my submission is only shown when one had sign in before and start procedure of posting the photo to the university he/she wanted to be featured on..."
  const showMySubmissions = Boolean(hasSignedInBefore && hasStartedProcedure);

  // Discard draft function if the student wants to start fresh
  const discardDraft = () => {
    if (window.confirm('Discard your in-progress submission and start a fresh one?')) {
      setPhotos([]);
      setInstagramHandle('');
      setSnapchatHandle('');
      setTiktokHandle('');
      setSelectedMajor('');
      setBioText('');
      setClassYearInput('2031');
      setSemesterInput('Fall 2026');
      setBuilderStep(1);
      setSavedDraftForCampus(null);
      setShowDraftBanner(false);
      try {
        localStorage.removeItem(`campusconnect_draft_${university.slug}`);
        const activeRaw = localStorage.getItem('campusconnect_active_draft');
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          if (parsed?.universitySlug === university.slug) {
            localStorage.removeItem('campusconnect_active_draft');
          }
        }
      } catch {}
      addToast('Draft Discarded', 'You can now start a fresh submission from step 1.', 'info');
    }
  };

  // Enter builder workflow
  const startBuilder = () => {
    if (!university.communityEnabled) {
      addToast('Campus Inactive', 'This campus network is currently deactivated by administration. Submissions are paused.', 'info');
      return;
    }
    setEntryUniversityContext(university);
    setPageView('BUILDER');
    // If photos already present, allow resuming at their active step
    if (photos.length > 0 && (builderStep === 2 || builderStep === 3)) {
      setBuilderStep(builderStep);
    } else {
      setBuilderStep(1);
    }
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', `/submit/${university.slug}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Exit builder back to landing without discarding draft
  const exitBuilder = () => {
    setPageView('LANDING');
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', `/ig/${university.slug}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (photos.length > 0) {
      addToast('Draft Preserved', 'Your submission progress is saved. You can continue anytime.', 'info');
    }
  };

  // Handle Photo File selection with permanent Base64 Data URL conversion (Supports up to 8 photos)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Convert image file to persistent base64 data URL so it never gets discarded or revoked
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      });

      newItems.push({
        id: 'photo_' + Math.random().toString(36).substring(2, 9),
        url: dataUrl,
        file,
        isCover: photos.length === 0 && newItems.length === 0
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
      const studentEmail = (studentEmailInput || '').trim() || currentUser?.email || `${cleanHandle.toLowerCase()}@student.${university.slug}.edu`;

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
      setSavedDraftForCampus(null);
      setShowDraftBanner(false);
      try {
        localStorage.removeItem(`campusconnect_draft_${university.slug}`);
        localStorage.removeItem('campusconnect_active_draft');
      } catch {}
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

  const scrollToWhatYouShare = () => {
    const el = document.getElementById('what-you-share-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToFaq = () => {
    const el = document.getElementById('faq-section');
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
            {(photos.length > 0 || instagramHandle || bioText || selectedMajor) && builderStep !== 'SUCCESS' && (
              <button
                type="button"
                onClick={discardDraft}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                title="Discard draft and start fresh"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start Clean</span>
              </button>
            )}

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
          
          {/* Optional In-Builder Draft Resume Prompt */}
          {showDraftBanner && savedDraftForCampus && photos.length === 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>
                  Found an unfinished submission draft for <strong>{university.name}</strong> ({savedDraftForCampus.photosCount || savedDraftForCampus.photos?.length || 0} photo{savedDraftForCampus.photos?.length === 1 ? '' : 's'}).
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResumeSavedDraft}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  Resume Draft
                </button>
                <button
                  type="button"
                  onClick={handleStartFreshSubmission}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-semibold transition-colors cursor-pointer"
                >
                  Start Clean
                </button>
                <button
                  type="button"
                  onClick={() => setShowDraftBanner(false)}
                  className="p-1 rounded text-amber-600 hover:text-amber-900 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

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
                    {/* Student Contact Email (for receipts & approval alerts) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        EMAIL ADDRESS FOR RECEIPT &amp; APPROVAL ALERTS <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={studentEmailInput}
                        onChange={(e) => setStudentEmailInput(e.target.value)}
                        placeholder="you@university.edu"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>

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

      {/* Optional Unfinished Draft Resume Banner for Returning Students */}
      {showDraftBanner && savedDraftForCampus && (
        <div className="bg-amber-50 border-b border-amber-200/90 px-4 py-2.5 text-xs text-amber-950 animate-in fade-in">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                You have an unfinished draft for <strong>{university.name}</strong> ({savedDraftForCampus.photosCount || savedDraftForCampus.photos?.length || 0} photo{savedDraftForCampus.photos?.length === 1 ? '' : 's'}).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResumeSavedDraft}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer shadow-2xs text-xs"
              >
                Resume Draft
              </button>
              <button
                type="button"
                onClick={handleStartFreshSubmission}
                className="px-3 py-1 rounded-lg bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-semibold transition-colors cursor-pointer text-xs"
              >
                Start Clean
              </button>
              <button
                type="button"
                onClick={() => setShowDraftBanner(false)}
                className="p-1 rounded text-amber-600 hover:text-amber-900 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 1. TOP NAVBAR / BRAND BAR (CAMPUSCONNECT PLATFORM)                  */}
      {/* ------------------------------------------------------------------- */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between">
          
          {/* Left: CampusConnect brand + Slash + Campus Badge + Instagram Handle */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* CampusConnect Logo */}
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="flex items-center gap-2 cursor-pointer group focus:outline-none"
              title="CampusConnect Public Platform"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Instagram className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                Campus<span style={{ color: university.primaryColor || '#1D64EC' }}>Connect</span>
              </span>
            </button>

            {/* Divider Slash */}
            <span className="text-slate-300 font-light text-base select-none">/</span>

            {/* University Crest & Handle Pill */}
            <a
              href={university.instagramProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-1 pr-2.5 rounded-full hover:bg-slate-50 transition-colors group"
              title={`Visit @${university.instagramHandle.replace(/^@/, '')} on Instagram`}
            >
              <CampusEmblemBadge university={university} size="sm" />
              <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-950 font-mono truncate max-w-[130px] sm:max-w-[200px]">
                {university.instagramHandle}
              </span>
            </a>
          </div>

          {/* Right: Navigation Links & Action Buttons */}
          <div className="flex items-center gap-4 sm:gap-7">
            
            {/* Nav links (Desktop) */}
            <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-600">
              <button 
                type="button"
                onClick={() => {
                  navigateTo('/campuses');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-slate-950 transition-colors cursor-pointer"
              >
                All schools
              </button>
              <button 
                type="button"
                onClick={scrollToHowItWorks}
                className="hover:text-slate-950 transition-colors cursor-pointer"
              >
                How it works
              </button>
              <button 
                type="button"
                onClick={scrollToWhatYouShare}
                className="hover:text-slate-950 transition-colors cursor-pointer"
              >
                What you share
              </button>
              <button 
                type="button"
                onClick={scrollToFaq}
                className="hover:text-slate-950 transition-colors cursor-pointer"
              >
                FAQ
              </button>
            </nav>

            {/* Navbar CTAs: My Submissions Pill & Get Featured */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Show My submissions ONLY when user had signed in before AND started procedure of posting photos to the university */}
              {showMySubmissions ? (
                <button 
                  type="button"
                  onClick={() => {
                    setIsNavLoading(true);
                    setTimeout(() => {
                      setIsNavLoading(false);
                      setEntryUniversityContext(university);
                      navigateTo('/student');
                    }, 300);
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>My submissions</span>
                  {photos.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unfinished draft in progress" />
                  )}
                </button>
              ) : (
                !isAuthenticated ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setEntryUniversityContext(university);
                      if (photos.length > 0) {
                        navigateTo(`/login?uni=${university.slug}&redirect=/student`);
                      } else {
                        navigateTo(`/login?uni=${university.slug}&redirect=/app/dashboard`);
                      }
                    }}
                    className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer px-3 py-1.5 rounded-xl hover:bg-slate-100"
                  >
                    Sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavLoading(true);
                      setTimeout(() => {
                        setIsNavLoading(false);
                        navigateTo('/app/dashboard');
                      }, 250);
                    }}
                    className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer px-3 py-1.5 rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <span>My dashboard</span>
                  </button>
                )
              )}

              {/* "Get featured" / "Continue draft" Rounded Pill Button */}
              <button
                type="button"
                onClick={startBuilder}
                className="px-4 sm:px-6 py-2 rounded-full text-white font-bold text-xs sm:text-sm shadow-md hover:bg-slate-800 active:scale-98 transition-all cursor-pointer bg-[#2E3748]"
                style={{
                  backgroundColor: '#2E3748'
                }}
              >
                <span>{photos.length > 0 ? 'Continue draft' : 'Get featured'}</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* 2. HERO SECTION (CAMPUSCONNECT PLATFORM)                            */}
      {/* ------------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-16 bg-gradient-to-b from-slate-50/70 via-white to-white">
        
        {/* Subtle decorative brand color glow based on Admin's chosen primary color */}
        <div 
          className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-10"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Headlines & University Spotlight Card */}
            <div className="lg:col-span-7 space-y-7">
              
              {/* Big bold headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black tracking-tight text-slate-950 leading-[1.08]">
                You're not just <br />
                joining college. <br />
                <span style={{ color: primaryColor }}>
                  You're joining the
                </span> <br />
                <span style={{ color: primaryColor }}>
                  spotlight.
                </span>
              </h1>

              {/* Pick up where you left off: Preserves unfinished procedure so student continues without starting fresh */}
              {photos.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 border border-amber-200/90 shadow-xs max-w-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-amber-300/80 shadow-2xs shrink-0">
                      <img 
                        src={coverPhoto?.url || photos[0]?.url} 
                        alt="Draft preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider">
                          In progress • Step {builderStep} of 3
                        </span>
                        <span className="text-[11px] text-amber-800 font-semibold">
                          {photos.length} photo{photos.length > 1 ? 's' : ''} saved
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                        Pick up where you left off
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        Your submission for {university.name} was saved. Continue anytime!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNavLoading(true);
                        setTimeout(() => {
                          setIsNavLoading(false);
                          setPageView('BUILDER');
                        }, 200);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#C28B38] hover:bg-[#A97529] active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={discardDraft}
                      className="px-2.5 py-2 text-xs text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                      title="Discard this draft and start a fresh submission"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {/* University Spotlight Card Container (Matching image_fca94304.png exactly) */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm max-w-lg space-y-5">
                
                {/* Top Row: Circular Badge with colored ring + 3 Stats */}
                <div className="flex items-center gap-5 sm:gap-7">
                  <CampusEmblemBadge university={university} size="lg" />

                  {/* 3 Stats: New / $6 / 24-48h */}
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-lg sm:text-xl font-black text-slate-950">New</div>
                      <div className="text-[11px] text-slate-400 font-medium">be the first</div>
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-black text-slate-950">$6</div>
                      <div className="text-[11px] text-slate-400 font-medium">one-time</div>
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-black text-slate-950">24–48h</div>
                      <div className="text-[11px] text-slate-400 font-medium">to go live</div>
                    </div>
                  </div>
                </div>

                {/* Campus Name, Instagram Handle & Tagline */}
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-950">
                    {university.name}
                  </h2>
                  <a 
                    href={university.instagramProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold flex items-center gap-1 hover:underline font-mono"
                    style={{ color: primaryColor }}
                  >
                    <span>{university.instagramHandle}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                  <p className="text-xs text-slate-500 pt-0.5 leading-relaxed">
                    {tagline}
                  </p>
                </div>

                {/* Action Buttons inside Spotlight Card */}
                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={startBuilder}
                    style={{ backgroundColor: '#2C3545' }}
                    className="px-6 py-3 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md hover:bg-slate-900 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>{photos.length > 0 ? `Continue submission (${photos.length}) · $6` : 'Get featured · $6'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={scrollToHowItWorks}
                    className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    How it works
                  </button>
                </div>

              </div>

            </div>

            {/* Right Column: Authentic iPhone Frame Mockup Matching Sample */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-[330px] sm:w-[370px] bg-black rounded-[52px] p-3 shadow-2xl border-[3px] border-slate-900 select-none">
                
                {/* Dynamic Island Notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-end pr-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#18181b] border border-slate-800" />
                </div>

                {/* Phone screen */}
                <div className="w-full bg-white rounded-[42px] overflow-hidden flex flex-col pt-3 pb-3 text-slate-900">
                  
                  {/* Status Bar: 9:41, Signal, Wifi, Battery */}
                  <div className="flex items-center justify-between px-6 pt-1 pb-2 text-xs font-semibold text-slate-950">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <div className="flex items-end gap-0.5 h-2.5">
                        <div className="w-0.5 h-1 bg-current rounded-xs" />
                        <div className="w-0.5 h-1.5 bg-current rounded-xs" />
                        <div className="w-0.5 h-2 bg-current rounded-xs" />
                        <div className="w-0.5 h-2.5 bg-current rounded-xs" />
                      </div>
                      <div className="w-5 h-2.5 rounded-sm border border-current p-0.5 flex items-center">
                        <div className="w-full h-full bg-current rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* Instagram Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <CampusEmblemBadge university={university} size="sm" />
                      <div className="leading-tight text-left">
                        <div className="text-xs font-bold text-slate-950 truncate max-w-[170px]">
                          {university.instagramHandle.replace(/^@/, '')}
                        </div>
                        <div className="text-[10px] text-slate-400">Featured</div>
                      </div>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Post Canvas with university primaryColor */}
                  <div 
                    className="relative aspect-[4/5] overflow-hidden flex flex-col justify-between p-4 text-center text-white"
                    style={{
                      background: `radial-gradient(circle at 50% 35%, ${primaryColor} 0%, #0F172A 100%)`
                    }}
                  >
                    {/* Dot matrix pattern */}
                    <div 
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
                        backgroundSize: '16px 16px'
                      }}
                    />

                    {/* Top text: CAMPUSCONNECT · FEATURED and 1/8 */}
                    <div className="relative z-10 flex items-center justify-between text-[9px] font-extrabold tracking-widest uppercase text-white/80 px-2 pt-1">
                      <span className="mx-auto pl-6">CAMPUSCONNECT · FEATURED</span>
                      <span className="font-mono text-white/70">1/8</span>
                    </div>

                    {/* Center: Silhouette Portrait in glossy circle */}
                    <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-2">
                      <div className="w-36 h-36 rounded-full p-1 bg-white/20 backdrop-blur-xs border-2 border-white/40 shadow-xl flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-gradient-to-b from-blue-300 to-indigo-700 flex items-center justify-center overflow-hidden relative">
                          <div className="w-14 h-14 rounded-full bg-white/90 absolute top-5" />
                          <div className="w-28 h-20 rounded-t-full bg-white/90 absolute bottom-0" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <div className="text-sm font-black uppercase tracking-wider text-white drop-shadow-sm">
                          YOUR NAME
                        </div>
                        <div className="text-[11px] text-blue-200 font-semibold font-mono">
                          @you
                        </div>
                      </div>
                    </div>

                    {/* Bottom strip with campus handle */}
                    <div className="relative z-10 py-1 px-3 rounded-lg bg-black/40 backdrop-blur-xs text-[10px] font-mono text-white/90 truncate">
                      @{university.instagramHandle.replace(/^@/, '')}
                    </div>

                    {/* Floating Pill Left: Live in 24-48h */}
                    <div className="absolute top-1/2 -left-3 -translate-y-6 z-20 bg-white text-slate-900 px-3.5 py-1.5 rounded-full shadow-xl border border-slate-100 flex items-center gap-1.5 text-xs font-bold">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <span className="text-[11px]">Live in 24–48h</span>
                    </div>

                    {/* Floating Pill Right: Tagged @you */}
                    <div className="absolute top-2/3 -right-3 z-20 bg-[#2D3748] text-white px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 text-xs font-bold">
                      <span className="text-slate-300">🏷</span>
                      <span className="text-[11px]">Tagged @you</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-4 py-2 flex items-center justify-between text-slate-900 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                      <MessageCircle className="w-5 h-5" />
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                    </div>
                    <Bookmark className="w-4 h-4 text-slate-800" />
                  </div>

                  {/* Caption info */}
                  <div className="px-4 py-2 text-left space-y-0.5 text-xs">
                    <div className="font-bold text-slate-900 text-[11px]">
                      Liked by your future classmates
                    </div>
                    <div className="text-slate-700 text-[11px] leading-snug">
                      <strong className="text-slate-950">{university.instagramHandle.replace(/^@/, '')}</strong> Meet @you 🎓 Say hi to your newest classmate 👋
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-0.5">
                      JUST NOW
                    </div>
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
      <section id="what-you-share-section" className="max-w-6xl mx-auto px-6 pb-16">
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
      <section id="faq-section" className="max-w-6xl mx-auto px-6 py-14 sm:py-20 border-t border-slate-100">
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
      {/* 8. FEATURED CLASSMATES & STRIPE-PROMOTED SPOTLIGHT DIRECTORY        */}
      {/* ------------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-100">
        
        {/* Section Header with filter buttons */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-2 border border-amber-200/60 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
              <span>Campus Spotlights & Priority Introductions</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Classmates on {university.instagramHandle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Meet future friends and classmates. Submissions promoted via the Stripe checkout receive top-tier prioritized placement and the official 'Featured' spotlight badge.
            </p>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setPostFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                postFilter === 'ALL'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Classmates ({universityFeaturedPosts.length})
            </button>

            {stripePromotedCount > 0 && (
              <button
                type="button"
                onClick={() => setPostFilter('FEATURED_ONLY')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  postFilter === 'FEATURED_ONLY'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                <Sparkles className="w-3 h-3 fill-amber-500 text-amber-600" />
                <span>Featured Spotlights ({stripePromotedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Posts Content */}
        {displayedPosts.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-8 h-8 fill-amber-500 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-950">
                Be the first Featured Spotlight on {university.instagramHandle}!
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Profiles promoted via the Stripe checkout receive the premier <strong>'Featured'</strong> badge and #1 priority feed positioning on the official campus network.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={startBuilder}
                className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-md hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Claim #1 Featured Spotlight · $6</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPosts.map((post, idx) => {
              const promoted = isStripePromoted(post);
              const isFirstPromoted = idx === 0 && promoted;
              const photoSrc = post.watermarkedImagePath || post.originalImagePath || (post.photos && post.photos[0]?.previewUrl) || '';

              // PRIORITIZED LAYOUT STYLE 1: Flagship Priority Bento Card (1st Promoted Post)
              if (isFirstPromoted) {
                return (
                  <div
                    key={post.id}
                    className="col-span-1 md:col-span-2 lg:col-span-2 rounded-3xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/40 via-white to-white shadow-lg ring-4 ring-amber-400/10 overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-xl group"
                  >
                    {/* Media Container with 'Featured' badge */}
                    <div className="md:w-1/2 relative aspect-[4/3] md:aspect-auto overflow-hidden bg-slate-900 shrink-0">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={post.studentDisplayName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span>Featured Portrait</span>
                        </div>
                      )}

                      {/* Primary 'Featured' Visual Badge */}
                      <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-lg border border-amber-200/90 tracking-wider uppercase select-none">
                        <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        <span>Featured</span>
                      </div>

                      {/* Stripe Promotion Tag */}
                      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 shadow-xs select-none">
                        <CreditCard className="w-3 h-3 text-emerald-400" />
                        <span>Stripe Verified</span>
                      </div>

                      {/* Subtle scrim at bottom */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                      <div className="absolute bottom-3 left-3.5 text-white/90 text-[11px] font-mono flex items-center gap-1 z-10">
                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>Priority Spotlight #1</span>
                      </div>
                    </div>

                    {/* Spotlight Details Column */}
                    <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 space-y-4">
                      <div className="space-y-3">
                        {/* Kicker Tag */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
                            <span>Stripe Promoted Feature</span>
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(post.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Student Name & Handle */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                              {post.studentDisplayName}
                            </h4>
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold" title="Verified Campus Student">
                              ✓
                            </span>
                          </div>
                          <div className="text-xs font-bold text-blue-600 font-mono mt-0.5">
                            @{post.personalInstagramHandle?.replace(/^@/, '') || post.studentDisplayName.toLowerCase().replace(/\s+/g, '')}
                          </div>
                        </div>

                        {/* Major and Class */}
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                          <span className="text-slate-900">{post.major || 'Collegiate Scholar'}</span>
                          <span>•</span>
                          <span>Class of {post.classYear || classYear}</span>
                        </div>

                        {/* Bio quote */}
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic bg-slate-50/90 rounded-2xl p-4 border border-slate-100">
                          "{post.caption || 'Excited to be joining campus and connecting with fellow classmates!'}"
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>$6.00 Stripe Verified</span>
                        </div>

                        {post.instagramPostUrl ? (
                          <a
                            href={post.instagramPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Instagram className="w-3.5 h-3.5 text-pink-500" />
                            <span>View on Instagram</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            Queued for @{university.instagramHandle.replace(/^@/, '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // PRIORITIZED LAYOUT STYLE 2: Additional Stripe Promoted Posts
              if (promoted) {
                return (
                  <div
                    key={post.id}
                    className="rounded-3xl border-2 border-amber-300/80 bg-white shadow-md ring-2 ring-amber-400/10 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all group"
                  >
                    {/* Photo with 'Featured' badge */}
                    <div className="aspect-square bg-slate-900 relative overflow-hidden">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={post.studentDisplayName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span>Featured Portrait</span>
                        </div>
                      )}

                      {/* 'Featured' Visual Badge */}
                      <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[11px] shadow-md border border-amber-200 uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 fill-slate-950 text-slate-950" />
                        <span>Featured</span>
                      </div>

                      {/* Stripe Verified Tag */}
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                        <CreditCard className="w-3 h-3 text-emerald-400" />
                        <span>Stripe</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm text-slate-950 flex items-center gap-1.5 truncate">
                            <span>{post.studentDisplayName}</span>
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                              ✓
                            </span>
                          </div>
                          <span className="text-[10px] font-bold font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                            ★ Promoted
                          </span>
                        </div>

                        {post.personalInstagramHandle && (
                          <div className="text-xs font-semibold text-blue-600 font-mono">
                            @{post.personalInstagramHandle.replace(/^@/, '')}
                          </div>
                        )}

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          "{post.caption || 'New student introduction.'}"
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(post.submittedAt).toLocaleDateString()}
                        </span>
                        {post.instagramPostUrl ? (
                          <a
                            href={post.instagramPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <span>Instagram</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Featured</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // STANDARD LAYOUT STYLE: Non-promoted standard posts
              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={post.studentDisplayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Photo
                      </div>
                    )}
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                      Verified
                    </span>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-950">{post.studentDisplayName}</div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                        "{post.caption || 'Campus introduction.'}"
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(post.submittedAt).toLocaleDateString()}
                      </span>
                      {post.instagramPostUrl && (
                        <a
                          href={post.instagramPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>Instagram</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* 9. OTHER CAMPUS WEBSITES IN THE NETWORK */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-950">
              Other Campus Communities
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Explore official class networks across other universities in the system.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigateTo('/campuses');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Browse all {universities.length} schools</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {universities
            .filter(u => u.slug !== university.slug)
            .slice(0, 6)
            .map(otherUni => (
              <button
                key={otherUni.id}
                type="button"
                onClick={() => {
                  setEntryUniversityContext(otherUni);
                  navigateTo(`/ig/${otherUni.slug}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition-all text-left flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-7 h-7 rounded-full p-0.5 shrink-0 flex items-center justify-center shadow-2xs"
                    style={{
                      background: `linear-gradient(135deg, ${otherUni.primaryColor || '#004B87'} 0%, ${otherUni.accentColor || '#0284C7'} 100%)`
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[7px] font-bold text-slate-900 font-mono">
                      '{otherUni.classYear?.slice(-2) || '31'}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 truncate">
                    {otherUni.instagramHandle}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 line-clamp-1">
                  {otherUni.name}
                </div>
              </button>
            ))}
        </div>
      </section>

      {/* Global Image 1 Footer */}
      <Footer />

      {/* Video-Authentic Centered Loading Indicator Card */}
      {isNavLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col items-center justify-center gap-3 min-w-[130px] border border-slate-100">
            <div className="w-9 h-9 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-700">Loading...</span>
          </div>
        </div>
      )}

    </div>
  );
};
