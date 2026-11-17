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
import { processSubmissionPayment } from '../lib/payment';
import { loginAdmin, isMasterAdminEmail } from '../lib/adminApi';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  fetchCampusBySlug: (slug: string) => Promise<University | undefined>;
  refreshCampuses: () => Promise<void>;
  addOrUpdateCampus: (campus: University) => void;
  removeCampus: (idOrSlug: string) => void;

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
  reviewSubmission: (submissionId: string, decision: 'APPROVE' | 'REJECT', reason?: string, options?: { silent?: boolean }) => Promise<void>;
  publishToInstagram: (submissionId: string, instagramPostUrl: string, options?: { silent?: boolean }) => Promise<void>;

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
  toggleImportantConversation: (id: string) => void;
  archiveConversation: (id: string) => void;
  markAllNotificationsRead: () => void;
  selectedAccount: InstagramAccount | null;
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  isOAuthModalOpen: boolean;
  setOAuthModalOpen: (open: boolean) => void;
  disconnectAccount: (id: string) => void;
  connectAccount: (data: Partial<InstagramAccount>) => void;
  refreshAccount: (id: string) => void;
  replyToComment: (id: string, text: string) => void;
  hideComment: (id: string) => void;
  deleteComment: (id: string) => void;
  sendMessage: (convId: string, text: string) => void;
  clearCampusDraft: (slug: string) => void;
  clearAllStudentDrafts: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. URL & University Context
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const normalizeCampus = useCallback((u: any): University | null => {
    if (!u || typeof u !== 'object') return null;
    const rawSlug = typeof u.slug === 'string' ? u.slug.trim() : '';
    const rawId = typeof u.id === 'string' ? u.id.trim() : '';
    if (!rawSlug && !rawId) return null;
    const slug = rawSlug || rawId.replace(/^uni_/, '');
    const id = rawId || `uni_${slug.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
    const name = (typeof u.name === 'string' && u.name.trim()) ? u.name.trim() : slug;
    const primaryColor = (typeof u.primaryColor === 'string' && u.primaryColor.trim()) ? u.primaryColor.trim() : '#004B87';
    const accentColor = (typeof u.accentColor === 'string' && u.accentColor.trim()) ? u.accentColor.trim() : '#0284C7';
    return {
      ...u,
      id,
      slug,
      name,
      logoUrl: u.logoUrl || '',
      description: u.description || '',
      location: u.location || '',
      officialWebsiteUrl: u.officialWebsiteUrl || '',
      instagramProfileUrl: u.instagramProfileUrl || '',
      instagramHandle: u.instagramHandle || `@${slug.replace(/[^a-z0-9_]/gi, '_')}`,
      communityEnabled: u.communityEnabled !== false,
      primaryColor,
      accentColor,
      secondaryColor: u.secondaryColor || accentColor,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt || new Date().toISOString()
    };
  }, []);

  const [universities, setUniversities] = useState<University[]>(() => {
    const map = new Map<string, University>();
    // Always start with VERIFIED_UNIVERSITIES as ground truth base
    VERIFIED_UNIVERSITIES.forEach(u => {
      if (u && (u.slug || u.id)) {
        map.set((u.slug || u.id).toLowerCase(), u);
      }
    });
    try {
      const stored = localStorage.getItem('campusconnect_campuses');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: any) => {
            if (u && (u.slug || u.id)) {
              const key = String(u.slug || u.id).toLowerCase();
              const merged = { ...(map.get(key) || {}), ...u };
              if (merged.slug || merged.id) {
                map.set(key, {
                  ...merged,
                  id: merged.id || key,
                  slug: merged.slug || key,
                  name: merged.name || merged.slug || key,
                  primaryColor: merged.primaryColor || '#004B87',
                  accentColor: merged.accentColor || '#0284C7',
                  communityEnabled: merged.communityEnabled !== false
                });
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }
    const initialList = Array.from(map.values());
    try {
      localStorage.setItem('campusconnect_campuses', JSON.stringify(initialList));
    } catch {}
    return initialList;
  });

  const [_selectedUniversity, _setSelectedUniversity] = useState<University | null>(null);
  const [_entryUniversityContext, _setEntryUniversityContext] = useState<University | null>(null);

  const setSelectedUniversity = useCallback((uni: University | null) => {
    const clean = uni ? normalizeCampus(uni) : null;
    _setSelectedUniversity(clean);
    try {
      if (clean?.slug) {
        localStorage.setItem('campusconnect_selected_uni', clean.slug);
      } else {
        localStorage.removeItem('campusconnect_selected_uni');
      }
    } catch {}
  }, [normalizeCampus]);

  const setEntryUniversityContext = useCallback((uni: University | null) => {
    const clean = uni ? normalizeCampus(uni) : null;
    _setEntryUniversityContext(clean);
    try {
      if (clean?.slug) {
        localStorage.setItem('campusconnect_entry_uni', clean.slug);
      } else {
        localStorage.removeItem('campusconnect_entry_uni');
      }
    } catch {}
  }, [normalizeCampus]);

  const selectedUniversity = _selectedUniversity;
  const entryUniversityContext = _entryUniversityContext;

  // Helper to merge campuses preserving core verified universities
  const mergeCampuses = useCallback((base: University[], incoming: University[]): University[] => {
    const map = new Map<string, University>();
    // 1. Core ground truth verified universities
    VERIFIED_UNIVERSITIES.forEach(u => {
      if (u && (u.slug || u.id)) {
        map.set((u.slug || u.id).toLowerCase(), u);
      }
    });
    // 2. Previous state
    (base || []).forEach(u => {
      const normalized = normalizeCampus(u);
      if (!normalized) return;
      const key = (normalized.slug || normalized.id).toLowerCase();
      map.set(key, { ...(map.get(key) || {}), ...normalized });
    });
    // 3. Incoming
    (incoming || []).forEach(u => {
      const normalized = normalizeCampus(u);
      if (!normalized) return;
      const key = (normalized.slug || normalized.id).toLowerCase();
      map.set(key, { ...(map.get(key) || {}), ...normalized });
    });
    return Array.from(map.values());
  }, [normalizeCampus]);

  // Synchronize campuses with server database safely
  const refreshCampuses = useCallback(async () => {
    try {
      const res = await fetch('/api/campuses', { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.campuses) && data.campuses.length > 0) {
          const merged = mergeCampuses([], data.campuses);
          setUniversities(merged);
          try {
            localStorage.setItem('campusconnect_campuses', JSON.stringify(merged));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Could not fetch server campuses, using cache:', err);
    }
  }, [mergeCampuses]);

  useEffect(() => {
    refreshCampuses();

    // Synchronize dynamic campuses with Firestore
    const unsub = onSnapshot(
      collection(db, 'universities'),
      (snap) => {
        const firestoreList: University[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as University | undefined;
          if (!data) return;
          const normalized = normalizeCampus({
            ...data,
            id: docSnap.id,
            slug: data.slug || docSnap.id
          });
          if (normalized) {
            firestoreList.push(normalized);
          }
        });
        if (firestoreList.length > 0) {
          setUniversities(prev => {
            const merged = mergeCampuses(prev, firestoreList);
            try {
              localStorage.setItem('campusconnect_campuses', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      },
      (err) => {
        if (err?.code !== 'unavailable' && err?.code !== 'failed-precondition') {
          console.warn('AppContext Firestore sync notice:', err);
        }
      }
    );

    return () => unsub();
  }, [refreshCampuses, mergeCampuses, normalizeCampus]);

  // Synchronous upsert for campuses (used by Admin creation & updates)
  const addOrUpdateCampus = useCallback((campus: University) => {
    const clean = normalizeCampus(campus);
    if (!clean) return;
    setUniversities(prev => {
      const idx = prev.findIndex(u => u && (u.id === clean.id || u.slug === clean.slug));
      let next: University[];
      if (idx !== -1) {
        next = [...prev];
        next[idx] = { ...next[idx], ...clean };
      } else {
        next = [clean, ...prev];
      }
      try {
        localStorage.setItem('campusconnect_campuses', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [normalizeCampus]);

  // Remove campus (used when deleted by Admin)
  const removeCampus = useCallback((idOrSlug: string) => {
    if (!idOrSlug) return;
    setUniversities(prev => {
      const next = prev.filter(u => u && u.id !== idOrSlug && u.slug !== idOrSlug);
      try {
        localStorage.setItem('campusconnect_campuses', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    _setSelectedUniversity(prev => {
      if (prev?.id === idOrSlug || prev?.slug === idOrSlug) {
        try { localStorage.removeItem('campusconnect_selected_uni'); } catch {}
        return null;
      }
      return prev;
    });
    _setEntryUniversityContext(prev => {
      if (prev?.id === idOrSlug || prev?.slug === idOrSlug) {
        try { localStorage.removeItem('campusconnect_entry_uni'); } catch {}
        return null;
      }
      return prev;
    });
  }, []);

  // Dynamic resolver for universities / campuses
  const getUniversityBySlug = useCallback((slug: string): University | undefined => {
    if (!slug || typeof slug !== 'string') return undefined;
    const normalized = slug
      .toLowerCase()
      .trim()
      .replace(/^@/, '')
      .replace(/^\/ig\//, '')
      .replace(/^\/u\//, '')
      .replace(/^\/university\//, '')
      .replace(/^\/submit\//, '')
      .split('/')[0]
      .split('?')[0];

    if (!normalized) return undefined;
    const noSpecial = normalized.replace(/[^a-z0-9]/g, '');

    // 1. Check live state first (includes any newly created campus)
    const found = universities.find(u => {
      if (!u) return false;
      const uSlug = (u.slug || '').toLowerCase();
      const uId = (u.id || '').toLowerCase();
      const uName = (u.name || '').toLowerCase();
      const uHandle = (u.instagramHandle || '').toLowerCase();
      return (
        uSlug === normalized ||
        (noSpecial && uSlug.replace(/[^a-z0-9]/g, '') === noSpecial) ||
        uId === normalized ||
        uId.replace('uni_', '') === normalized ||
        (noSpecial && uId.replace('uni_', '').replace(/[^a-z0-9]/g, '') === noSpecial) ||
        uName === normalized ||
        (noSpecial && uName.replace(/[^a-z0-9]/g, '') === noSpecial) ||
        uHandle.replace('@', '') === normalized ||
        (noSpecial && uHandle.replace(/[^a-z0-9]/g, '') === noSpecial)
      );
    });
    if (found) return found;

    // 2. Keyword matching on live state (e.g., "Michigan University" matches "University of Michigan")
    const keywords = normalized.split(/[\s-_]+/).filter(w => w.length > 2 && w !== 'university' && w !== 'college' && w !== 'class' && w !== 'the');
    if (keywords.length > 0) {
      const keywordMatch = universities.find(u => {
        if (!u) return false;
        const uText = `${u.name || ''} ${u.slug || ''} ${u.instagramHandle || ''}`.toLowerCase();
        return keywords.every(kw => uText.includes(kw));
      });
      if (keywordMatch) return keywordMatch;
    }

    // 3. Check localStorage cache if not yet hydrated into memory
    try {
      const stored = localStorage.getItem('campusconnect_campuses');
      if (stored) {
        const parsed: University[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const match = parsed.find(u => {
            if (!u) return false;
            const uSlug = (u.slug || '').toLowerCase();
            const uId = (u.id || '').toLowerCase();
            const uName = (u.name || '').toLowerCase();
            const uHandle = (u.instagramHandle || '').toLowerCase();
            return (
              uSlug === normalized ||
              (noSpecial && uSlug.replace(/[^a-z0-9]/g, '') === noSpecial) ||
              uId === normalized ||
              uId.replace('uni_', '') === normalized ||
              (noSpecial && uName.replace(/[^a-z0-9]/g, '') === noSpecial) ||
              uHandle.replace('@', '') === normalized
            );
          });
          if (match) return normalizeCampus(match) || match;
        }
      }
    } catch {}

    // 4. Check alias mappings & verified universities (strictly returns undefined if no match)
    return findUniversityBySlug(normalized);
  }, [universities, normalizeCampus]);

  const getUniversityById = useCallback((id: string): University | undefined => {
    if (!id) return undefined;
    return universities.find(u => u.id === id) || findUniversityById(id);
  }, [universities]);


  // Asynchronous remote campus resolver for direct links
  const fetchCampusBySlug = useCallback(async (slug: string): Promise<University | undefined> => {
    if (!slug) return undefined;
    const existing = getUniversityBySlug(slug);
    if (existing) return existing;

    const clean = slug.replace(/^@/, '').replace(/^\/ig\//, '').replace(/^\/u\//, '').replace(/^\/university\//, '');

    // 1. Check Firestore directly
    try {
      const directSnap = await getDoc(doc(db, 'universities', clean));
      if (directSnap.exists()) {
        const uni = { ...directSnap.data(), id: directSnap.id, slug: (directSnap.data() as any).slug || directSnap.id } as University;
        addOrUpdateCampus(uni);
        return uni;
      }
      const directSnapPrefixed = await getDoc(doc(db, 'universities', 'uni_' + clean.replace(/[^a-z0-9]/g, '')));
      if (directSnapPrefixed.exists()) {
        const uni = { ...directSnapPrefixed.data(), id: directSnapPrefixed.id, slug: (directSnapPrefixed.data() as any).slug || directSnapPrefixed.id } as University;
        addOrUpdateCampus(uni);
        return uni;
      }
    } catch (fsErr) {
      console.warn('Firestore direct fetch notice:', fsErr);
    }

    // 2. Fall back to backend route
    try {
      const res = await fetch(`/api/campuses/${encodeURIComponent(clean)}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.campus) {
          addOrUpdateCampus(data.campus);
          return data.campus;
        }
      }
    } catch (err) {
      console.warn(`Could not remote-fetch campus for slug "${slug}":`, err);
    }
    return undefined;
  }, [getUniversityBySlug, addOrUpdateCampus]);

  // Detect and preserve university context from Instagram link, URL path, redirect target, or prior selection
  useEffect(() => {
    const queryStr = currentRoute.includes('?') ? currentRoute.split('?')[1] : window.location.search;
    const searchParams = new URLSearchParams(queryStr);
    const uniParam = searchParams.get('uni') || searchParams.get('university') || searchParams.get('slug') || searchParams.get('campus');
    const redirectParam = searchParams.get('redirect') || '';
    const isInstagramEntry = searchParams.get('ref') === 'instagram';

    const extractSlugFromPath = (path: string): string | null => {
      if (!path) return null;
      const cleanPath = path.split('?')[0];
      if (cleanPath.startsWith('/university/')) return cleanPath.replace('/university/', '').split('/')[0];
      if (cleanPath.startsWith('/u/')) return cleanPath.replace('/u/', '').split('/')[0];
      if (cleanPath.startsWith('/ig/')) return cleanPath.replace('/ig/', '').split('/')[0];
      if (cleanPath.startsWith('/submit/')) return cleanPath.replace('/submit/', '').split('/')[0];
      return null;
    };

    let resolvedUni: University | undefined;

    if (uniParam) {
      resolvedUni = getUniversityBySlug(uniParam);
    } else {
      const routeSlug = extractSlugFromPath(currentRoute) || extractSlugFromPath(redirectParam);
      if (routeSlug) {
        resolvedUni = getUniversityBySlug(routeSlug);
      }
    }

    if (resolvedUni) {
      const uniToSet = resolvedUni;
      _setSelectedUniversity(prev => (prev?.id === uniToSet.id ? prev : uniToSet));
      try {
        localStorage.setItem('campusconnect_selected_uni', uniToSet.slug);
      } catch {}
      if (isInstagramEntry || !entryUniversityContext || entryUniversityContext.id !== uniToSet.id) {
        _setEntryUniversityContext(prev => (prev?.id === uniToSet.id ? prev : uniToSet));
        try {
          localStorage.setItem('campusconnect_entry_uni', uniToSet.slug);
        } catch {}
      }
    } else {
      // Check previously selected university or active draft in localStorage
      try {
        let storedSlug =
          localStorage.getItem('campusconnect_selected_uni') ||
          localStorage.getItem('campusconnect_entry_uni');

        if (!storedSlug) {
          const activeDraftRaw = localStorage.getItem('campusconnect_active_draft');
          if (activeDraftRaw) {
            const parsed = JSON.parse(activeDraftRaw);
            if (parsed?.universitySlug) {
              storedSlug = parsed.universitySlug;
            }
          }
        }

        if (storedSlug) {
          const found = getUniversityBySlug(storedSlug);
          if (found) {
            _setEntryUniversityContext(prev => (prev?.id === found.id ? prev : found));
            _setSelectedUniversity(prev => (prev?.id === found.id ? prev : found));
          }
        }
      } catch {}
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

  // Save payments to local storage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_payments', JSON.stringify(payments));
    } catch {
      // ignore
    }
  }, [payments]);

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

  // Save audit logs to local storage
  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_audit_logs', JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  // 6. Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_notifications');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  // Save notifications to local storage
  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_notifications', JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

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
    
    // Check student account in SQLite if not admin
    let serverUser: Partial<User> | null = null;
    if (!isAdminUser) {
      let authRejected = false;
      try {
        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          authRejected = true;
          addToast('Authentication Failed', data.message || 'Incorrect email or password.', 'error');
          throw new Error(data.message || 'Incorrect email or password.');
        }
        if (data.user) {
          serverUser = data.user;
        }
      } catch (err: any) {
        if (authRejected || (err?.message && err.message.includes('Incorrect password'))) {
          throw err;
        }
      }
    }

    const displayName =
      serverUser?.name ||
      cleanEmail
        .split('@')[0]
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') ||
      'Campus Student';

    // University association: strictly use what the user selected earlier or stored profile university
    let storedSelectedSlug: string | null = null;
    try {
      storedSelectedSlug =
        localStorage.getItem('campusconnect_selected_uni') ||
        localStorage.getItem('campusconnect_entry_uni');
    } catch {}
    const associatedUni =
      selectedUniversity ||
      entryUniversityContext ||
      (serverUser?.universitySlug ? getUniversityBySlug(serverUser.universitySlug) : undefined) ||
      (storedSelectedSlug ? getUniversityBySlug(storedSelectedSlug) : undefined) ||
      null;

    const loggedUser: User = {
      id: serverUser?.id || ('usr_' + Math.random().toString(36).substring(2, 9)),
      name: displayName,
      email: cleanEmail,
      role: isAdminUser ? 'Admin' : 'Student',
      avatarUrl: serverUser?.avatarUrl || '',
      universityId: associatedUni?.id || serverUser?.universityId,
      universityName: associatedUni?.name || serverUser?.universityName,
      universitySlug: associatedUni?.slug || serverUser?.universitySlug,
      course: serverUser?.course || '',
      graduationYear: serverUser?.graduationYear || '',
      bio: serverUser?.bio || '',
      interests: serverUser?.interests || [],
      studentVerificationStatus: serverUser?.studentVerificationStatus || 'UNVERIFIED',
      onboardingStep: serverUser?.onboardingStep || 0,
      onboardingCompleted: serverUser?.onboardingCompleted || false
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
      const redirectUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
      if (redirectUrl) {
        navigateTo(redirectUrl);
      } else {
        let hasActivePhotos = false;
        try {
          const raw = localStorage.getItem('campusconnect_active_draft');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && ((parsed.photos && parsed.photos.length > 0) || parsed.photoUrl)) {
              hasActivePhotos = true;
            }
          }
        } catch {}
        if (hasActivePhotos || associatedUni) {
          navigateTo('/student');
        } else {
          navigateTo('/app/dashboard');
        }
      }
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

    // Resolve target university strictly from explicit slug or prior user selection
    let storedSelectedSlug: string | null = null;
    try {
      storedSelectedSlug =
        localStorage.getItem('campusconnect_selected_uni') ||
        localStorage.getItem('campusconnect_entry_uni');
    } catch {}
    const targetUni =
      (universitySlug ? (getUniversityBySlug(universitySlug) || findUniversityBySlug(universitySlug)) : null) ||
      selectedUniversity ||
      entryUniversityContext ||
      (storedSelectedSlug ? getUniversityBySlug(storedSelectedSlug) : null) ||
      null;

    // Wipe any legacy/prior session records so new user finds 100% clean state
    clearAllStudentDrafts();
    try {
      localStorage.removeItem('campusconnect_instagram_accounts');
      localStorage.removeItem('campusconnect_notifications');
      localStorage.removeItem('campusconnect_submissions');
      localStorage.removeItem('campusconnect_payments');
      localStorage.removeItem('campusconnect_audit_logs');
      localStorage.removeItem('campusconnect_wallet_balance');
      localStorage.removeItem('campusconnect_wallet_transactions');
    } catch {}

    setAccounts([]);
    setNotifications([]);
    setSubmissions([]);
    setPayments([]);
    setAuditLogs([]);

    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      role: isAdminUser ? 'Admin' : 'Student',
      avatarUrl: '',
      universityId: targetUni?.id,
      universityName: targetUni?.name,
      universitySlug: targetUni?.slug,
      course: '',
      graduationYear: '',
      bio: '',
      interests: [],
      studentVerificationStatus: 'UNVERIFIED',
      onboardingStep: 0,
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

    try {
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, password: (_pass || '').trim() })
      }).catch(() => {});
    } catch {
      // ignore
    }

    addToast('Account Created', `Welcome to CampusConnect, ${cleanName}!`, 'success');
    if (isAdminUser) {
      navigateTo('/admin');
    } else {
      const redirectUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
      if (redirectUrl) {
        navigateTo(redirectUrl);
      } else {
        let hasActivePhotos = false;
        try {
          const raw = localStorage.getItem('campusconnect_active_draft');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && ((parsed.photos && parsed.photos.length > 0) || parsed.photoUrl)) {
              hasActivePhotos = true;
            }
          }
        } catch {}
        if (hasActivePhotos || targetUni) {
          navigateTo('/student');
        } else {
          navigateTo('/app/dashboard');
        }
      }
    }
    return true;
  };

  const clearCampusDraft = useCallback((slug: string) => {
    try {
      localStorage.removeItem(`campusconnect_draft_${slug}`);
      const active = localStorage.getItem('campusconnect_active_draft');
      if (active) {
        const parsed = JSON.parse(active);
        if (parsed?.universitySlug === slug) {
          localStorage.removeItem('campusconnect_active_draft');
        }
      }
    } catch {}
  }, []);

  const clearAllStudentDrafts = useCallback(() => {
    try {
      localStorage.removeItem('campusconnect_active_draft');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('campusconnect_draft_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAccounts([]);
    setNotifications([]);
    clearAllStudentDrafts();
    try {
      localStorage.removeItem('campusconnect_auth');
      localStorage.removeItem('campusconnect_user');
      localStorage.removeItem('campusconnect_instagram_accounts');
      localStorage.removeItem('campusconnect_notifications');
      localStorage.removeItem('campusconnect_wallet_balance');
      localStorage.removeItem('campusconnect_wallet_transactions');
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
    try {
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch {}
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
    try {
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch {}
    addToast('Onboarding Complete!', 'Welcome to your university student community.', 'success');
    if (updated.universitySlug) {
      navigateTo(`/university/${updated.universitySlug}`);
    } else {
      navigateTo('/student');
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
    const uni = getUniversityById(params.universityId) || findUniversityById(params.universityId) || selectedUniversity || entryUniversityContext;
    if (!uni) {
      throw new Error('Please select your university before creating a submission.');
    }

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
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubmission)
      });
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
    _provider: 'STRIPE_CARD' | 'CARD' = 'STRIPE_CARD',
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
            studentEmail: currentUser.email,
            universityId: sub.universityId,
            universitySlug: sub.universitySlug,
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

  const reviewSubmission = async (
    submissionId: string,
    decision: 'APPROVE' | 'REJECT',
    reason?: string,
    options?: { silent?: boolean }
  ) => {
    const hasAdminAccess = isAdmin || (typeof window !== 'undefined' && Boolean(localStorage.getItem('campusconnect_admin_token')));
    if (!hasAdminAccess) {
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

    if (!options?.silent) {
      addToast(
        isApproved ? 'Submission Approved' : 'Submission Rejected',
        `Status updated for ${sub.studentDisplayName}.`,
        isApproved ? 'success' : 'info'
      );
    }
  };

  const publishToInstagram = async (
    submissionId: string,
    instagramPostUrl: string,
    options?: { silent?: boolean }
  ) => {
    const hasAdminAccess = isAdmin || (typeof window !== 'undefined' && Boolean(localStorage.getItem('campusconnect_admin_token')));
    if (!hasAdminAccess) {
      addToast('Unauthorized', 'Administrator role required.', 'error');
      return;
    }

    const finalUrl = (instagramPostUrl || '').trim() || `https://www.instagram.com/p/CC_${Date.now().toString(36)}/`;

    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return;

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              publishingStatus: 'PUBLISHED',
              instagramPostUrl: finalUrl,
              publishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    const handleLower = (sub.universityInstagramHandle || '').replace(/^@/, '').toLowerCase();
    setAccounts((prev) =>
      prev.map((a) =>
        a.username.replace(/^@/, '').toLowerCase() === handleLower
          ? {
              ...a,
              mediaCount: (a.mediaCount || 0) + 1,
              reach28d: (a.reach28d || 0) + 150,
              impressions28d: (a.impressions28d || 0) + 210,
              interactions28d: (a.interactions28d || 0) + 24
            }
          : a
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
      link: finalUrl,
      read: false,
      createdAt: 'Just now'
    };
    setNotifications((prev) => [studentNotif, ...prev]);

    logAudit('SUBMISSION_PUBLISHED', 'INSTAGRAM_POST', submissionId, `Published URL: ${finalUrl}`);
    if (!options?.silent) {
      addToast('Post Confirmed & Published', 'Instagram publication recorded and student notified.', 'success');
    }
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
        if (Array.isArray(parsed)) {
          return parsed.filter(a => a.id !== 'ig_moreheadstate_official');
        }
      }
    } catch {}
    return [];
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_instagram_comments');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const stored = localStorage.getItem('campusconnect_instagram_conversations');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Sync Instagram accounts from server database on mount
  useEffect(() => {
    fetch('/api/instagram/accounts')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && Array.isArray(d.accounts) && d.accounts.length > 0) {
          setAccounts(prev => {
            const merged = new Map<string, InstagramAccount>();
            prev.forEach(a => merged.set(a.username.toLowerCase(), a));
            d.accounts.forEach((a: InstagramAccount) => merged.set(a.username.toLowerCase(), a));
            return Array.from(merged.values());
          });
        }
      })
      .catch(() => {});
  }, []);

  // Synchronize accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_instagram_accounts', JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_instagram_comments', JSON.stringify(comments));
    } catch {}
  }, [comments]);

  useEffect(() => {
    try {
      localStorage.setItem('campusconnect_instagram_conversations', JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  // Derive Instagram posts from real published submissions
  const derivedPosts = useMemo<InstagramPost[]>(() => {
    return submissions
      .filter(s => s.publishingStatus === 'PUBLISHED')
      .map(s => ({
        id: `post_${s.id}`,
        accountId: accounts.find(a => a.username.replace(/^@/, '').toLowerCase() === (s.universityInstagramHandle || '').replace(/^@/, '').toLowerCase())?.id || s.universityId,
        accountUsername: (s.universityInstagramHandle || '@campusconnect').replace(/^@/, ''),
        mediaType: 'IMAGE',
        mediaUrls: [s.watermarkedImagePath || s.originalImagePath].filter(Boolean),
        caption: s.caption || '',
        status: 'PUBLISHED',
        publishedAt: s.publishedAt || s.updatedAt,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        savesCount: 0,
        reach: 150,
        impressions: 210,
        engagementRate: 0
      }));
  }, [submissions, accounts]);

  const connectAccount = (data: Partial<InstagramAccount>) => {
    const handle = (data.username || 'instagram_account').replace(/^@/, '');
    const title = data.displayName || handle.charAt(0).toUpperCase() + handle.slice(1);
    const matchedUni = selectedUniversity || entryUniversityContext;
    const newAccount: InstagramAccount = {
      id: 'ig_' + Date.now(),
      businessId: 'biz_' + Date.now(),
      username: handle,
      displayName: title,
      profilePictureUrl: data.profilePictureUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80',
      accountType: data.accountType || 'BUSINESS',
      followersCount: data.followersCount || 0,
      followingCount: data.followingCount || 0,
      mediaCount: data.mediaCount || 0,
      reach28d: data.reach28d || 0,
      impressions28d: data.impressions28d || 0,
      interactions28d: data.interactions28d || 0,
      status: 'CONNECTED',
      connectedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      permissions: ['instagram_basic', 'instagram_manage_comments', 'instagram_manage_messages', 'direct_publish']
    };
    setAccounts(prev => {
      const updated = [newAccount, ...prev.filter(a => a.username.toLowerCase() !== handle.toLowerCase() && a.id !== 'ig_moreheadstate_official')];
      try {
        localStorage.setItem('campusconnect_instagram_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSelectedAccountId(newAccount.id);

    // Persist directly to backend SQLite (no Meta integration required)
    fetch('/api/instagram/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newAccount,
        universityId: matchedUni?.id,
        universityName: matchedUni?.name,
        actorEmail: currentUser?.email || 'system'
      })
    })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.account) {
          setAccounts(prev => prev.map(a => a.username.toLowerCase() === res.account.username.toLowerCase() ? res.account : a));
          setSelectedAccountId(res.account.id);
        }
      })
      .catch(() => {});

    addToast('Account Connected', `@${handle} connected and ready for direct Instagram management.`, 'success');
  };

  const refreshAccount = (id: string) => {
    const nextExpiry = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
    let targetUsername = '';
    setAccounts(prev => prev.map(a => {
      if (a.id === id) {
        targetUsername = a.username;
        return { ...a, status: 'CONNECTED', tokenExpiresAt: nextExpiry };
      }
      return a;
    }));
    fetch(`/api/instagram/accounts/${encodeURIComponent(id)}/refresh`, { method: 'POST' }).catch(() => {});
    addToast('Instagram Synced', `@${targetUsername || 'account'} connection refreshed for 60 days.`, 'success');
  };

  const disconnectAccount = (id: string) => {
    setAccounts(prev => {
      const updated = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem('campusconnect_instagram_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    fetch(`/api/instagram/accounts/${encodeURIComponent(id)}/disconnect`, { method: 'POST' }).catch(() => {});
    addToast('Account Disconnected', 'Instagram account has been disconnected.', 'info');
  };

  const markConversationRead = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
  };

  const toggleImportantConversation = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isImportant: !c.isImportant } : c));
  };

  const archiveConversation = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isArchived: !c.isArchived } : c));
  };

  const replyToComment = (id: string, text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    const activeHandle = accounts.find(a => a.id === selectedAccountId)?.username || accounts[0]?.username || 'campusconnect';
    setComments(prev => prev.map(c => c.id === id ? {
      ...c,
      status: 'REPLIED',
      replies: [
        ...(c.replies || []),
        {
          id: 'rep_' + Date.now(),
          fromAccount: activeHandle,
          text: cleanText,
          createdAt: new Date().toISOString()
        }
      ]
    } : c));
    addToast('Reply Posted', 'Your comment reply has been recorded.', 'success');
  };

  const hideComment = (id: string) => {
    let wasHidden = false;
    setComments(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.status === 'HIDDEN') {
        wasHidden = true;
        return { ...c, status: c.replies && c.replies.length > 0 ? 'REPLIED' : 'UNANSWERED' };
      }
      return { ...c, status: 'HIDDEN' };
    }));
    addToast(
      wasHidden ? 'Comment Restored' : 'Comment Hidden',
      wasHidden ? 'Comment is visible again in your queue.' : 'Comment visibility updated.',
      'info'
    );
  };

  const deleteComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    addToast('Comment Removed', 'Comment deleted from moderation queue.', 'info');
  };

  const sendMessage = (convId: string, text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      lastMessage: cleanText,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      messages: [
        ...c.messages,
        {
          id: 'dm_' + Date.now(),
          conversationId: convId,
          sender: 'BUSINESS',
          text: cleanText,
          createdAt: new Date().toISOString(),
          read: true
        }
      ]
    } : c));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const [businessNameOverride, setBusinessNameOverride] = useState<string>(() => {
    try {
      return localStorage.getItem('campusconnect_business_name') || '';
    } catch {
      return '';
    }
  });

  const updateBusiness = (updates: Partial<BusinessAccount>) => {
    if (updates.name !== undefined) {
      setBusinessNameOverride(updates.name);
      try {
        localStorage.setItem('campusconnect_business_name', updates.name);
      } catch {}
    }
  };

  const business: BusinessAccount = {
    id: 'biz_01',
    name: businessNameOverride || currentUser?.name || 'CampusConnect Workspace',
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
    fetchCampusBySlug,
    refreshCampuses,
    addOrUpdateCampus,
    removeCampus,

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
    comments,
    conversations,
    posts: derivedPosts,
    selectedConversationId,
    setSelectedConversationId,
    markConversationRead,
    toggleImportantConversation,
    archiveConversation,
    markAllNotificationsRead,
    selectedAccount: activeAccount,
    selectedAccountId,
    setSelectedAccountId,
    isOAuthModalOpen,
    setOAuthModalOpen,
    disconnectAccount,
    connectAccount,
    refreshAccount,
    replyToComment,
    hideComment,
    deleteComment,
    sendMessage,
    clearCampusDraft,
    clearAllStudentDrafts
  }), [
    currentRoute,
    navigateTo,
    universities,
    selectedUniversity,
    entryUniversityContext,
    getUniversityBySlug,
    getUniversityById,
    fetchCampusBySlug,
    refreshCampuses,
    addOrUpdateCampus,
    removeCampus,
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
    comments,
    conversations,
    derivedPosts,
    selectedConversationId,
    activeAccount,
    selectedAccountId,
    isOAuthModalOpen,
    clearCampusDraft,
    clearAllStudentDrafts
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
