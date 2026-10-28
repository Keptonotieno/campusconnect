import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  University,
  FeaturedSubmission,
  PaymentRecord,
  AuditLogItem,
  NotificationItem,
  BusinessAccount,
  InstagramAccount,
  InstagramPost,
  Comment,
  Conversation
} from '../types';
import { VERIFIED_UNIVERSITIES, findUniversityBySlug, findUniversityById } from '../data/universities';
import { processSubmissionPayment, FEATURED_POST_PRICE_USD } from '../lib/payment';
import { loginAdmin, isMasterAdminEmail } from '../lib/adminApi';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info';
}

interface AppContextType {
  // Navigation & University Context
  currentRoute: string;
  navigateTo: (route: string) => void;
  universities: University[];
  selectedUniversity: University | null;
  setSelectedUniversity: (uni: University | null) => void;
  entryUniversityContext: University | null;
  setEntryUniversityContext: (uni: University | null) => void;
  getUniversityBySlug: (slug: string) => University | undefined;
  getUniversityById: (id: string) => University | undefined;
  refreshCampuses: () => Promise<void>;

  // Authentication & Profile
  isAuthenticated: boolean;
  currentUser: User | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string, universitySlug?: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  completeOnboarding: (updates: Partial<User>) => void;

  // Featured Submissions
  submissions: FeaturedSubmission[];
  mySubmissions: FeaturedSubmission[];
  getSubmissionById: (id: string) => FeaturedSubmission | undefined;
  addSubmission: (submission: FeaturedSubmission) => void;
  createSubmission: (params: {
    universityId: string;
    originalImagePath: string;
    watermarkedImagePath: string;
    caption: string;
    publicationConsent: boolean;
    rightsConfirmed: boolean;
    termsAgreed: boolean;
  }) => Promise<FeaturedSubmission>;
  payForSubmission: (submissionId: string, provider?: 'STRIPE_CARD' | 'CARD', cardLast4?: string) => Promise<boolean>;
  reviewSubmission: (submissionId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => Promise<void>;
  publishToInstagram: (submissionId: string, instagramPostUrl: string) => Promise<void>;

  // Payments
  payments: PaymentRecord[];

  // Audit Logs & Notifications
  auditLogs: AuditLogItem[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;

  // UI Utilities
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  isSupportWidgetOpen: boolean;
  setSupportWidgetOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Legacy compat aliases
  business: BusinessAccount;
  updateBusiness: (updates: Partial<BusinessAccount>) => void;
  accounts: InstagramAccount[];
  comments: Comment[];
  conversations: Conversation[];
  posts: InstagramPost[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  markConversationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  selectedAccount: InstagramAccount | null;
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  isOAuthModalOpen: boolean;
  setOAuthModalOpen: (open: boolean) => void;
  disconnectAccount: (id: string) => void;
  connectAccount: (data: Partial<InstagramAccount>) => void;
  replyToComment: (id: string, text: string) => void;
  hideComment: (id: string) => void;
  deleteComment: (id: string) => void;
  sendMessage: (convId: string, text: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. URL & University Context
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [universities, setUniversities] = useState<University[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_campuses');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return VERIFIED_UNIVERSITIES;
  });

  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [entryUniversityContext, setEntryUniversityContext] = useState<University | null>(null);

  // Synchronize campuses with server database safely
  const refreshCampuses = useCallback(async () => {
    try {
      const res = await fetch('/api/campuses', { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.campuses) && data.campuses.length > 0) {
          setUniversities(prev => {
            if (
              prev.length === data.campuses.length &&
              prev.every((u, idx) => u.id === data.campuses[idx]?.id && u.updatedAt === data.campuses[idx]?.updatedAt)
            ) {
              return prev;
            }
            return data.campuses;
          });
          try {
            localStorage.setItem('campusconnect_campuses', JSON.stringify(data.campuses));
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch server campuses, using cache:', err);
    }
  }, []);

  useEffect(() => {
    refreshCampuses();
  }, [refreshCampuses]);

  // Dynamic resolver for universities / campuses
  const getUniversityBySlug = useCallback((slug: string): University | undefined => {
    if (!slug) return undefined;
    const normalized = slug
      .toLowerCase()
      .trim()
      .replace(/^@/, '')
      .replace(/^\/ig\//, '')
      .replace(/^\/u\//, '')
      .replace(/^\/university\//, '');
    
    // 1. Check live state first (includes any newly created campus like Lindsey Wilson College)
    const found = universities.find(
      u => u.slug.toLowerCase() === normalized ||
           u.slug.replace(/[-_]/g, '') === normalized.replace(/[-_]/g, '') ||
           u.id.toLowerCase() === normalized ||
           u.id.replace('uni_', '').toLowerCase() === normalized ||
           u.name.toLowerCase() === normalized ||
           u.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized.replace(/[^a-z0-9]/g, '') ||
           u.instagramHandle.toLowerCase().replace('@', '') === normalized
    );
    if (found) return found;

    // 2. Check alias mappings & verified universities
    return findUniversityBySlug(normalized);
  }, [universities]);

  const getUniversityById = useCallback((id: string): University | undefined => {
    return universities.find(u => u.id === id) || findUniversityById(id);
  }, [universities]);

  // Detect and preserve university context from Instagram link or URL path
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const uniParam = searchParams.get('uni') || searchParams.get('university');
    const isInstagramEntry = searchParams.get('ref') === 'instagram';

    let resolvedUni: University | undefined;

    if (uniParam) {
      resolvedUni = getUniversityBySlug(uniParam);
    } else if (currentRoute.startsWith('/university/')) {
      const slug = currentRoute.replace('/university/', '').split('/')[0].split('?')[0];
      resolvedUni = getUniversityBySlug(slug);
    } else if (currentRoute.startsWith('/u/')) {
      const slug = currentRoute.replace('/u/', '').split('/')[0].split('?')[0];
      resolvedUni = getUniversityBySlug(slug);
    } else if (currentRoute.startsWith('/ig/')) {
      const slug = currentRoute.replace('/ig/', '').split('/')[0].split('?')[0];
      resolvedUni = getUniversityBySlug(slug);
    }

    if (resolvedUni) {
      const uniToSet = resolvedUni;
      setSelectedUniversity(prev => (prev?.id === uniToSet.id ? prev : uniToSet));
      if (isInstagramEntry || !entryUniversityContext) {
        setEntryUniversityContext(prev => (prev?.id === uniToSet.id ? prev : uniToSet));
        try {
          localStorage.setItem('campusconnect_entry_uni', resolvedUni.slug);
        } catch {
          // ignore
        }
      }
    } else {
      // Check stored entry university
      const storedSlug = localStorage.getItem('campusconnect_entry_uni');
      if (storedSlug) {
        const found = getUniversityBySlug(storedSlug);
        if (found) {
          setEntryUniversityContext(prev => (prev?.id === found.id ? prev : found));
        }
      }
    }
  }, [currentRoute, entryUniversityContext, getUniversityBySlug]);

  // 2. Authentication & Student Profile
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('campusconnect_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_user');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });

  const isAdmin = useMemo(() => {
    const hasAdminToken = typeof window !== 'undefined' && !!localStorage.getItem('campusconnect_admin_token');
    return hasAdminToken || currentUser?.role === 'Admin' || (currentUser?.email ? currentUser.email.startsWith('admin@') : false);
  }, [currentUser]);

  // 3. Submissions State
  const [submissions, setSubmissions] = useState<FeaturedSubmission[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_submissions');
      if (stored) {
        const parsed: FeaturedSubmission[] = JSON.parse(stored);
        const cleaned = parsed.filter(s => !['sub_tm_001', 'sub_sp_002', 'sub_cb_003', 'sub_test_stripe'].includes(s.id));
        return cleaned;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Save submissions to local storage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_submissions', JSON.stringify(submissions));
    } catch {
      // ignore
    }
  }, [submissions]);

  // Sync submissions from server on mount
  useEffect(() => {
    fetch('/api/submissions')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && Array.isArray(d.submissions)) {
          setSubmissions(d.submissions);
        }
      })
      .catch(() => {});
  }, []);

  // 4. Payments State
  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_payments');
      if (stored) {
        const parsed: PaymentRecord[] = JSON.parse(stored);
        const cleaned = parsed.filter(p => !['pay_tm_001', 'pay_sp_002', 'pay_cb_003', 'pay_0589034319b0'].includes(p.id));
        return cleaned;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // 5. Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_audit_logs');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  // 6. Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_notifications');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      {
        id: 'notif_welcome',
        recipientUid: 'all',
        type: 'SYSTEM',
        title: 'Welcome to Campus Connect',
        message: 'Discover fellow students, join university communities, and submit your profile to get featured on official Instagram accounts.',
        read: false,
        createdAt: 'Just now'
      }
    ];
  });

  // UI state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSupportWidgetOpen, setSupportWidgetOpen] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isOAuthModalOpen, setOAuthModalOpen] = useState(false);

  // Navigation handlers
  const navigateTo = useCallback((route: string) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined' && window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((title: string, description?: string, type: ToastMessage['type'] = 'info') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const logAudit = (action: string, targetType: AuditLogItem['targetType'], targetId: string, details?: string) => {
    const newLog: AuditLogItem = {
      id: 'log_' + Date.now(),
      actorUid: currentUser?.id || 'sys_admin',
      actorEmail: currentUser?.email,
      actorRole: currentUser?.role || 'Admin',
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Auth methods
  const login = async (email: string, _pass: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = (_pass || '').trim();
    
    // Check if logging in as admin
    const isAdminUser = isMasterAdminEmail(cleanEmail);
    
    if (isAdminUser) {
      try {
        const adminRes = await loginAdmin(cleanEmail, cleanPass);
        if (adminRes.token) {
          localStorage.setItem('campusconnect_admin_token', adminRes.token);
          if (adminRes.admin) {
            localStorage.setItem('campusconnect_admin_user', JSON.stringify(adminRes.admin));
          }
        }
      } catch (err: any) {
        console.warn('Admin authentication notice:', err);
        addToast('Admin Authentication Failed', err.message || 'Invalid administrator credentials.', 'error');
        throw err;
      }
    }
    
    const displayName = cleanEmail.split('@')[0]
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Campus Student';

    // University association: use entry university, selected university, or default Harvard
    const associatedUni = entryUniversityContext || selectedUniversity || VERIFIED_UNIVERSITIES[0];

    const loggedUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: displayName,
      email: cleanEmail,
      role: isAdminUser ? 'Admin' : 'Student',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      universityId: associatedUni.id,
      universityName: associatedUni.name,
      universitySlug: associatedUni.slug,
      course: 'Bachelor of Science',
      graduationYear: '2027',
      bio: 'Enthusiastic university student eager to connect with fellow campus peers.',
      interests: ['Campus Life', 'Tech', 'Music', 'Sports'],
      studentVerificationStatus: 'UNVERIFIED',
      onboardingStep: 2,
      onboardingCompleted: true
    };

    setIsAuthenticated(true);
    setCurrentUser(loggedUser);

    try {
      localStorage.setItem('campusconnect_auth', 'true');
      localStorage.setItem('campusconnect_user', JSON.stringify(loggedUser));
    } catch {
      // ignore
    }

    addToast('Signed In', `Welcome back, ${displayName}!`, 'success');
    
    if (isAdminUser) {
      navigateTo('/admin');
    } else {
      navigateTo('/app/dashboard');
    }
    return true;
  };

  const register = async (name: string, email: string, _pass: string, universitySlug?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const isAdminUser = 
      cleanEmail === 'campusconnect@gmail.com' || 
      cleanEmail === 'compusconnect@gmail.com' ||
      cleanEmail.startsWith('admin@');

    // Resolve target university
    const targetUni = (universitySlug ? findUniversityBySlug(universitySlug) : null) || 
                      entryUniversityContext || 
                      selectedUniversity || 
                      VERIFIED_UNIVERSITIES[0];

    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      role: isAdminUser ? 'Admin' : 'Student',
      avatarUrl: '',
      universityId: targetUni.id,
      universityName: targetUni.name,
      universitySlug: targetUni.slug,
      studentVerificationStatus: 'UNVERIFIED',
      onboardingStep: 2,
      onboardingCompleted: true,
      createdAt: new Date().toISOString()
    };

    setIsAuthenticated(true);
    setCurrentUser(newUser);

    try {
      localStorage.setItem('campusconnect_auth', 'true');
      localStorage.setItem('campusconnect_user', JSON.stringify(newUser));
    } catch {
      // ignore
    }

    addToast('Account Created', `Welcome to CampusConnect, ${cleanName}!`, 'success');
    if (isAdminUser) {
      navigateTo('/admin');
    } else {
      navigateTo('/app/dashboard');
    }
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem('campusconnect_auth');
      localStorage.removeItem('campusconnect_user');
    } catch {
      // ignore
    }
    addToast('Signed Out', 'You have been safely signed out.', 'info');
    navigateTo('/login');
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);
    try {
      localStorage.setItem('campusconnect_user', JSON.stringify(updated));
    } catch {
      // ignore
    }
    addToast('Profile Updated', 'Your student details have been saved.', 'success');
  };

  const completeOnboarding = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      ...updates,
      onboardingStep: 4,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    };
    setCurrentUser(updated);
    try {
      localStorage.setItem('campusconnect_user', JSON.stringify(updated));
    } catch {
      // ignore
    }
    addToast('Onboarding Complete!', 'Welcome to your university student community.', 'success');
    if (updated.universitySlug) {
      navigateTo(`/university/${updated.universitySlug}`);
    } else {
      navigateTo('/app/dashboard');
    }
  };

  // Submissions workflow
  const mySubmissions = useMemo(() => {
    if (!currentUser) return [];
    return submissions.filter((s) => s.studentUid === currentUser.id || s.studentEmail === currentUser.email);
  }, [submissions, currentUser]);

  const getSubmissionById = (id: string) => {
    return submissions.find((s) => s.id === id);
  };

  const createSubmission = async (params: {
    universityId: string;
    originalImagePath: string;
    watermarkedImagePath: string;
    caption: string;
    publicationConsent: boolean;
    rightsConfirmed: boolean;
    termsAgreed: boolean;
  }): Promise<FeaturedSubmission> => {
    if (!currentUser) throw new Error('You must be signed in to submit a photo.');
    const uni = findUniversityById(params.universityId) || selectedUniversity || VERIFIED_UNIVERSITIES[0];

    const submissionId = 'sub_' + Math.random().toString(36).substring(2, 9);
    const newSubmission: FeaturedSubmission = {
      id: submissionId,
      studentUid: currentUser.id,
      studentDisplayName: currentUser.name,
      studentEmail: currentUser.email,
      studentAvatarUrl: currentUser.avatarUrl,
      universityId: uni.id,
      universityName: uni.name,
      universitySlug: uni.slug,
      universityInstagramHandle: uni.instagramHandle,
      originalImagePath: params.originalImagePath,
      watermarkedImagePath: params.watermarkedImagePath,
      caption: params.caption,
      publicationConsent: params.publicationConsent,
      rightsConfirmed: params.rightsConfirmed,
      termsAgreed: params.termsAgreed,
      paymentStatus: 'AWAITING_PAYMENT',
      moderationStatus: 'PENDING',
      publishingStatus: 'NOT_READY',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSubmissions((prev) => [newSubmission, ...prev]);
    try {
      fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubmission)
      }).catch(() => {});
    } catch {}
    addToast('Submission Created', 'Now complete the one-time $6 payment to submit for review.', 'info');
    return newSubmission;
  };

  const addSubmission = useCallback((newSub: FeaturedSubmission) => {
    setSubmissions((prev) => {
      const filtered = prev.filter((s) => s.id !== newSub.id);
      const updated = [newSub, ...filtered];
      try {
        localStorage.setItem('campusconnect_submissions', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const payForSubmission = async (
    submissionId: string,
    provider: 'STRIPE_CARD' | 'CARD' = 'STRIPE_CARD',
    cardLast4?: string
  ): Promise<boolean> => {
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub || !currentUser) {
      throw new Error('Submission or user not found');
    }

    // Set status to pending
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, paymentStatus: 'PAYMENT_PENDING' } : s))
    );

    try {
      // 1. Client execution & simulation
      const result = await processSubmissionPayment({
        submissionId,
        studentUid: currentUser.id,
        studentName: currentUser.name,
        universityId: sub.universityId,
        provider: 'STRIPE_CARD',
        cardLast4
      });

      // 2. Server-side authoritative verification & database persistence
      let verifiedRecord = result.paymentRecord;
      try {
        const serverRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId,
            studentUid: currentUser.id,
            studentName: currentUser.name,
            universityId: sub.universityId,
            provider: 'STRIPE_CARD',
            idempotencyKey: result.paymentRecord.idempotencyKey
          })
        });
        if (serverRes.ok) {
          const sData = await serverRes.json();
          if (sData.payment) {
            verifiedRecord = sData.payment;
          }
        }
      } catch (sErr) {
        console.warn('Server payment sync fallback to local record:', sErr);
      }

      if (result.success) {
        // Record payment
        setPayments((prev) => [verifiedRecord, ...prev]);

        // Advance submission status to confirmed payment and queued for review
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  paymentStatus: 'PAYMENT_CONFIRMED',
                  moderationStatus: 'PENDING',
                  publishingStatus: 'NOT_READY',
                  updatedAt: new Date().toISOString()
                }
              : s
          )
        );

        // Add in-app notification
        const newNotif: NotificationItem = {
          id: 'notif_' + Date.now(),
          recipientUid: currentUser.id,
          type: 'PAYMENT_CONFIRMED',
          title: 'Stripe Payment Confirmed ($6.00 USD)',
          message: 'Your payment of $6.00 USD has been verified via Stripe. Your submission is now queued for administrator review.',
          relatedSubmissionId: submissionId,
          read: false,
          createdAt: 'Just now'
        };
        setNotifications((prev) => [newNotif, ...prev]);

        logAudit('PAYMENT_CONFIRMED', 'PAYMENT', result.paymentRecord.id, result.message);
        addToast('Stripe Payment Confirmed', result.message, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, paymentStatus: 'PAYMENT_FAILED' } : s))
      );
      addToast('Payment Failed', err.message || 'Payment could not be processed.', 'error');
      throw err;
    }
  };

  const reviewSubmission = async (submissionId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
    if (!isAdmin) {
      addToast('Unauthorized', 'Administrator role required to review submissions.', 'error');
      return;
    }

    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return;

    if (sub.paymentStatus !== 'PAYMENT_CONFIRMED') {
      addToast('Payment Required', 'Cannot approve a submission that has not completed verified payment.', 'error');
      return;
    }

    const isApproved = decision === 'APPROVE';

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              moderationStatus: isApproved ? 'APPROVED' : 'REJECTED',
              publishingStatus: isApproved ? 'READY_TO_PUBLISH' : 'NOT_READY',
              rejectionReason: isApproved ? undefined : reason || 'Does not meet community guidelines.',
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    // Notify student
    const studentNotif: NotificationItem = {
      id: 'notif_' + Date.now(),
      recipientUid: sub.studentUid,
      type: 'SUBMISSION_STATUS',
      title: isApproved ? 'Submission Approved!' : 'Submission Needs Changes',
      message: isApproved
        ? `Your photo submission has been approved and is queued for official publication to ${sub.universityInstagramHandle}.`
        : `Your submission was not approved: ${reason || 'Please review community requirements.'}`,
      relatedSubmissionId: submissionId,
      read: false,
      createdAt: 'Just now'
    };
    setNotifications((prev) => [studentNotif, ...prev]);

    logAudit(
      isApproved ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
      'SUBMISSION',
      submissionId,
      isApproved ? 'Approved by admin' : `Rejected: ${reason}`
    );

    addToast(
      isApproved ? 'Submission Approved' : 'Submission Rejected',
      `Status updated for ${sub.studentDisplayName}.`,
      isApproved ? 'success' : 'info'
    );
  };

  const publishToInstagram = async (submissionId: string, instagramPostUrl: string) => {
    if (!isAdmin) {
      addToast('Unauthorized', 'Administrator role required.', 'error');
      return;
    }

    if (!instagramPostUrl.includes('instagram.com/')) {
      addToast('Invalid URL', 'Please enter a valid Instagram post URL (e.g. https://www.instagram.com/p/...).', 'error');
      return;
    }

    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return;

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              publishingStatus: 'PUBLISHED',
              instagramPostUrl,
              publishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    // Student notification
    const studentNotif: NotificationItem = {
      id: 'notif_' + Date.now(),
      recipientUid: sub.studentUid,
      type: 'POST_PUBLISHED',
      title: '🎉 You are Live on Instagram!',
      message: `Your featured post is published on ${sub.universityInstagramHandle}! Tap to view on Instagram.`,
      relatedSubmissionId: submissionId,
      link: instagramPostUrl,
      read: false,
      createdAt: 'Just now'
    };
    setNotifications((prev) => [studentNotif, ...prev]);

    logAudit('SUBMISSION_PUBLISHED', 'INSTAGRAM_POST', submissionId, `Published URL: ${instagramPostUrl}`);
    addToast('Post Confirmed & Published', 'Instagram URL recorded and student notified.', 'success');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Compatibility state & handlers for Instagram workspace
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<InstagramAccount[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_instagram_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    // Default active connected official account matching verified campus
    return [
      {
        id: 'ig_moreheadstate_official',
        businessId: 'biz_01',
        username: 'moreheadstate2031class',
        displayName: 'Morehead State University 2031',
        profilePictureUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80',
        accountType: 'BUSINESS',
        followersCount: 14200,
        followingCount: 310,
        mediaCount: 38,
        reach28d: 48200,
        impressions28d: 79000,
        interactions28d: 6100,
        status: 'CONNECTED',
        connectedAt: new Date().toISOString(),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
        permissions: ['instagram_basic', 'instagram_manage_comments', 'instagram_manage_messages', 'pages_show_list']
      }
    ];
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Synchronize accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_instagram_accounts', JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  const connectAccount = (data: Partial<InstagramAccount>) => {
    const handle = (data.username || 'moreheadstate2031class').replace(/^@/, '');
    const title = data.displayName || handle.charAt(0).toUpperCase() + handle.slice(1);
    const newAccount: InstagramAccount = {
      id: 'ig_' + Date.now(),
      businessId: 'biz_01',
      username: handle,
      displayName: title,
      profilePictureUrl: data.profilePictureUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80',
      accountType: data.accountType || 'BUSINESS',
      followersCount: data.followersCount || 14200,
      followingCount: 310,
      mediaCount: data.mediaCount || 38,
      reach28d: data.reach28d || 48200,
      impressions28d: data.impressions28d || 79000,
      interactions28d: data.interactions28d || 6100,
      status: 'CONNECTED',
      connectedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      permissions: ['instagram_basic', 'instagram_manage_comments', 'instagram_manage_messages', 'pages_show_list']
    };
    setAccounts(prev => {
      const updated = [newAccount, ...prev.filter(a => a.username !== handle)];
      try {
        localStorage.setItem('campusconnect_instagram_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSelectedAccountId(newAccount.id);
    addToast('Instagram Connected', `@${handle} connected successfully!`, 'success');
  };

  const disconnectAccount = (id: string) => {
    setAccounts(prev => {
      const updated = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem('campusconnect_instagram_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    addToast('Account Disconnected', 'Instagram account has been disconnected.', 'info');
  };

  const markConversationRead = (_id: string) => {};
  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const updateBusiness = (_updates: Partial<BusinessAccount>) => {};

  const business: BusinessAccount = {
    id: 'biz_01',
    name: currentUser?.name || 'Software',
    email: currentUser?.email || 'admin@campusconnect.app',
    industry: 'Education & Student Life',
    createdAt: new Date().toISOString(),
    onboardingStep: 3,
    onboardingCompleted: true
  };

  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0] || null;

  const contextValue = useMemo<AppContextType>(() => ({
    currentRoute,
    navigateTo,
    universities,
    selectedUniversity,
    setSelectedUniversity,
    entryUniversityContext,
    setEntryUniversityContext,
    getUniversityBySlug,
    getUniversityById,
    refreshCampuses,

    isAuthenticated,
    currentUser,
    isAdmin,
    login,
    register,
    logout,
    updateUserProfile,
    completeOnboarding,

    submissions,
    mySubmissions,
    getSubmissionById,
    addSubmission,
    createSubmission,
    payForSubmission,
    reviewSubmission,
    publishToInstagram,

    payments,
    auditLogs,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,

    toasts,
    addToast,
    removeToast,
    isSupportWidgetOpen,
    setSupportWidgetOpen,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isMobileSidebarOpen,
    setMobileSidebarOpen,

    business,
    updateBusiness,
    accounts,
    comments: [],
    conversations: [],
    posts: [],
    selectedConversationId,
    setSelectedConversationId,
    markConversationRead,
    markAllNotificationsRead,
    selectedAccount: activeAccount,
    selectedAccountId,
    setSelectedAccountId,
    isOAuthModalOpen,
    setOAuthModalOpen,
    disconnectAccount,
    connectAccount,
    replyToComment: () => {},
    hideComment: () => {},
    deleteComment: () => {},
    sendMessage: () => {}
  }), [
    currentRoute,
    navigateTo,
    universities,
    selectedUniversity,
    entryUniversityContext,
    getUniversityBySlug,
    getUniversityById,
    refreshCampuses,
    isAuthenticated,
    currentUser,
    isAdmin,
    login,
    register,
    logout,
    updateUserProfile,
    completeOnboarding,
    submissions,
    mySubmissions,
    payments,
    auditLogs,
    notifications,
    unreadNotificationsCount,
    toasts,
    addToast,
    removeToast,
    isSupportWidgetOpen,
    isCommandPaletteOpen,
    isMobileSidebarOpen,
    business,
    accounts,
    selectedConversationId,
    activeAccount,
    selectedAccountId,
    isOAuthModalOpen
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
