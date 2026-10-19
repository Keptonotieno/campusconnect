import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
import { processSubmissionPayment, FEATURED_POST_PRICE_USD, FEATURED_POST_PRICE_KES } from '../lib/payment';

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

  // Authentication & Profile
  isAuthenticated: boolean;
  currentUser: User | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string, universitySlug?: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  completeOnboarding: (updates: Partial<User>) => void;
  loginAsAdmin: () => void;

  // Featured Submissions
  submissions: FeaturedSubmission[];
  mySubmissions: FeaturedSubmission[];
  getSubmissionById: (id: string) => FeaturedSubmission | undefined;
  createSubmission: (params: {
    universityId: string;
    originalImagePath: string;
    watermarkedImagePath: string;
    caption: string;
    publicationConsent: boolean;
    rightsConfirmed: boolean;
    termsAgreed: boolean;
  }) => Promise<FeaturedSubmission>;
  payForSubmission: (submissionId: string, provider: 'MPESA' | 'CARD', phoneNumber?: string) => Promise<boolean>;
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

// Initial verified sample submissions
const INITIAL_SUBMISSIONS: FeaturedSubmission[] = [
  {
    id: 'sub_jkuat_01',
    studentUid: 'usr_sarah',
    studentDisplayName: 'Sarah Wanjiku',
    studentEmail: 'sarah.wanjiku@students.jkuat.ac.ke',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    universityId: 'uni_jkuat',
    universityName: 'Jomo Kenyatta University of Agriculture and Technology',
    universitySlug: 'jkuat',
    universityInstagramHandle: '@jkuat_campusconnect',
    originalImagePath: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    watermarkedImagePath: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    caption: 'Hey JKUAT! Computer Science Class of 2027 💻✨ Exploring Juja and looking forward to making new friends and tech collaborators!',
    publicationConsent: true,
    rightsConfirmed: true,
    termsAgreed: true,
    paymentStatus: 'PAYMENT_CONFIRMED',
    moderationStatus: 'APPROVED',
    publishingStatus: 'PUBLISHED',
    instagramPostUrl: 'https://www.instagram.com/p/DB12345JKUAT/',
    publishedAt: '2026-10-17T14:30:00Z',
    submittedAt: '2026-10-17T10:15:00Z',
    updatedAt: '2026-10-17T14:30:00Z'
  },
  {
    id: 'sub_uon_01',
    studentUid: 'usr_kevin',
    studentDisplayName: 'Kevin Omondi',
    studentEmail: 'kevin.omondi@students.uonbi.ac.ke',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    universityId: 'uni_uon',
    universityName: 'University of Nairobi',
    universitySlug: 'university-of-nairobi',
    universityInstagramHandle: '@uon_campusconnect',
    originalImagePath: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    watermarkedImagePath: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    caption: 'UoN School of Law ⚖️ Passionate about moot court, chess, and campus debate. Hit me up if you want to connect!',
    publicationConsent: true,
    rightsConfirmed: true,
    termsAgreed: true,
    paymentStatus: 'PAYMENT_CONFIRMED',
    moderationStatus: 'APPROVED',
    publishingStatus: 'PUBLISHED',
    instagramPostUrl: 'https://www.instagram.com/p/DB67890UON/',
    publishedAt: '2026-10-16T18:00:00Z',
    submittedAt: '2026-10-16T11:00:00Z',
    updatedAt: '2026-10-16T18:00:00Z'
  },
  {
    id: 'sub_moi_01',
    studentUid: 'usr_faith',
    studentDisplayName: 'Faith Chebet',
    studentEmail: 'faith.chebet@mu.ac.ke',
    studentAvatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    universityId: 'uni_moi',
    universityName: 'Moi University',
    universitySlug: 'moi-university',
    universityInstagramHandle: '@moi_campusconnect',
    originalImagePath: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    watermarkedImagePath: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    caption: 'Aerospace Engineering major at Moi University Main Campus 🚀 Passionate about robotics and Eldoret campus runs!',
    publicationConsent: true,
    rightsConfirmed: true,
    termsAgreed: true,
    paymentStatus: 'PAYMENT_CONFIRMED',
    moderationStatus: 'UNDER_REVIEW',
    publishingStatus: 'READY_TO_PUBLISH',
    submittedAt: '2026-10-18T02:15:00Z',
    updatedAt: '2026-10-18T03:00:00Z'
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. URL & University Context
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [universities] = useState<University[]>(VERIFIED_UNIVERSITIES);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [entryUniversityContext, setEntryUniversityContext] = useState<University | null>(null);

  // Detect and preserve university context from Instagram link or URL path
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const uniParam = searchParams.get('uni') || searchParams.get('university');
    const isInstagramEntry = searchParams.get('ref') === 'instagram';

    let resolvedUni: University | undefined;

    if (uniParam) {
      resolvedUni = findUniversityBySlug(uniParam);
    } else if (currentRoute.startsWith('/university/')) {
      const slug = currentRoute.replace('/university/', '').split('/')[0].split('?')[0];
      resolvedUni = findUniversityBySlug(slug);
    } else if (currentRoute.startsWith('/u/')) {
      const slug = currentRoute.replace('/u/', '').split('/')[0].split('?')[0];
      resolvedUni = findUniversityBySlug(slug);
    }

    if (resolvedUni) {
      setSelectedUniversity(resolvedUni);
      if (isInstagramEntry || !entryUniversityContext) {
        setEntryUniversityContext(resolvedUni);
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
        const found = findUniversityBySlug(storedSlug);
        if (found) setEntryUniversityContext(found);
      }
    }
  }, [currentRoute, entryUniversityContext]);

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
    return currentUser?.role === 'Admin' || (currentUser?.email ? currentUser.email.startsWith('admin@') : false);
  }, [currentUser]);

  // 3. Submissions State
  const [submissions, setSubmissions] = useState<FeaturedSubmission[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_submissions');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return INITIAL_SUBMISSIONS;
  });

  // Save submissions to local storage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_submissions', JSON.stringify(submissions));
    } catch {
      // ignore
    }
  }, [submissions]);

  // 4. Payments State
  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_payments');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      {
        id: 'pay_init_01',
        submissionId: 'sub_jkuat_01',
        studentUid: 'usr_sarah',
        studentName: 'Sarah Wanjiku',
        universityId: 'uni_jkuat',
        provider: 'MPESA',
        providerTransactionReference: 'QAX84920KL',
        amountUsd: FEATURED_POST_PRICE_USD,
        amountKes: FEATURED_POST_PRICE_KES,
        currency: 'KES',
        phoneNumber: '0712345678',
        status: 'CONFIRMED',
        idempotencyKey: 'idem_init_01',
        verifiedAt: '2026-10-17T10:20:00Z',
        createdAt: '2026-10-17T10:18:00Z',
        updatedAt: '2026-10-17T10:20:00Z'
      }
    ];
  });

  // 5. Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_audit_logs');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      {
        id: 'log_01',
        actorUid: 'usr_admin',
        actorEmail: 'admin@campusconnect.app',
        actorRole: 'Admin',
        action: 'SUBMISSION_PUBLISHED',
        targetType: 'SUBMISSION',
        targetId: 'sub_jkuat_01',
        details: 'Published to @jkuat_campusconnect. URL: https://www.instagram.com/p/DB12345JKUAT/',
        timestamp: '2026-10-17T14:30:00Z'
      }
    ];
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
  const navigateTo = (route: string) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const addToast = (title: string, description?: string, type: ToastMessage['type'] = 'info') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
    
    // Check if logging in as admin
    const isAdminUser = cleanEmail.startsWith('admin@') || cleanEmail.endsWith('@campusconnect.internal');
    
    const displayName = cleanEmail.split('@')[0]
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Campus Student';

    // University association: use entry university, selected university, or default JKUAT
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
      navigateTo(`/university/${associatedUni.slug}`);
    }
    return true;
  };

  const register = async (name: string, email: string, _pass: string, universitySlug?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Resolve target university
    const targetUni = (universitySlug ? findUniversityBySlug(universitySlug) : null) || 
                      entryUniversityContext || 
                      selectedUniversity || 
                      VERIFIED_UNIVERSITIES[0];

    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      role: cleanEmail.startsWith('admin@') ? 'Admin' : 'Student',
      avatarUrl: '',
      universityId: targetUni.id,
      universityName: targetUni.name,
      universitySlug: targetUni.slug,
      studentVerificationStatus: 'UNVERIFIED',
      onboardingStep: 2, // Step 1 completed (account created)
      onboardingCompleted: false,
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

    addToast('Account Created', `Welcome to Campus Connect! Complete your ${targetUni.name} profile.`, 'success');
    navigateTo('/app/onboarding');
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

  const loginAsAdmin = () => {
    const adminUser: User = {
      id: 'usr_admin_01',
      name: 'Campus Connect Administrator',
      email: 'admin@campusconnect.app',
      role: 'Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      universityId: 'all',
      universityName: 'Campus Connect Central',
      studentVerificationStatus: 'VERIFIED',
      onboardingCompleted: true
    };
    setIsAuthenticated(true);
    setCurrentUser(adminUser);
    localStorage.setItem('campusconnect_auth', 'true');
    localStorage.setItem('campusconnect_user', JSON.stringify(adminUser));
    addToast('Admin Mode Active', 'Signed in as Administrator with full review privileges.', 'success');
    navigateTo('/admin');
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
    addToast('Submission Created', 'Now complete the one-time $6 payment to submit for review.', 'info');
    return newSubmission;
  };

  const payForSubmission = async (
    submissionId: string,
    provider: 'MPESA' | 'CARD',
    phoneNumber?: string
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
      const result = await processSubmissionPayment({
        submissionId,
        studentUid: currentUser.id,
        studentName: currentUser.name,
        universityId: sub.universityId,
        provider,
        phoneNumber
      });

      if (result.success) {
        // Record payment
        setPayments((prev) => [result.paymentRecord, ...prev]);

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
          title: 'Payment Confirmed ($6.00 USD)',
          message: `Your one-time fee has been verified via ${provider}. Your submission is now queued for administrator review.`,
          relatedSubmissionId: submissionId,
          read: false,
          createdAt: 'Just now'
        };
        setNotifications((prev) => [newNotif, ...prev]);

        logAudit('PAYMENT_CONFIRMED', 'PAYMENT', result.paymentRecord.id, result.message);
        addToast('Payment Confirmed', result.message, 'success');
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
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const connectAccount = (data: Partial<InstagramAccount>) => {
    const handle = (data.username || 'brand').replace(/^@/, '');
    const title = data.displayName || handle.charAt(0).toUpperCase() + handle.slice(1);
    const newAccount: InstagramAccount = {
      id: 'ig_' + Date.now(),
      businessId: 'biz_01',
      username: handle,
      displayName: title,
      profilePictureUrl: data.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      accountType: data.accountType || 'BUSINESS',
      followersCount: data.followersCount || 12400,
      followingCount: 310,
      mediaCount: data.mediaCount || 248,
      reach28d: data.reach28d || 48200,
      impressions28d: data.impressions28d || 79000,
      interactions28d: data.interactions28d || 9800,
      status: 'CONNECTED',
      connectedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      permissions: ['instagram_basic', 'instagram_manage_comments', 'instagram_manage_messages', 'pages_show_list']
    };
    setAccounts(prev => [newAccount, ...prev.filter(a => a.username !== handle)]);
    setSelectedAccountId(newAccount.id);
    addToast('Instagram Connected', `@${handle} connected to dashboard.`, 'success');
  };

  const disconnectAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
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
    email: currentUser?.email || 'admin@igposthub.com',
    industry: 'Education & Student Life',
    createdAt: new Date().toISOString(),
    onboardingStep: 3,
    onboardingCompleted: true
  };

  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0] || null;

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigateTo,
        universities,
        selectedUniversity,
        setSelectedUniversity,
        entryUniversityContext,
        setEntryUniversityContext,
        getUniversityBySlug: findUniversityBySlug,
        getUniversityById: findUniversityById,

        isAuthenticated,
        currentUser,
        isAdmin,
        login,
        register,
        logout,
        updateUserProfile,
        completeOnboarding,
        loginAsAdmin,

        submissions,
        mySubmissions,
        getSubmissionById,
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

        // Legacy compatibility
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
      }}
    >
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
