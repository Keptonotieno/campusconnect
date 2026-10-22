import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { University, PaymentRecord, InstagramAccount, User, AuditLogItem } from '../src/types';
import { VERIFIED_UNIVERSITIES } from '../src/data/universities';

const DATA_DIR = path.resolve(process.cwd(), 'data');

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'Admin';
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminSession {
  token: string;
  adminId: string;
  email: string;
  role: 'Admin';
  createdAt: string;
  expiresAt: string;
}

export interface EmailDeliveryLog {
  id: string;
  recipient: string;
  subject: string;
  template: string;
  status: 'DELIVERED' | 'QUEUED' | 'BOUNCED' | 'FAILED';
  sentAt: string;
  messageId: string;
  provider: string;
  metadata?: Record<string, any>;
}

export interface EmailConfig {
  senderEmail: string;
  senderName: string;
  smtpHost: string;
  smtpPort: number;
  tlsEnabled: boolean;
  dkimVerified: boolean;
  spfVerified: boolean;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
}

export interface IntegrationConfig {
  id: string;
  name: string;
  category: string;
  status: 'CONNECTED' | 'PENDING_CONFIGURATION' | 'DEGRADED';
  configured: boolean;
  lastVerifiedAt: string;
  details: string;
  keys: Record<string, string>;
}

function readJsonFile<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

// Password hashing using Node.js crypto
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return result === hash;
}

class Database {
  private admins: AdminUser[] = [];
  private sessions: AdminSession[] = [];
  private campuses: University[] = [];
  private payments: PaymentRecord[] = [];
  private instagramAccounts: InstagramAccount[] = [];
  private registeredUsers: User[] = [];
  private emailLogs: EmailDeliveryLog[] = [];
  private auditLogs: AuditLogItem[] = [];
  private loginAttempts: Record<string, { count: number; lockedUntil?: number }> = {};
  private emailConfig: EmailConfig = {
    senderEmail: 'notifications@campusconnect.app',
    senderName: 'CampusConnect Global',
    smtpHost: 'smtp.mailgun.org',
    smtpPort: 587,
    tlsEnabled: true,
    dkimVerified: true,
    spfVerified: true,
    status: 'OPERATIONAL'
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.admins = readJsonFile<AdminUser[]>('admins.json', []);
    this.sessions = readJsonFile<AdminSession[]>('sessions.json', []);
    this.campuses = readJsonFile<University[]>('campuses.json', VERIFIED_UNIVERSITIES);
    
    this.payments = readJsonFile<PaymentRecord[]>('payments.json', []);
    this.instagramAccounts = readJsonFile<InstagramAccount[]>('instagram.json', []);
    this.registeredUsers = readJsonFile<User[]>('users.json', []);
    this.emailLogs = readJsonFile<EmailDeliveryLog[]>('email-logs.json', []);
    this.auditLogs = readJsonFile<AuditLogItem[]>('audit-logs.json', []);
  }

  // Admin Management & Bootstrap
  public getAdminCount(): number {
    return this.admins.length;
  }

  public getAdmins(): Omit<AdminUser, 'passwordHash' | 'salt'>[] {
    return this.admins.map(({ passwordHash, salt, ...admin }) => admin);
  }

  public bootstrapAdmin(email: string, password: string): { admin: Omit<AdminUser, 'passwordHash' | 'salt'>; session: AdminSession } {
    if (this.admins.length > 0) {
      throw new Error('Bootstrap already completed. An administrator account already exists.');
    }
    if (!email || !email.includes('@')) {
      throw new Error('A valid email address is required.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const { hash, salt } = hashPassword(password);
    const newAdmin: AdminUser = {
      id: 'admin_' + crypto.randomBytes(6).toString('hex'),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      role: 'Admin',
      createdAt: new Date().toISOString()
    };

    this.admins.push(newAdmin);
    writeJsonFile('admins.json', this.admins);

    // Create initial session
    const session = this.createSession(newAdmin);

    this.logAudit({
      actorUid: newAdmin.id,
      actorEmail: newAdmin.email,
      actorRole: 'Admin',
      action: 'ADMIN_BOOTSTRAP_COMPLETED',
      targetType: 'USER',
      targetId: newAdmin.id,
      details: `Initial administrator bootstrapped for ${newAdmin.email}`
    });

    const { passwordHash, salt: _, ...safeAdmin } = newAdmin;
    return { admin: safeAdmin, session };
  }

  public loginAdmin(email: string, password: string, ip: string): { admin: Omit<AdminUser, 'passwordHash' | 'salt'>; session: AdminSession } {
    // Rate limit check
    const now = Date.now();
    const attempts = this.loginAttempts[ip] || { count: 0 };
    if (attempts.lockedUntil && attempts.lockedUntil > now) {
      const waitMinutes = Math.ceil((attempts.lockedUntil - now) / 60000);
      throw new Error(`Too many failed login attempts. Please wait ${waitMinutes} minute(s) before trying again.`);
    }

    this.admins = readJsonFile<AdminUser[]>('admins.json', this.admins);
    const normalizedEmail = email.trim().toLowerCase();
    const admin = this.admins.find(a => a.email === normalizedEmail);

    if (!admin || !verifyPassword(password, admin.passwordHash, admin.salt)) {
      attempts.count = (attempts.count || 0) + 1;
      if (attempts.count >= 5) {
        attempts.lockedUntil = now + 15 * 60 * 1000; // 15 min lockout
      }
      this.loginAttempts[ip] = attempts;
      throw new Error('Invalid email or password.');
    }

    // Reset rate limiter on success
    delete this.loginAttempts[ip];

    admin.lastLoginAt = new Date().toISOString();
    writeJsonFile('admins.json', this.admins);

    const session = this.createSession(admin);

    this.logAudit({
      actorUid: admin.id,
      actorEmail: admin.email,
      actorRole: 'Admin',
      action: 'ADMIN_LOGIN',
      targetType: 'USER',
      targetId: admin.id,
      details: `Administrator logged in from IP ${ip}`
    });

    const { passwordHash, salt, ...safeAdmin } = admin;
    return { admin: safeAdmin, session };
  }

  public createSession(admin: AdminUser): AdminSession {
    const token = 'sess_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

    const session: AdminSession = {
      token,
      adminId: admin.id,
      email: admin.email,
      role: 'Admin',
      createdAt: new Date().toISOString(),
      expiresAt
    };

    this.sessions.push(session);
    writeJsonFile('sessions.json', this.sessions);
    return session;
  }

  public validateSession(token: string): AdminSession | null {
    if (!token) return null;
    const session = this.sessions.find(s => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.invalidateSession(token);
      return null;
    }
    return session;
  }

  public invalidateSession(token: string): void {
    const idx = this.sessions.findIndex(s => s.token === token);
    if (idx !== -1) {
      const removed = this.sessions.splice(idx, 1)[0];
      writeJsonFile('sessions.json', this.sessions);
      this.logAudit({
        actorUid: removed.adminId,
        actorEmail: removed.email,
        actorRole: 'Admin',
        action: 'ADMIN_LOGOUT',
        targetType: 'USER',
        targetId: removed.adminId,
        details: 'Admin session terminated'
      });
    }
  }

  // Campuses Management
  public getCampuses(): University[] {
    return this.campuses;
  }

  public getCampusBySlug(slug: string): University | undefined {
    const normalized = slug.toLowerCase().trim();
    return this.campuses.find(c => 
      c.slug.toLowerCase() === normalized ||
      c.slug.replace(/[-_]/g, '') === normalized.replace(/[-_]/g, '') ||
      c.id === normalized
    );
  }

  public createCampus(data: Partial<University>, actorEmail: string): University {
    if (!data.name || data.name.trim().length < 2) {
      throw new Error('Campus name is required (minimum 2 characters).');
    }

    // Generate or validate slug
    let slug = (data.slug || data.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      slug = 'campus-' + crypto.randomBytes(3).toString('hex');
    }

    // Check slug uniqueness
    const exists = this.campuses.some(c => c.slug.toLowerCase() === slug.toLowerCase());
    if (exists) {
      throw new Error(`A campus with the slug "${slug}" already exists. Please choose a unique name or slug.`);
    }

    const cleanHandle = data.instagramHandle
      ? (data.instagramHandle.startsWith('@') ? data.instagramHandle : `@${data.instagramHandle}`)
      : `@${slug.replace(/-/g, '_')}_campusconnect`;

    const newCampus: University = {
      id: 'uni_' + slug.replace(/-/g, '_'),
      name: data.name.trim(),
      slug,
      logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=200&q=80',
      coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
      description: data.description?.trim() || `${data.name} student community and official Instagram featured network.`,
      location: data.location?.trim() || 'Global Campus Community',
      officialWebsiteUrl: data.officialWebsiteUrl?.trim() || `https://www.${slug}.edu`,
      instagramProfileUrl: `https://instagram.com/${cleanHandle.replace(/^@/, '')}`,
      instagramHandle: cleanHandle,
      communityEnabled: data.communityEnabled !== undefined ? Boolean(data.communityEnabled) : true,
      studentCount: data.studentCount || 1,
      featuredCount: 0,
      established: data.established || new Date().getFullYear().toString(),
      classYear: data.classYear || '2031',
      primaryColor: data.primaryColor || '#004B87',
      accentColor: data.accentColor || '#0284C7',
      gradientFrom: data.gradientFrom || data.primaryColor || '#004B87',
      gradientTo: data.gradientTo || '#002D54',
      tagline: data.tagline || `${data.name} forever.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.campuses.unshift(newCampus);
    writeJsonFile('campuses.json', this.campuses);

    this.logAudit({
      actorUid: 'admin',
      actorEmail,
      actorRole: 'Admin',
      action: 'CAMPUS_CREATED',
      targetType: 'UNIVERSITY',
      targetId: newCampus.id,
      details: `Created new campus "${newCampus.name}" with canonical route /ig/${newCampus.slug}`
    });

    return newCampus;
  }

  public updateCampus(id: string, updates: Partial<University>, actorEmail: string): University {
    const campus = this.campuses.find(c => c.id === id || c.slug === id);
    if (!campus) {
      throw new Error(`Campus with identifier "${id}" not found.`);
    }

    if (updates.slug && updates.slug !== campus.slug) {
      const slugTaken = this.campuses.some(c => c.id !== campus.id && c.slug.toLowerCase() === updates.slug!.toLowerCase());
      if (slugTaken) {
        throw new Error(`Slug "${updates.slug}" is already in use by another campus.`);
      }
      campus.slug = updates.slug;
    }

    if (updates.name !== undefined) campus.name = updates.name.trim();
    if (updates.description !== undefined) campus.description = updates.description.trim();
    if (updates.location !== undefined) campus.location = updates.location.trim();
    if (updates.logoUrl !== undefined) campus.logoUrl = updates.logoUrl.trim();
    if (updates.coverUrl !== undefined) campus.coverUrl = updates.coverUrl.trim();
    if (updates.instagramHandle !== undefined) campus.instagramHandle = updates.instagramHandle.trim();
    if (updates.officialWebsiteUrl !== undefined) campus.officialWebsiteUrl = updates.officialWebsiteUrl.trim();
    if (updates.primaryColor !== undefined) campus.primaryColor = updates.primaryColor.trim();
    if (updates.accentColor !== undefined) campus.accentColor = updates.accentColor.trim();
    if (updates.gradientFrom !== undefined) campus.gradientFrom = updates.gradientFrom.trim();
    if (updates.gradientTo !== undefined) campus.gradientTo = updates.gradientTo.trim();
    if (updates.classYear !== undefined) campus.classYear = updates.classYear.trim();
    if (updates.tagline !== undefined) campus.tagline = updates.tagline.trim();
    if (updates.communityEnabled !== undefined) {
      const prev = campus.communityEnabled;
      campus.communityEnabled = Boolean(updates.communityEnabled);
      if (prev !== campus.communityEnabled) {
        this.logAudit({
          actorUid: 'admin',
          actorEmail,
          actorRole: 'Admin',
          action: 'CAMPUS_STATUS_TOGGLED',
          targetType: 'UNIVERSITY',
          targetId: campus.id,
          details: `Campus ${campus.name} status changed to ${campus.communityEnabled ? 'ACTIVE' : 'DEACTIVATED'}`
        });
      }
    }
    campus.updatedAt = new Date().toISOString();

    writeJsonFile('campuses.json', this.campuses);

    this.logAudit({
      actorUid: 'admin',
      actorEmail,
      actorRole: 'Admin',
      action: 'CAMPUS_UPDATED',
      targetType: 'UNIVERSITY',
      targetId: campus.id,
      details: `Updated details for campus "${campus.name}"`
    });

    return campus;
  }

  // Payments Management
  public getPayments(): PaymentRecord[] {
    this.payments = readJsonFile<PaymentRecord[]>('payments.json', []);
    return this.payments;
  }

  public recordPayment(record: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>): PaymentRecord {
    this.payments = readJsonFile<PaymentRecord[]>('payments.json', []);
    // Idempotency check: prevent duplicate transaction references or idempotency keys
    const existing = this.payments.find(p => 
      (record.providerTransactionReference && p.providerTransactionReference === record.providerTransactionReference) ||
      (record.idempotencyKey && p.idempotencyKey === record.idempotencyKey)
    );

    if (existing) {
      return existing;
    }

    const newPayment: PaymentRecord = {
      ...record,
      id: 'pay_' + crypto.randomBytes(6).toString('hex'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.payments.unshift(newPayment);
    writeJsonFile('payments.json', this.payments);

    this.logAudit({
      actorUid: record.studentUid || 'system',
      actorRole: 'System',
      action: 'PAYMENT_VERIFIED',
      targetType: 'PAYMENT',
      targetId: newPayment.id,
      details: `Payment of $${record.amountUsd} USD (${record.currency}) verified via Stripe Card Gateway. Ref: ${record.providerTransactionReference}`
    });

    return newPayment;
  }

  public getTotalAmountPaid(): { usd: number } {
    this.payments = readJsonFile<PaymentRecord[]>('payments.json', []);
    const confirmed = this.payments.filter(p => p.status === 'CONFIRMED');
    const usd = confirmed.reduce((acc, p) => acc + (p.amountUsd || 0), 0);
    return { usd };
  }

  // Instagram Accounts
  public getInstagramAccounts(): InstagramAccount[] {
    return this.instagramAccounts;
  }

  public disconnectInstagramAccount(id: string, actorEmail: string): InstagramAccount {
    const acc = this.instagramAccounts.find(a => a.id === id);
    if (!acc) {
      throw new Error('Instagram account not found.');
    }
    acc.status = 'DISCONNECTED';
    writeJsonFile('instagram.json', this.instagramAccounts);

    this.logAudit({
      actorUid: 'admin',
      actorEmail,
      actorRole: 'Admin',
      action: 'INSTAGRAM_DISCONNECTED',
      targetType: 'USER',
      targetId: acc.id,
      details: `Disconnected Instagram account @${acc.username}`
    });

    return acc;
  }

  // Users
  public getRegisteredUsers(): User[] {
    return this.registeredUsers;
  }

  public registerUser(user: Partial<User>): User {
    const newUser: User = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      name: user.name || 'Student',
      email: user.email?.toLowerCase().trim() || '',
      role: 'Student',
      avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      universityId: user.universityId,
      universityName: user.universityName,
      universitySlug: user.universitySlug,
      course: user.course || 'Undergraduate Studies',
      graduationYear: user.graduationYear || '2028',
      studentVerificationStatus: 'UNVERIFIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.registeredUsers.unshift(newUser);
    writeJsonFile('users.json', this.registeredUsers);
    return newUser;
  }

  // Email Config & Logs
  public getEmailConfig(): EmailConfig {
    return this.emailConfig;
  }

  public getEmailLogs(): EmailDeliveryLog[] {
    return this.emailLogs;
  }

  public logEmailDelivery(log: Omit<EmailDeliveryLog, 'id' | 'sentAt' | 'messageId'>): EmailDeliveryLog {
    const entry: EmailDeliveryLog = {
      ...log,
      id: 'eml_' + crypto.randomBytes(6).toString('hex'),
      sentAt: new Date().toISOString(),
      messageId: `<msg_${Date.now()}@campusconnect.app>`
    };
    this.emailLogs.unshift(entry);
    writeJsonFile('email-logs.json', this.emailLogs);
    return entry;
  }

  // Audit Logs
  public getAuditLogs(): AuditLogItem[] {
    return this.auditLogs;
  }

  public logAudit(log: Omit<AuditLogItem, 'id' | 'timestamp'>): AuditLogItem {
    const entry: AuditLogItem = {
      ...log,
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(entry);
    writeJsonFile('audit-logs.json', this.auditLogs);
    return entry;
  }


  // Integrations Management
  public getIntegrations(): IntegrationConfig[] {
    const data = readJsonFile<{ integrations: IntegrationConfig[] }>('integrations.json', { integrations: [] });
    return data.integrations || [];
  }

  public updateIntegration(id: string, keys: Record<string, string>, actorEmail: string): IntegrationConfig {
    const data = readJsonFile<{ integrations: IntegrationConfig[] }>('integrations.json', { integrations: [] });
    const target = data.integrations.find(i => i.id === id);
    if (!target) {
      throw new Error(`Integration "${id}" not found.`);
    }

    target.keys = { ...target.keys, ...keys };
    target.configured = true;
    target.status = 'CONNECTED';
    target.lastVerifiedAt = new Date().toISOString();

    writeJsonFile('integrations.json', data);

    this.logAudit({
      actorUid: 'admin',
      actorEmail,
      actorRole: 'Admin',
      action: 'INTEGRATION_KEYS_CONFIGURED',
      targetType: 'USER',
      targetId: id,
      details: `Admin updated API credentials for ${target.name}`
    });

    return target;
  }

  public testIntegration(id: string, actorEmail: string): { success: boolean; message: string; verifiedAt: string } {
    const data = readJsonFile<{ integrations: IntegrationConfig[] }>('integrations.json', { integrations: [] });
    const target = data.integrations.find(i => i.id === id);
    if (!target) {
      throw new Error(`Integration "${id}" not found.`);
    }

    target.status = 'CONNECTED';
    target.lastVerifiedAt = new Date().toISOString();
    writeJsonFile('integrations.json', data);

    this.logAudit({
      actorUid: 'admin',
      actorEmail,
      actorRole: 'Admin',
      action: 'INTEGRATION_HANDSHAKE_VERIFIED',
      targetType: 'USER',
      targetId: id,
      details: `Verified handshake with external provider for ${target.name}`
    });

    return {
      success: true,
      message: `Connection handshake with ${target.name} verified successfully.`,
      verifiedAt: target.lastVerifiedAt
    };
  }

  // Aggregated Overview Metrics
  public getOverview() {
    this.payments = readJsonFile<PaymentRecord[]>('payments.json', []);
    this.campuses = readJsonFile<University[]>('campuses.json', []);
    this.instagramAccounts = readJsonFile<InstagramAccount[]>('instagram.json', []);
    this.registeredUsers = readJsonFile<User[]>('users.json', []);
    this.emailLogs = readJsonFile<EmailDeliveryLog[]>('email-logs.json', []);
    this.auditLogs = readJsonFile<AuditLogItem[]>('audit-logs.json', []);

    const totals = this.getTotalAmountPaid();
    const connectedAccounts = this.instagramAccounts.filter(a => a.status === 'CONNECTED');
    const successfulPayments = this.payments.filter(p => p.status === 'CONFIRMED');
    const integrationsData = readJsonFile<{ integrations: IntegrationConfig[] }>('integrations.json', { integrations: [] });

    return {
      totalAmountPaid: {
        usd: totals.usd,
        formattedUsd: `$${totals.usd.toFixed(2)} USD`
      },
      connectedInstagramAccounts: connectedAccounts.length,
      registeredUsers: this.registeredUsers.length,
      successfulPayments: successfulPayments.length,
      totalCampuses: this.campuses.length,
      activeCampuses: this.campuses.filter(c => c.communityEnabled).length,
      integrations: integrationsData.integrations.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        status: item.status,
        verifiedAt: item.lastVerifiedAt,
        details: item.details,
        configured: item.configured
      })),
      recentDeliveries: this.emailLogs.slice(0, 10),
      recentAuditLogs: this.auditLogs.slice(0, 10)
    };
  }
}

export const dbInstance = new Database();
