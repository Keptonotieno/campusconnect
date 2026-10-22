import { University, PaymentRecord, InstagramAccount, AuditLogItem } from '../types';

export interface AdminAuthResponse {
  success: boolean;
  message?: string;
  admin?: {
    id: string;
    email: string;
    role: 'Admin';
    expiresAt?: string;
  };
  token?: string;
  expiresAt?: string;
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
    status: 'CONNECTED' | 'STANDBY' | 'DEGRADED';
    verifiedAt: string;
    details: string;
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

// Token helper
const TOKEN_KEY = 'campusconnect_admin_token';

export function getStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

// Internal fetch wrapper with Bearer token & no-cache headers
async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAdminToken();
  const headers = new Headers(options.headers || {});
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}

// 1. Auth & Bootstrap
export async function getAdminStatus(): Promise<{ bootstrapped: boolean; adminCount: number }> {
  const res = await fetch('/api/auth/admin-status', {
    headers: { 'Cache-Control': 'no-store' }
  });
  return res.json();
}

export async function bootstrapAdmin(email: string, pass: string): Promise<AdminAuthResponse> {
  const data = await adminFetch<AdminAuthResponse>('/api/auth/bootstrap-admin', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass })
  });
  if (data.token) {
    setStoredAdminToken(data.token);
  }
  return data;
}

export async function loginAdmin(email: string, pass: string): Promise<AdminAuthResponse> {
  const data = await adminFetch<AdminAuthResponse>('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass })
  });
  if (data.token) {
    setStoredAdminToken(data.token);
  }
  return data;
}

export async function logoutAdmin(): Promise<{ success: boolean }> {
  try {
    await adminFetch<{ success: boolean }>('/api/auth/admin-logout', {
      method: 'POST'
    });
  } finally {
    setStoredAdminToken(null);
  }
  return { success: true };
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; admin?: any }> {
  try {
    return await adminFetch<{ authenticated: boolean; admin?: any }>('/api/auth/admin-me');
  } catch {
    setStoredAdminToken(null);
    return { authenticated: false };
  }
}

// 2. Overview
export async function fetchAdminOverview(): Promise<AdminOverviewData> {
  return adminFetch<AdminOverviewData>('/api/admin/overview');
}

// 3. Campuses
export async function fetchAdminCampuses(): Promise<{ campuses: University[] }> {
  return adminFetch<{ campuses: University[] }>('/api/admin/campuses');
}

export async function createAdminCampus(campusData: Partial<University>): Promise<{ success: boolean; campus: University; canonicalUrls: Record<string, string> }> {
  return adminFetch<{ success: boolean; campus: University; canonicalUrls: Record<string, string> }>('/api/admin/campuses', {
    method: 'POST',
    body: JSON.stringify(campusData)
  });
}

export async function updateAdminCampus(id: string, updates: Partial<University>): Promise<{ success: boolean; campus: University }> {
  return adminFetch<{ success: boolean; campus: University }>(`/api/admin/campuses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

// 4. Payments
export async function fetchAdminPayments(): Promise<{ payments: PaymentRecord[]; totals: { usd: number }; count: number }> {
  return adminFetch<{ payments: PaymentRecord[]; totals: { usd: number }; count: number }>('/api/admin/payments');
}

export async function simulateWebhookTest(payload: any): Promise<any> {
  return adminFetch<any>('/api/payments/webhook', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// 5. Instagram
export async function fetchAdminInstagram(): Promise<{ accounts: InstagramAccount[] }> {
  return adminFetch<{ accounts: InstagramAccount[] }>('/api/admin/instagram');
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

// 8. Public Campuses
export async function fetchPublicCampuses(): Promise<{ campuses: University[] }> {
  const res = await fetch('/api/campuses', {
    headers: { 'Cache-Control': 'no-cache' }
  });
  return res.json();
}

// 9. Production Integrations & API Keys
export interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: 'CONNECTED' | 'PENDING_CONFIGURATION' | 'DEGRADED';
  configured: boolean;
  lastVerifiedAt: string;
  details: string;
  keys: Record<string, string>;
}

export async function fetchAdminIntegrations(): Promise<{ integrations: IntegrationItem[] }> {
  return adminFetch<{ integrations: IntegrationItem[] }>('/api/admin/integrations');
}

export async function updateAdminIntegration(id: string, keys: Record<string, string>): Promise<{ success: boolean; message: string; integration: IntegrationItem }> {
  return adminFetch<{ success: boolean; message: string; integration: IntegrationItem }>(`/api/admin/integrations/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ keys })
  });
}

export async function testAdminIntegration(id: string): Promise<{ success: boolean; message: string; verifiedAt: string }> {
  return adminFetch<{ success: boolean; message: string; verifiedAt: string }>(`/api/admin/integrations/${encodeURIComponent(id)}/test`, {
    method: 'POST'
  });
}

// 10. Admin-Only University Instagram Publishing
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
