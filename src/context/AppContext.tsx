import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  BusinessAccount,
  InstagramAccount,
  InstagramPost,
  Comment,
  Conversation,
  NotificationItem,
  ActivityLogItem,
  MediaAsset,
  PostStatus
} from '../types';
import {
  INITIAL_USER,
  INITIAL_BUSINESS,
  INITIAL_ACCOUNTS,
  INITIAL_POSTS,
  INITIAL_COMMENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY,
  INITIAL_MEDIA
} from '../data/mockInitialData';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info';
}

interface AppContextType {
  // Navigation & Auth
  currentRoute: string;
  navigateTo: (route: string) => void;
  isAuthenticated: boolean;
  currentUser: User | null;
  business: BusinessAccount;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (businessName: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateBusiness: (updates: Partial<BusinessAccount>) => void;
  updateUserProfile: (updates: Partial<User>) => void;

  // Instagram Accounts
  accounts: InstagramAccount[];
  selectedAccountId: string; // 'all' or specific account id
  setSelectedAccountId: (id: string) => void;
  selectedAccount: InstagramAccount | null;
  disconnectAccount: (id: string) => void;
  connectAccount: (newAccount: Partial<InstagramAccount>) => void;

  // Posts
  posts: InstagramPost[];
  filteredPosts: InstagramPost[];
  createPost: (postData: Partial<InstagramPost>) => InstagramPost;
  updatePost: (id: string, updates: Partial<InstagramPost>) => void;
  deletePost: (id: string) => void;
  duplicatePost: (id: string) => void;
  inspectPostId: string | null;
  setInspectPostId: (id: string | null) => void;

  // Comments
  comments: Comment[];
  replyToComment: (commentId: string, text: string) => void;
  hideComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;

  // Unified DM Inbox
  conversations: Conversation[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  sendMessage: (convId: string, text: string, attachments?: string[]) => void;
  markConversationRead: (convId: string) => void;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Activity Log
  activityLog: ActivityLogItem[];
  logActivity: (action: string, target: string, category?: ActivityLogItem['category']) => void;

  // Media Library
  mediaItems: MediaAsset[];
  addMediaItem: (item: Partial<MediaAsset>) => void;
  deleteMediaItem: (id: string) => void;

  // Modals & Extras
  isOAuthModalOpen: boolean;
  setOAuthModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isSupportWidgetOpen: boolean;
  setSupportWidgetOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  // Onboarding
  completeOnboardingStep: (stepNumber: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname.startsWith('/app') ? window.location.pathname : '/';
  });

  // Auth - check for clean session or start logged out
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const storedUser = localStorage.getItem('campusconnect_user');
      if (storedUser && (storedUser.toLowerCase().includes('kepton') || storedUser.toLowerCase().includes('software developers'))) {
        localStorage.removeItem('campusconnect_auth');
        localStorage.removeItem('campusconnect_user');
        localStorage.removeItem('campusconnect_business');
        return false;
      }
      return localStorage.getItem('campusconnect_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem('campusconnect_user');
      if (storedUser && !storedUser.toLowerCase().includes('kepton') && !storedUser.toLowerCase().includes('software developers')) {
        return JSON.parse(storedUser);
      }
    } catch {
      // fallback
    }
    return INITIAL_USER;
  });

  const [business, setBusiness] = useState<BusinessAccount>(() => {
    try {
      const storedBiz = localStorage.getItem('campusconnect_business');
      if (storedBiz && !storedBiz.toLowerCase().includes('kepton') && !storedBiz.toLowerCase().includes('software developers')) {
        return JSON.parse(storedBiz);
      }
    } catch {
      // fallback
    }
    return INITIAL_BUSINESS;
  });

  // Instagram Accounts
  const [accounts, setAccounts] = useState<InstagramAccount[]>(INITIAL_ACCOUNTS);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  // Posts
  const [posts, setPosts] = useState<InstagramPost[]>(INITIAL_POSTS);
  const [inspectPostId, setInspectPostId] = useState<string | null>(null);

  // Comments
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);

  // Inbox
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    INITIAL_CONVERSATIONS.length > 0 ? INITIAL_CONVERSATIONS[0].id : null
  );

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Activity
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>(INITIAL_ACTIVITY);

  // Media
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>(INITIAL_MEDIA);

  // Modals
  const [isOAuthModalOpen, setOAuthModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isSupportWidgetOpen, setSupportWidgetOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Navigation listener for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentRoute(path || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = (route: string) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const logActivity = (action: string, target: string, category: ActivityLogItem['category'] = 'CONTENT') => {
    const newEntry: ActivityLogItem = {
      id: 'act_' + Date.now(),
      user: currentUser?.name || 'Administrator',
      action,
      target,
      timestamp: 'Just now',
      category
    };
    setActivityLog((prev) => [newEntry, ...prev]);
  };

  const login = async (email: string, _pass: string): Promise<boolean> => {
    setIsAuthenticated(true);
    const cleanEmail = email.trim();
    const displayName = cleanEmail.split('@')[0]
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Campus User';

    const loggedUser: User = {
      id: 'usr_' + Date.now(),
      name: displayName,
      email: cleanEmail,
      role: 'Owner',
      avatarUrl: ''
    };
    const loggedBiz: BusinessAccount = {
      id: 'biz_' + Date.now(),
      name: `${displayName} Workspace`,
      email: cleanEmail,
      industry: 'Campus Organization',
      createdAt: new Date().toISOString(),
      onboardingStep: 2,
      onboardingCompleted: false
    };

    setCurrentUser(loggedUser);
    setBusiness(loggedBiz);

    try {
      localStorage.setItem('campusconnect_auth', 'true');
      localStorage.setItem('campusconnect_user', JSON.stringify(loggedUser));
      localStorage.setItem('campusconnect_business', JSON.stringify(loggedBiz));
    } catch {
      // ignore
    }

    addToast('Signed In', `Welcome to CampusConnect, ${displayName}!`, 'success');
    logActivity('User logged in', cleanEmail, 'AUTH');
    navigateTo('/app/dashboard');
    return true;
  };

  const register = async (businessName: string, email: string, _pass: string): Promise<boolean> => {
    setIsAuthenticated(true);
    const cleanEmail = email.trim();
    const cleanBizName = businessName.trim();
    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: cleanBizName,
      email: cleanEmail,
      role: 'Owner',
      avatarUrl: ''
    };
    const newBusiness: BusinessAccount = {
      id: 'biz_' + Date.now(),
      name: cleanBizName,
      email: cleanEmail,
      industry: 'Campus Organization',
      createdAt: new Date().toISOString(),
      onboardingStep: 2, // 1 done (business created)
      onboardingCompleted: false
    };

    setCurrentUser(newUser);
    setBusiness(newBusiness);

    try {
      localStorage.setItem('campusconnect_auth', 'true');
      localStorage.setItem('campusconnect_user', JSON.stringify(newUser));
      localStorage.setItem('campusconnect_business', JSON.stringify(newBusiness));
    } catch {
      // ignore
    }

    addToast('Account Created', `Workspace "${cleanBizName}" created successfully.`, 'success');
    logActivity('Business created', cleanBizName, 'AUTH');
    navigateTo('/app/dashboard');
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setBusiness(INITIAL_BUSINESS);
    setAccounts([]);
    try {
      localStorage.removeItem('campusconnect_auth');
      localStorage.removeItem('campusconnect_user');
      localStorage.removeItem('campusconnect_business');
    } catch {
      // ignore
    }
    addToast('Signed Out', 'You have been safely signed out.', 'info');
    navigateTo('/login');
  };

  const updateBusiness = (updates: Partial<BusinessAccount>) => {
    setBusiness((prev) => ({ ...prev, ...updates }));
    addToast('Business Profile Updated', 'Changes saved successfully.', 'success');
    logActivity('Settings updated', 'Business profile information updated', 'SETTINGS');
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updates });
      addToast('Profile Updated', 'User profile saved.', 'success');
      logActivity('Profile updated', 'Personal credentials updated', 'SETTINGS');
    }
  };

  const completeOnboardingStep = (stepNumber: number) => {
    setBusiness((prev) => {
      const nextStep = Math.max(prev.onboardingStep, stepNumber + 1);
      const isComplete = nextStep > 4;
      return {
        ...prev,
        onboardingStep: nextStep,
        onboardingCompleted: isComplete
      };
    });
    addToast('Checklist Updated', `Step ${stepNumber} completed!`, 'success');
  };

  // Selected Instagram account
  const selectedAccount = selectedAccountId === 'all' 
    ? null 
    : accounts.find((a) => a.id === selectedAccountId) || null;

  // Filtered posts based on active selected account
  const filteredPosts = selectedAccountId === 'all' 
    ? posts 
    : posts.filter((p) => p.accountId === selectedAccountId);

  // Accounts
  const disconnectAccount = (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    if (selectedAccountId === accountId) {
      setSelectedAccountId('all');
    }
    addToast('Account Disconnected', `@${acct?.username || 'account'} unlinked from workspace.`, 'info');
    logActivity('Instagram disconnected', `@${acct?.username} token revoked`, 'ACCOUNT');
  };

  const connectAccount = (newAccountData: Partial<InstagramAccount>) => {
    const id = 'ig_' + Math.random().toString(36).substring(2, 7);
    const cleanUsername = (newAccountData.username || 'campus_account').replace(/^@/, '');
    const newAcct: InstagramAccount = {
      id,
      businessId: business.id,
      username: cleanUsername,
      displayName: newAccountData.displayName || `@${cleanUsername}`,
      profilePictureUrl: newAccountData.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      accountType: newAccountData.accountType || 'BUSINESS',
      followersCount: newAccountData.followersCount || 14200,
      followingCount: 420,
      mediaCount: 38,
      reach28d: newAccountData.reach28d || 48200,
      impressions28d: newAccountData.impressions28d || 79000,
      interactions28d: newAccountData.interactions28d || 6100,
      status: 'CONNECTED',
      connectedAt: new Date().toISOString(),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      permissions: [
        'instagram_basic',
        'instagram_manage_comments',
        'instagram_manage_messages',
        'pages_show_list',
        'instagram_manage_insights'
      ]
    };

    setAccounts((prev) => [...prev, newAcct]);
    setSelectedAccountId(id);

    // Populate active initial DM and comment if none exist for this freshly connected handle
    setComments((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: 'comm_' + Date.now(),
            postId: 'post_live_01',
            postThumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80',
            accountId: id,
            fromUsername: 'student_council',
            text: 'Is the campus library open during late hours this finals week?',
            createdAt: new Date().toISOString(),
            status: 'UNANSWERED',
            replies: []
          }
        ];
      }
      return prev.map((c) => ({ ...c, accountId: id }));
    });

    setConversations((prev) => {
      if (prev.length === 0) {
        const convId = 'conv_' + Date.now();
        setSelectedConversationId(convId);
        return [
          {
            id: convId,
            accountId: id,
            customerUsername: 'marcus_chen',
            customerDisplayName: 'Marcus Chen',
            customerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            lastMessage: 'Hi! Could you send me the link to RSVP for tomorrow’s guest lecture?',
            lastMessageTime: 'Just now',
            unreadCount: 1,
            isImportant: true,
            messages: [
              {
                id: 'msg_01',
                conversationId: convId,
                sender: 'CUSTOMER',
                text: 'Hi! Could you send me the link to RSVP for tomorrow’s guest lecture?',
                createdAt: new Date().toISOString(),
                read: false
              }
            ]
          }
        ];
      }
      return prev.map((conv) => ({ ...conv, accountId: id }));
    });

    // Add real notification
    const newNotif: NotificationItem = {
      id: 'notif_' + Date.now(),
      type: 'ACCOUNT_ALERT',
      title: `@${cleanUsername} successfully connected`,
      message: `Your Instagram ${newAcct.accountType.toLowerCase()} account has been verified and connected to CampusConnect.`,
      createdAt: 'Just now',
      read: false,
      link: '/app/dashboard'
    };
    setNotifications((prev) => [newNotif, ...prev]);

    completeOnboardingStep(2);
    addToast('Instagram Connected', `Successfully linked @${newAcct.username} via Meta Graph API`, 'success');
    logActivity('Instagram connected', `@${newAcct.username} authorized with Meta permissions`, 'ACCOUNT');
  };

  // Posts CRUD
  const createPost = (postData: Partial<InstagramPost>): InstagramPost => {
    const defaultAccount = accounts[0] || { id: 'ig_01', username: 'business.account' };
    const targetAccountId = postData.accountId || (selectedAccountId !== 'all' ? selectedAccountId : defaultAccount.id);
    const targetAccount = accounts.find((a) => a.id === targetAccountId) || defaultAccount;

    const newPost: InstagramPost = {
      id: 'post_' + Date.now(),
      accountId: targetAccountId,
      accountUsername: targetAccount.username,
      mediaType: postData.mediaType || 'IMAGE',
      mediaUrls: postData.mediaUrls && postData.mediaUrls.length > 0 
        ? postData.mediaUrls 
        : ['/src/assets/images/instagram_post_showcase_1_1792268177626.jpg'],
      caption: postData.caption || '',
      status: postData.status || 'PUBLISHED',
      publishedAt: postData.status === 'PUBLISHED' ? new Date().toISOString() : undefined,
      scheduledFor: postData.scheduledFor,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savesCount: 0,
      reach: 0,
      impressions: 0,
      engagementRate: 0
    };

    setPosts((prev) => [newPost, ...prev]);

    if (newPost.status === 'PUBLISHED') {
      completeOnboardingStep(3);
      addToast('Post Published', `Published to @${targetAccount.username} feed.`, 'success');
      logActivity('Post published', `Post published to @${targetAccount.username}`, 'CONTENT');
    } else if (newPost.status === 'SCHEDULED') {
      addToast('Post Scheduled', `Scheduled for ${new Date(newPost.scheduledFor || '').toLocaleString()}.`, 'info');
      logActivity('Post scheduled', `Post scheduled on @${targetAccount.username}`, 'CONTENT');
    } else {
      addToast('Draft Saved', 'Post draft saved in content library.', 'info');
      logActivity('Draft created', 'New content draft stored', 'CONTENT');
    }

    return newPost;
  };

  const updatePost = (id: string, updates: Partial<InstagramPost>) => {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
    addToast('Post Updated', 'Changes saved.', 'success');
    logActivity('Post updated', `Post ${id} updated`, 'CONTENT');
  };

  const deletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    addToast('Post Deleted', 'Post removed from workspace.', 'info');
    logActivity('Post deleted', `Post ${id} deleted`, 'CONTENT');
  };

  const duplicatePost = (id: string) => {
    const original = posts.find((p) => p.id === id);
    if (!original) return;
    const duplicated: InstagramPost = {
      ...original,
      id: 'post_' + Date.now(),
      status: 'DRAFT',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savesCount: 0,
      publishedAt: undefined,
      scheduledFor: undefined
    };
    setPosts((prev) => [duplicated, ...prev]);
    addToast('Post Duplicated', 'Duplicated as new draft.', 'info');
  };

  // Comments
  const replyToComment = (commentId: string, text: string) => {
    const activeAcct = accounts[0]?.username || 'business';
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const reply = {
            id: 'rep_' + Date.now(),
            fromAccount: activeAcct,
            text,
            createdAt: new Date().toISOString()
          };
          return {
            ...c,
            status: 'REPLIED' as const,
            replies: [...(c.replies || []), reply]
          };
        }
        return c;
      })
    );
    addToast('Reply Published', `Sent reply as @${activeAcct}.`, 'success');
    logActivity('Comment replied', `Replied to comment on post`, 'CONTENT');
  };

  const hideComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, status: 'HIDDEN' as const } : c))
    );
    addToast('Comment Hidden', 'Comment will not be visible on Instagram feed.', 'info');
    logActivity('Comment hidden', 'Moderated spam or offending comment', 'CONTENT');
  };

  const deleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    addToast('Comment Deleted', 'Comment deleted from Instagram.', 'info');
    logActivity('Comment deleted', 'Removed comment from post', 'CONTENT');
  };

  // Inbox
  const sendMessage = (convId: string, text: string, attachments?: string[]) => {
    const newMessage = {
      id: 'msg_' + Date.now(),
      conversationId: convId,
      sender: 'BUSINESS' as const,
      text,
      createdAt: new Date().toISOString(),
      read: true,
      attachments
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === convId) {
          return {
            ...conv,
            lastMessage: text,
            lastMessageTime: 'Just now',
            unreadCount: 0,
            messages: [...conv.messages, newMessage]
          };
        }
        return conv;
      })
    );

    logActivity('Message sent', `Replied in conversation ${convId}`, 'INBOX');
  };

  const markConversationRead = (convId: string) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === convId ? { ...conv, unreadCount: 0 } : conv))
    );
  };

  // Notifications
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast('Notifications Cleared', 'All notifications marked as read.', 'info');
  };

  // Media
  const addMediaItem = (item: Partial<MediaAsset>) => {
    const newMedia: MediaAsset = {
      id: 'med_' + Date.now(),
      url: item.url || '/src/assets/images/instagram_post_showcase_1_1792268177626.jpg',
      filename: item.filename || 'asset_upload.jpg',
      size: item.size || '2.1 MB',
      dimensions: item.dimensions || '1080 x 1080',
      type: item.type || 'IMAGE',
      uploadedAt: new Date().toISOString().split('T')[0],
      tags: item.tags || ['media', 'upload']
    };
    setMediaItems((prev) => [newMedia, ...prev]);
    addToast('Asset Uploaded', `${newMedia.filename} added to media library.`, 'success');
  };

  const deleteMediaItem = (id: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
    addToast('Asset Removed', 'Media file deleted.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigateTo,
        isAuthenticated,
        currentUser,
        business,
        login,
        register,
        logout,
        updateBusiness,
        updateUserProfile,
        accounts,
        selectedAccountId,
        setSelectedAccountId,
        selectedAccount,
        disconnectAccount,
        connectAccount,
        posts,
        filteredPosts,
        createPost,
        updatePost,
        deletePost,
        duplicatePost,
        inspectPostId,
        setInspectPostId,
        comments,
        replyToComment,
        hideComment,
        deleteComment,
        conversations,
        selectedConversationId,
        setSelectedConversationId,
        sendMessage,
        markConversationRead,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        activityLog,
        logActivity,
        mediaItems,
        addMediaItem,
        deleteMediaItem,
        isOAuthModalOpen,
        setOAuthModalOpen,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        isSupportWidgetOpen,
        setSupportWidgetOpen,
        toasts,
        addToast,
        removeToast,
        completeOnboardingStep
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
