import {
  University,
  PaymentRecord,
  InstagramAccount,
  AuditLogItem,
  User,
  FeaturedSubmission,
  CentralEmailConfig,
  UniversityEmailIdentity,
  UniversityEmailTemplate,
  DetailedEmailLog,
  UniversityEmailEventType,
  ResendDomainStatus,
  EmailDiagnosticReport
} from '../types';
import { VERIFIED_UNIVERSITIES } from '../data/universities';

export interface AdminAuthResponse {
  success: boolean;
  message?: string;
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  challengeToken?: string;
  secret?: string;
  otpAuthUri?: string;
  backupCodes?: string[];
  admin?: {
    id: string;
    email: string;
    role: 'Admin';
    mfaVerified?: boolean;
    expiresAt?: string;
  };
  expiresAt?: string;
}

export interface SecurityEventItem {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  eventType: string;
  actorEmail?: string;
  ipAddress?: string;
  details: string;
  createdAt: string;
}

export interface AuditChainVerification {
  valid: boolean;
  checkedCount: number;
  brokenAtId?: string;
}

export interface AdminOverviewData {
  totalAmountPaid: {
    usd: number;
    formattedUsd: string;
  };
  connectedInstagramAccounts: number;
  registeredUsers: number;
  successfulPayments: number;
  totalCampuses: number;
  activeCampuses: number;
  integrations: Array<{
    id: string;
    name: string;
    category: string;
    status: 'CONNECTED' | 'STANDBY' | 'DEGRADED' | 'NOT_CONFIGURED';
    verifiedAt: string | null;
    details: string;
    configured?: boolean;
  }>;
  recentDeliveries: Array<{
    id: string;
    recipient: string;
    subject: string;
    template: string;
    status: 'DELIVERED' | 'QUEUED' | 'BOUNCED' | 'FAILED';
    sentAt: string;
    messageId: string;
    provider: string;
  }>;
  recentAuditLogs: AuditLogItem[];
}

export interface EmailConfigData {
  config: {
    senderEmail: string;
    senderName: string;
    smtpHost: string;
    smtpPort: number;
    tlsEnabled: boolean;
    dkimVerified: boolean;
    spfVerified: boolean;
    status: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  };
  logs: Array<{
    id: string;
    recipient: string;
    subject: string;
    template: string;
    status: 'DELIVERED' | 'QUEUED' | 'BOUNCED' | 'FAILED';
    sentAt: string;
    messageId: string;
    provider: string;
  }>;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: 'CONNECTED' | 'PENDING_CONFIGURATION' | 'DEGRADED' | 'NOT_CONFIGURED';
  configured: boolean;
  lastVerifiedAt: string | null;
  details: string;
  keys: Record<string, string>;
}

const USER_KEY = 'campusconnect_admin_user';

function clearLegacyTokenArtifacts() {
  try {
    localStorage.removeItem('campusconnect_admin_token');
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Authoritative HTTP fetch wrapper for Admin APIs.
 * Strictly authenticates via HttpOnly secure session cookies (`credentials: 'include'`)
 * and never fabricates auth, payment, or mutation responses client-side.
 */
async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      credentials: 'include',
      ...options,
      headers
    });
  } catch {
    const err = new Error('Unable to reach the CampusConnect backend server.');
    (err as any).status = 503;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';

  if (res.ok) {
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    const err = new Error('Unexpected non-JSON response from backend server.');
    (err as any).status = 502;
    throw err;
  }

  if (res.status === 401 || res.status === 403) {
    clearLegacyTokenArtifacts();
  }

  let errorMsg = `Request failed with status ${res.status}`;
  let responseData: any = null;
  if (contentType.includes('application/json')) {
    try {
      responseData = await res.json();
      errorMsg = responseData.message || responseData.error || errorMsg;
    } catch {
      // ignore
    }
  }

  const err = new Error(errorMsg);
  (err as any).status = res.status;
  if (responseData) {
    (err as any).data = responseData;
  }
  throw err;
}

// -----------------------------------------------------------------------------
// EXPORTED API METHODS
// -----------------------------------------------------------------------------

// 1. Auth, Bootstrap & MFA
export async function getAdminStatus(): Promise<{ bootstrapped: boolean; adminCount: number }> {
  return adminFetch<{ bootstrapped: boolean; adminCount: number }>('/api/auth/admin-status');
}

export async function bootstrapAdmin(email: string, pass: string): Promise<AdminAuthResponse> {
  clearLegacyTokenArtifacts();
  return adminFetch<AdminAuthResponse>('/api/auth/bootstrap-admin', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass })
  });
}

export async function loginAdmin(email: string, pass: string): Promise<AdminAuthResponse> {
  clearLegacyTokenArtifacts();
  const cleanEmail = (email || '').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '');
  const cleanPass = (pass || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

  const data = await adminFetch<AdminAuthResponse>('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ email: cleanEmail, password: cleanPass })
  });

  if (data.admin && !data.mfaRequired) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(data.admin));
    } catch {}
  }
  return data;
}

export async function verifyAdminMfa(challengeToken: string, code: string): Promise<AdminAuthResponse> {
  const data = await adminFetch<AdminAuthResponse>('/api/auth/admin-mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeToken, code: code.trim() })
  });
  if (data.admin) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(data.admin));
    } catch {}
  }
  return data;
}

export async function logoutAdmin(): Promise<{ success: boolean }> {
  try {
    await adminFetch('/api/auth/admin-logout', { method: 'POST' });
  } catch {
    // ignore
  } finally {
    clearLegacyTokenArtifacts();
  }
  return { success: true };
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; admin?: any }> {
  try {
    const res = await fetch('/api/auth/admin-me', {
      credentials: 'include',
      headers: { 'Cache-Control': 'no-store' }
    });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const data = await res.json();
      if (data.authenticated && data.admin) {
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(data.admin));
        } catch {}
      }
      return data;
    }
    if (res.status === 401 || res.status === 403) {
      clearLegacyTokenArtifacts();
    }
  } catch {
    // ignore
  }
  return { authenticated: false };
}

// 2. Overview & Security Alerts
export async function fetchAdminOverview(): Promise<AdminOverviewData> {
  return adminFetch<AdminOverviewData>('/api/admin/overview');
}

export async function fetchAdminSecurityEvents(): Promise<{ events: SecurityEventItem[] }> {
  return adminFetch<{ events: SecurityEventItem[] }>('/api/admin/security-events');
}

export async function verifyAuditLogChain(): Promise<AuditChainVerification> {
  return adminFetch<AuditChainVerification>('/api/admin/audit-logs/verify');
}

// 3. Campuses
export async function fetchAdminCampuses(): Promise<{ campuses: University[] }> {
  return adminFetch<{ campuses: University[] }>('/api/admin/campuses');
}

export async function createAdminCampus(
  campusData: Partial<University>
): Promise<{ success: boolean; campus: University; canonicalUrls: Record<string, string> }> {
  return adminFetch<{ success: boolean; campus: University; canonicalUrls: Record<string, string> }>('/api/admin/campuses', {
    method: 'POST',
    body: JSON.stringify(campusData)
  });
}

export async function updateAdminCampus(
  id: string,
  updates: Partial<University>
): Promise<{ success: boolean; campus: University }> {
  return adminFetch<{ success: boolean; campus: University }>(`/api/admin/campuses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteAdminCampus(id: string): Promise<{ success: boolean }> {
  return adminFetch<{ success: boolean }>(`/api/admin/campuses/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

// 4. Payments
export async function fetchAdminPayments(): Promise<{ payments: PaymentRecord[]; totals: { usd: number }; count: number }> {
  return adminFetch<{ payments: PaymentRecord[]; totals: { usd: number }; count: number }>('/api/admin/payments');
}

export async function simulateWebhookTest(payload: any): Promise<any> {
  return adminFetch<any>('/api/admin/payments/webhook-test', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// 5. Instagram
export async function fetchAdminInstagram(): Promise<{ accounts: InstagramAccount[] }> {
  return adminFetch<{ accounts: InstagramAccount[] }>('/api/admin/instagram');
}

export async function connectAdminInstagram(
  data: Partial<InstagramAccount> & { universityId?: string; universityName?: string }
): Promise<{ success: boolean; account: InstagramAccount }> {
  return adminFetch<{ success: boolean; account: InstagramAccount }>('/api/admin/instagram/connect', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function refreshAdminInstagram(id: string): Promise<{ success: boolean; account: InstagramAccount }> {
  return adminFetch<{ success: boolean; account: InstagramAccount }>(`/api/admin/instagram/${encodeURIComponent(id)}/refresh`, {
    method: 'POST'
  });
}

export async function disconnectAdminInstagram(id: string): Promise<{ success: boolean; account: InstagramAccount }> {
  return adminFetch<{ success: boolean; account: InstagramAccount }>(`/api/admin/instagram/${encodeURIComponent(id)}/disconnect`, {
    method: 'POST'
  });
}

// 6. Email
export async function fetchAdminEmail(): Promise<EmailConfigData> {
  return adminFetch<EmailConfigData>('/api/admin/email');
}

export async function sendAdminTestEmail(recipient?: string): Promise<{ success: boolean; message: string; log: any }> {
  return adminFetch<{ success: boolean; message: string; log: any }>('/api/admin/email/send-test', {
    method: 'POST',
    body: JSON.stringify({ recipient })
  });
}

// 7. Audit Logs
export async function fetchAdminAuditLogs(): Promise<{ logs: AuditLogItem[] }> {
  return adminFetch<{ logs: AuditLogItem[] }>('/api/admin/audit-logs');
}

// 8. Public Campuses (Directory read only)
export async function fetchPublicCampuses(): Promise<{ campuses: University[] }> {
  try {
    const res = await fetch('/api/campuses', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      return await res.json();
    }
  } catch {}
  return { campuses: VERIFIED_UNIVERSITIES };
}

// 9. Production Integrations & API Keys
export async function fetchAdminIntegrations(): Promise<{ integrations: IntegrationItem[] }> {
  return adminFetch<{ integrations: IntegrationItem[] }>('/api/admin/integrations');
}

export async function updateAdminIntegration(
  id: string,
  keys: Record<string, string>
): Promise<{ success: boolean; message: string; integration: IntegrationItem }> {
  return adminFetch<{ success: boolean; message: string; integration: IntegrationItem }>(
    `/api/admin/integrations/${encodeURIComponent(id)}`,
    {
      method: 'POST',
      body: JSON.stringify({ keys })
    }
  );
}

export async function testAdminIntegration(id: string): Promise<{ success: boolean; message: string; verifiedAt: string }> {
  return adminFetch<{ success: boolean; message: string; verifiedAt: string }>(
    `/api/admin/integrations/${encodeURIComponent(id)}/test`,
    {
      method: 'POST'
    }
  );
}

// 10. Submissions Management & Admin-Only University Instagram Publishing
export async function fetchAdminSubmissions(): Promise<{ submissions: FeaturedSubmission[] }> {
  return adminFetch<{ submissions: FeaturedSubmission[] }>('/api/admin/submissions');
}

export async function reviewAdminSubmission(
  submissionId: string,
  decision: 'APPROVE' | 'REJECT',
  reason?: string
): Promise<{ success: boolean; submission: FeaturedSubmission }> {
  return adminFetch<{ success: boolean; submission: FeaturedSubmission }>(
    `/api/admin/submissions/${encodeURIComponent(submissionId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify({ decision, reason })
    }
  );
}

export async function publishSubmissionToUniversityInstagram(
  submissionId: string,
  data: { targetInstagramHandle: string; customPostUrl?: string; studentName?: string; universityName?: string }
): Promise<{ success: boolean; message: string; publishedAt: string; instagramPostUrl: string; targetHandle: string }> {
  return adminFetch<{ success: boolean; message: string; publishedAt: string; instagramPostUrl: string; targetHandle: string }>(
    `/api/admin/submissions/${encodeURIComponent(submissionId)}/publish-instagram`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );
}

// 11. Student Management
export async function fetchAdminUsers(): Promise<{ users: User[]; count: number }> {
  return adminFetch<{ users: User[]; count: number }>('/api/admin/users');
}

// -----------------------------------------------------------------------------
// 12. CENTRALIZED EMAIL INFRASTRUCTURE & UNIVERSITY EMAIL MANAGEMENT
// -----------------------------------------------------------------------------

export async function fetchCentralEmailConfig(
  forceRefresh = false
): Promise<{ config: CentralEmailConfig; resendStatus?: ResendDomainStatus }> {
  return adminFetch<{ config: CentralEmailConfig; resendStatus?: ResendDomainStatus }>(
    forceRefresh ? '/api/admin/email/config?refresh=1' : '/api/admin/email/config'
  );
}

export async function updateCentralEmailConfig(
  updates: Partial<CentralEmailConfig>
): Promise<{ success: boolean; config: CentralEmailConfig; resendStatus?: ResendDomainStatus }> {
  return adminFetch<{ success: boolean; config: CentralEmailConfig; resendStatus?: ResendDomainStatus }>(
    '/api/admin/email/config',
    {
      method: 'POST',
      body: JSON.stringify(updates)
    }
  );
}

export async function fetchAllUniversityEmailIdentities(): Promise<{ identities: UniversityEmailIdentity[] }> {
  return adminFetch<{ identities: UniversityEmailIdentity[] }>('/api/admin/email/identities');
}

export async function fetchUniversityEmailIdentity(uniId: string): Promise<{ identity: UniversityEmailIdentity | null }> {
  return adminFetch<{ identity: UniversityEmailIdentity | null }>(
    `/api/admin/email/identities/${encodeURIComponent(uniId)}`
  );
}

export async function saveUniversityEmailIdentity(
  uniId: string,
  identity: Partial<UniversityEmailIdentity>
): Promise<{ success: boolean; identity: UniversityEmailIdentity }> {
  return adminFetch<{ success: boolean; identity: UniversityEmailIdentity }>(
    `/api/admin/email/identities/${encodeURIComponent(uniId)}`,
    {
      method: 'POST',
      body: JSON.stringify(identity)
    }
  );
}

export async function fetchUniversityEmailTemplates(uniId: string): Promise<{ templates: UniversityEmailTemplate[] }> {
  return adminFetch<{ templates: UniversityEmailTemplate[] }>(
    `/api/admin/email/templates/${encodeURIComponent(uniId)}`
  );
}

export async function saveUniversityEmailTemplate(
  uniId: string,
  template: Partial<UniversityEmailTemplate>
): Promise<{ success: boolean; template: UniversityEmailTemplate }> {
  return adminFetch<{ success: boolean; template: UniversityEmailTemplate }>(
    `/api/admin/email/templates/${encodeURIComponent(uniId)}`,
    {
      method: 'POST',
      body: JSON.stringify(template)
    }
  );
}

export async function resetUniversityEmailTemplate(
  uniId: string,
  eventType: UniversityEmailEventType
): Promise<{ success: boolean; message: string }> {
  return adminFetch<{ success: boolean; message: string }>(
    `/api/admin/email/templates/${encodeURIComponent(uniId)}/${encodeURIComponent(eventType)}`,
    {
      method: 'DELETE'
    }
  );
}

export async function previewEmailTemplate(params: {
  universityId?: string;
  eventType: UniversityEmailEventType;
  customTemplate?: Partial<UniversityEmailTemplate>;
  sampleVariables?: Record<string, any>;
}): Promise<{ success: boolean; subject: string; html: string }> {
  return adminFetch<{ success: boolean; subject: string; html: string }>('/api/admin/email/preview-template', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function sendTestUniversityEmail(params: {
  recipient?: string;
  universityId?: string;
  eventType?: UniversityEmailEventType;
  customVariables?: Record<string, any>;
}): Promise<{
  success: boolean;
  sandboxMode?: boolean;
  error?: string;
  message: string;
  log: DetailedEmailLog;
  diagnostic?: { provider: string; httpStatus?: number; providerResponse?: any };
  resendStatus?: ResendDomainStatus;
}> {
  return adminFetch('/api/admin/email/test-template', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function retryEmailLog(logId: string): Promise<{
  success: boolean;
  sandboxMode?: boolean;
  error?: string;
  message: string;
  log: DetailedEmailLog;
  diagnostic?: { provider: string; httpStatus?: number; providerResponse?: any };
  resendStatus?: ResendDomainStatus;
}> {
  return adminFetch(`/api/admin/email/logs/${encodeURIComponent(logId)}/retry`, { method: 'POST' });
}

export async function runAdminEmailDiagnostics(params?: {
  recipient?: string;
  universityId?: string;
  eventType?: UniversityEmailEventType;
  attemptTestSend?: boolean;
}): Promise<EmailDiagnosticReport> {
  return adminFetch<EmailDiagnosticReport>('/api/admin/email/diagnostics', {
    method: 'POST',
    body: JSON.stringify(params || {})
  });
}
