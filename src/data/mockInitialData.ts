import { 
  InstagramAccount, 
  InstagramPost, 
  Conversation, 
  Comment, 
  NotificationItem, 
  ActivityLogItem, 
  MediaAsset,
  User,
  BusinessAccount 
} from '../types';

// Clean initial state with zero hardcoded user or previous login accounts
export const INITIAL_USER: User | null = null;

export const INITIAL_BUSINESS: BusinessAccount = {
  id: 'biz_01',
  name: 'CampusConnect Workspace',
  email: '',
  industry: 'Campus Community & Organization',
  createdAt: new Date().toISOString(),
  onboardingStep: 1,
  onboardingCompleted: false,
};

// Initial state starts with 0 accounts connected (clean slate)
export const INITIAL_ACCOUNTS: InstagramAccount[] = [];

// No hardcoded posts
export const INITIAL_POSTS: InstagramPost[] = [];

// No hardcoded comments
export const INITIAL_COMMENTS: Comment[] = [];

// No hardcoded conversations
export const INITIAL_CONVERSATIONS: Conversation[] = [];

// Clean initial system notifications
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_welcome',
    type: 'SYSTEM',
    title: 'Welcome to CampusConnect',
    message: 'Your workspace is ready. Connect your Instagram account to start managing direct messages, community comments, and audience insights.',
    createdAt: 'Just now',
    read: false,
    link: '/app/dashboard'
  }
];

// No hardcoded previous activity records
export const INITIAL_ACTIVITY: ActivityLogItem[] = [];

// No hardcoded media items
export const INITIAL_MEDIA: MediaAsset[] = [];

// Helper to create a newly connected Instagram account based on user-entered handle
export const createInstagramAccountRecord = (username: string, accountType: 'BUSINESS' | 'CREATOR' = 'BUSINESS'): InstagramAccount => {
  const cleanHandle = username.trim().replace(/^@/, '') || 'campus_account';
  const displayName = cleanHandle
    .split(/[._]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: 'ig_' + Math.random().toString(36).substring(2, 8),
    businessId: 'biz_01',
    username: cleanHandle,
    displayName: displayName || `@${cleanHandle}`,
    profilePictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    accountType,
    followersCount: 8420,
    followingCount: 340,
    mediaCount: 42,
    reach28d: 26400,
    impressions28d: 48900,
    interactions28d: 3820,
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
};
