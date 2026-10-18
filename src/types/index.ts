export type UserRole = 'Owner' | 'Admin' | 'Manager' | 'Editor' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl: string;
}

export interface BusinessAccount {
  id: string;
  name: string;
  email: string;
  industry: string;
  createdAt: string;
  onboardingStep: number; // 1 to 4
  onboardingCompleted: boolean;
}

export interface InstagramAccount {
  id: string;
  businessId: string;
  username: string;
  displayName: string;
  profilePictureUrl: string;
  accountType: 'BUSINESS' | 'CREATOR';
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  reach28d: number;
  impressions28d: number;
  interactions28d: number;
  status: 'CONNECTED' | 'EXPIRING_SOON' | 'DISCONNECTED';
  connectedAt: string;
  tokenExpiresAt: string;
  permissions: string[];
}

export type PostMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL';
export type PostStatus = 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'FAILED';

export interface PostMediaItem {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  thumbnailUrl?: string;
}

export interface InstagramPost {
  id: string;
  accountId: string;
  accountUsername: string;
  mediaType: PostMediaType;
  mediaUrls: string[];
  caption: string;
  status: PostStatus;
  publishedAt?: string;
  scheduledFor?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  reach: number;
  impressions: number;
  engagementRate: number; // e.g. 4.8
  failureReason?: string;
}

export interface Comment {
  id: string;
  postId: string;
  postThumbnail: string;
  accountId: string;
  fromUsername: string;
  fromUserAvatar?: string;
  text: string;
  createdAt: string;
  status: 'UNANSWERED' | 'REPLIED' | 'HIDDEN' | 'FLAGGED';
  replies?: CommentReply[];
}

export interface CommentReply {
  id: string;
  fromAccount: string;
  text: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  sender: 'CUSTOMER' | 'BUSINESS';
  text: string;
  createdAt: string;
  read: boolean;
  attachments?: string[];
}

export interface Conversation {
  id: string;
  accountId: string;
  customerUsername: string;
  customerDisplayName: string;
  customerAvatar: string;
  customerBio?: string;
  followersCount?: number;
  isVerified?: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isImportant?: boolean;
  messages: DirectMessage[];
}

export interface NotificationItem {
  id: string;
  type: 'DM' | 'COMMENT' | 'POST_PUBLISHED' | 'POST_FAILED' | 'ACCOUNT_ALERT' | 'SYSTEM';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export interface ActivityLogItem {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  category: 'CONTENT' | 'AUTH' | 'ACCOUNT' | 'INBOX' | 'SETTINGS';
}

export interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  size: string;
  dimensions: string;
  type: 'IMAGE' | 'VIDEO';
  uploadedAt: string;
  tags: string[];
}
