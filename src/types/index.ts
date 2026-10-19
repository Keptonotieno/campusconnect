export type UserRole = 'Student' | 'Admin' | 'Moderator' | 'Owner';

export interface University {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  coverUrl?: string;
  description: string;
  location: string;
  officialWebsiteUrl: string;
  instagramProfileUrl: string;
  instagramHandle: string;
  communityEnabled: boolean;
  studentCount?: number;
  featuredCount?: number;
  established?: string;
  createdAt: string;
  updatedAt: string;
}

export type StudentVerificationStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
export type OnboardingStep = 1 | 2 | 3 | 4; // 1: University & Account, 2: Profile, 3: Student Verification, 4: Complete

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl: string;
  universityId?: string;
  universityName?: string;
  universitySlug?: string;
  course?: string;
  major?: string;
  graduationYear?: string;
  bio?: string;
  interests?: string[];
  personalInstagramHandle?: string;
  housingPreference?: 'On Campus' | 'Off Campus' | 'Looking for Roommate' | 'Not Specified';
  friendshipPreference?: 'Study Buddy' | 'Social & Events' | 'Campus Life' | 'All';
  studentVerificationStatus?: StudentVerificationStatus;
  verificationDocumentUrl?: string;
  onboardingStep?: OnboardingStep;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SubmissionPaymentStatus = 
  | 'DRAFT' 
  | 'AWAITING_PAYMENT' 
  | 'PAYMENT_PENDING' 
  | 'PAYMENT_CONFIRMED' 
  | 'PAYMENT_FAILED' 
  | 'REFUND_PENDING' 
  | 'REFUNDED';

export type SubmissionModerationStatus = 
  | 'PENDING' 
  | 'UNDER_REVIEW' 
  | 'CHANGES_REQUESTED' 
  | 'APPROVED' 
  | 'REJECTED';

export type SubmissionPublishingStatus = 
  | 'NOT_READY' 
  | 'READY_TO_PUBLISH' 
  | 'PUBLISHING' 
  | 'PUBLISHED' 
  | 'PUBLISHING_FAILED';

export interface FeaturedSubmission {
  id: string;
  studentUid: string;
  studentDisplayName: string;
  studentEmail: string;
  studentAvatarUrl?: string;
  universityId: string;
  universityName: string;
  universitySlug: string;
  universityInstagramHandle: string;
  
  // Photos
  originalImagePath: string;
  watermarkedImagePath: string;
  
  // Content & Legal
  caption: string;
  publicationConsent: boolean;
  rightsConfirmed: boolean;
  termsAgreed: boolean;
  
  // States
  paymentStatus: SubmissionPaymentStatus;
  moderationStatus: SubmissionModerationStatus;
  publishingStatus: SubmissionPublishingStatus;
  
  // Moderation feedback
  rejectionReason?: string;
  adminNotes?: string;
  
  // Instagram publishing output
  instagramPostUrl?: string;
  publishedAt?: string;
  
  // Timestamps
  submittedAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'MPESA' | 'CARD';

export interface PaymentRecord {
  id: string;
  submissionId: string;
  studentUid: string;
  studentName: string;
  universityId: string;
  provider: 'MPESA' | 'STRIPE_CARD' | 'DARAJA';
  providerTransactionReference: string;
  amountUsd: number; // 6.00
  amountKes: number; // 780.00
  currency: 'USD' | 'KES';
  phoneNumber?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';
  idempotencyKey: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorUid: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  targetType: 'SUBMISSION' | 'PAYMENT' | 'UNIVERSITY' | 'USER' | 'INSTAGRAM_POST';
  targetId: string;
  details?: string;
  timestamp: string;
}

export type ActivityLogItem = AuditLogItem;

export interface NotificationItem {
  id: string;
  recipientUid: string;
  type: 'SUBMISSION_STATUS' | 'PAYMENT_CONFIRMED' | 'POST_PUBLISHED' | 'ACTION_REQUIRED' | 'SYSTEM';
  title: string;
  message: string;
  relatedSubmissionId?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// Retain legacy compatibility for existing dashboard/inbox views if needed
export interface BusinessAccount {
  id: string;
  name: string;
  email: string;
  industry: string;
  createdAt: string;
  onboardingStep: number;
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
  replies?: Array<{ id: string; fromAccount: string; text: string; createdAt: string }>;
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

export interface InstagramPost {
  id: string;
  accountId: string;
  accountUsername: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mediaUrls: string[];
  caption: string;
  status: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'FAILED';
  publishedAt?: string;
  scheduledFor?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  failureReason?: string;
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
