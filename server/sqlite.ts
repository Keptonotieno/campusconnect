import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { 
  University, 
  PaymentRecord, 
  InstagramAccount, 
  User, 
  AuditLogItem, 
  FeaturedSubmission,
  CentralEmailConfig,
  UniversityEmailIdentity,
  UniversityEmailTemplate,
  DetailedEmailLog,
  UniversityEmailEventType
} from '../src/types';
import { VERIFIED_UNIVERSITIES } from '../src/data/universities';

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

export type EmailDeliveryLog = DetailedEmailLog;
export type EmailConfig = CentralEmailConfig;

export interface IntegrationConfig {
  id: string;
  name: string;
  category: string;
  status: 'CONNECTED' | 'PENDING_CONFIGURATION' | 'DEGRADED' | 'NOT_CONFIGURED';
  configured: boolean;
  lastVerifiedAt: string | null;
  details: string;
  keys: Record<string, string>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'campusconnect.db');

export class SQLiteStorage {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.initPragmas();
    this.initTables();
    this.migrateFromJsonFiles();
  }

  private initPragmas() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Admin',
        created_at TEXT NOT NULL,
        last_login_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Admin',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS campuses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        cover_url TEXT,
        description TEXT,
        location TEXT,
        official_website_url TEXT,
        instagram_profile_url TEXT,
        instagram_handle TEXT,
        community_enabled INTEGER NOT NULL DEFAULT 1,
        student_count INTEGER DEFAULT 0,
        featured_count INTEGER DEFAULT 0,
        established TEXT,
        class_year TEXT,
        primary_color TEXT,
        accent_color TEXT,
        gradient_from TEXT,
        gradient_to TEXT,
        tagline TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        student_uid TEXT,
        student_name TEXT,
        student_email TEXT,
        university_id TEXT,
        university_name TEXT,
        university_slug TEXT,
        instagram_handle TEXT,
        payment_status TEXT NOT NULL DEFAULT 'UNPAID',
        payment_amount REAL DEFAULT 6.00,
        payment_currency TEXT DEFAULT 'USD',
        payment_reference TEXT,
        moderation_status TEXT NOT NULL DEFAULT 'PENDING',
        publishing_status TEXT NOT NULL DEFAULT 'NOT_READY',
        instagram_post_url TEXT,
        submitted_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        submission_id TEXT,
        student_uid TEXT,
        student_name TEXT,
        university_id TEXT,
        provider TEXT NOT NULL DEFAULT 'STRIPE',
        provider_transaction_reference TEXT,
        amount_usd REAL NOT NULL DEFAULT 6.00,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'PENDING',
        idempotency_key TEXT,
        verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS instagram_accounts (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        university_id TEXT,
        university_name TEXT,
        status TEXT NOT NULL DEFAULT 'CONNECTED',
        connected_at TEXT NOT NULL,
        follower_count INTEGER DEFAULT 0,
        profile_picture_url TEXT,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'Student',
        university_id TEXT,
        university_name TEXT,
        university_slug TEXT,
        student_verification_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        status TEXT NOT NULL,
        configured INTEGER NOT NULL DEFAULT 0,
        last_verified_at TEXT,
        details TEXT,
        keys_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_logs (
        id TEXT PRIMARY KEY,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        template TEXT NOT NULL,
        status TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        message_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor_uid TEXT NOT NULL,
        actor_email TEXT,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS central_email_config (
        id TEXT PRIMARY KEY DEFAULT 'central',
        provider TEXT NOT NULL DEFAULT 'SMTP',
        sender_email TEXT NOT NULL DEFAULT 'notifications@campusconnect.app',
        sender_name TEXT NOT NULL DEFAULT 'CampusConnect Global',
        reply_to TEXT DEFAULT 'support@campusconnect.app',
        sender_domain TEXT DEFAULT 'campusconnect.app',
        smtp_host TEXT DEFAULT 'smtp.mailgun.org',
        smtp_port INTEGER DEFAULT 587,
        smtp_user TEXT,
        smtp_pass TEXT,
        api_key TEXT,
        tls_enabled INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'OPERATIONAL',
        sending_enabled INTEGER NOT NULL DEFAULT 1,
        daily_limit INTEGER NOT NULL DEFAULT 5000,
        spf_verified INTEGER NOT NULL DEFAULT 1,
        dkim_verified INTEGER NOT NULL DEFAULT 1,
        dmarc_verified INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS university_email_identities (
        university_id TEXT PRIMARY KEY,
        university_slug TEXT NOT NULL,
        university_name TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        reply_to TEXT,
        logo_url TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        signature TEXT,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS university_email_templates (
        id TEXT PRIMARY KEY,
        university_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        preheader TEXT,
        headline TEXT,
        body_markdown TEXT NOT NULL,
        button_text TEXT,
        button_link TEXT,
        footer_text TEXT,
        is_custom INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_campuses_slug ON campuses(slug);
      CREATE INDEX IF NOT EXISTS idx_submissions_uni ON submissions(university_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_uid);
      CREATE INDEX IF NOT EXISTS idx_payments_sub ON payments(submission_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_email_identities_slug ON university_email_identities(university_slug);
      CREATE INDEX IF NOT EXISTS idx_email_templates_uni ON university_email_templates(university_id);
    `);
  }

  // Automated migration from legacy JSON files to SQLite on startup
  private migrateFromJsonFiles() {
    const readLegacy = <T>(file: string, fallback: T): T => {
      try {
        const p = path.join(DATA_DIR, file);
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          return JSON.parse(raw) as T;
        }
      } catch (e) {
        console.warn(`Could not parse ${file} for SQLite migration:`, e);
      }
      return fallback;
    };

    // 1. Migrate Admins
    const adminCount = (this.db.prepare('SELECT count(*) as c FROM admins').get() as { c: number }).c;
    if (adminCount === 0) {
      const legacyAdmins = readLegacy<AdminUser[]>('admins.json', []);
      const insertAdmin = this.db.prepare(`
        INSERT OR IGNORE INTO admins (id, email, password_hash, salt, role, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const trans = this.db.transaction((admins: AdminUser[]) => {
        for (const a of admins) {
          insertAdmin.run(a.id, a.email.toLowerCase(), a.passwordHash, a.salt, a.role || 'Admin', a.createdAt, a.lastLoginAt || null);
        }
      });
      trans(legacyAdmins);
    }

    // 2. Migrate Sessions
    const sessionCount = (this.db.prepare('SELECT count(*) as c FROM sessions').get() as { c: number }).c;
    if (sessionCount === 0) {
      const legacySessions = readLegacy<AdminSession[]>('sessions.json', []);
      const insertSess = this.db.prepare(`
        INSERT OR IGNORE INTO sessions (token, admin_id, email, role, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const trans = this.db.transaction((sessions: AdminSession[]) => {
        for (const s of sessions) {
          insertSess.run(s.token, s.adminId, s.email, s.role || 'Admin', s.createdAt, s.expiresAt);
        }
      });
      trans(legacySessions);
    }

    // 3. Migrate Campuses (Ensure all 31 verified campuses exist)
    const existingCampusCount = (this.db.prepare('SELECT count(*) as c FROM campuses').get() as { c: number }).c;
    const legacyCampuses = readLegacy<University[]>('campuses.json', []);
    const mergedCampusesMap = new Map<string, University>();

    for (const v of VERIFIED_UNIVERSITIES) {
      mergedCampusesMap.set(v.id, v);
    }
    for (const c of legacyCampuses) {
      mergedCampusesMap.set(c.id, c);
    }

    if (existingCampusCount < mergedCampusesMap.size) {
      const insertCampus = this.db.prepare(`
        INSERT OR REPLACE INTO campuses (
          id, name, slug, logo_url, cover_url, description, location,
          official_website_url, instagram_profile_url, instagram_handle,
          community_enabled, student_count, featured_count, established,
          class_year, primary_color, accent_color, gradient_from, gradient_to,
          tagline, created_at, updated_at, raw_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
      const trans = this.db.transaction((campuses: University[]) => {
        for (const c of campuses) {
          insertCampus.run(
            c.id,
            c.name,
            c.slug,
            c.logoUrl || null,
            c.coverUrl || null,
            c.description || null,
            c.location || null,
            c.officialWebsiteUrl || null,
            c.instagramProfileUrl || null,
            c.instagramHandle || null,
            c.communityEnabled !== false ? 1 : 0,
            c.studentCount || 0,
            c.featuredCount || 0,
            c.established || null,
            c.classYear || '2031',
            c.primaryColor || '#004B87',
            c.accentColor || '#0284C7',
            c.gradientFrom || null,
            c.gradientTo || null,
            c.tagline || null,
            c.createdAt || new Date().toISOString(),
            c.updatedAt || new Date().toISOString(),
            JSON.stringify(c)
          );
        }
      });
      trans(Array.from(mergedCampusesMap.values()));
    }

    // 4. Migrate Submissions
    const subCount = (this.db.prepare('SELECT count(*) as c FROM submissions').get() as { c: number }).c;
    if (subCount === 0) {
      const legacySubs = readLegacy<FeaturedSubmission[]>('submissions.json', []);
      const insertSub = this.db.prepare(`
        INSERT OR IGNORE INTO submissions (
          id, student_uid, student_name, student_email, university_id,
          university_name, university_slug, instagram_handle, payment_status,
          payment_amount, payment_currency, payment_reference, moderation_status,
          publishing_status, instagram_post_url, submitted_at, updated_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const trans = this.db.transaction((subs: FeaturedSubmission[]) => {
        for (const s of subs) {
          insertSub.run(
            s.id,
            s.studentUid,
            s.studentDisplayName || (s as any).studentName || null,
            s.studentEmail || null,
            s.universityId,
            s.universityName || null,
            s.universitySlug || null,
            s.instagramHandle || (s as any).personalInstagramHandle || null,
            s.paymentStatus,
            s.paymentAmount || 6.00,
            (s as any).paymentCurrency || 'USD',
            s.paymentReference || null,
            s.moderationStatus,
            s.publishingStatus,
            s.instagramPostUrl || null,
            s.submittedAt || new Date().toISOString(),
            s.updatedAt || new Date().toISOString(),
            JSON.stringify(s)
          );
        }
      });
      trans(legacySubs);
    }

    // 5. Migrate Payments
    const payCount = (this.db.prepare('SELECT count(*) as c FROM payments').get() as { c: number }).c;
    if (payCount === 0) {
      const legacyPays = readLegacy<PaymentRecord[]>('payments.json', []);
      const insertPay = this.db.prepare(`
        INSERT OR IGNORE INTO payments (
          id, submission_id, student_uid, student_name, university_id,
          provider, provider_transaction_reference, amount_usd, currency,
          status, idempotency_key, verified_at, created_at, updated_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const trans = this.db.transaction((pays: PaymentRecord[]) => {
        for (const p of pays) {
          insertPay.run(
            p.id,
            p.submissionId,
            p.studentUid,
            p.studentName || null,
            p.universityId,
            p.provider,
            p.providerTransactionReference || null,
            p.amountUsd,
            p.currency || 'USD',
            p.status,
            p.idempotencyKey || null,
            p.verifiedAt || null,
            p.createdAt,
            p.updatedAt,
            JSON.stringify(p)
          );
        }
      });
      trans(legacyPays);
    }

    // 6. Migrate Integrations
    const intCount = (this.db.prepare('SELECT count(*) as c FROM integrations').get() as { c: number }).c;
    if (intCount === 0) {
      const legacyInts = readLegacy<{ integrations: IntegrationConfig[] }>('integrations.json', { integrations: [] });
      const insertInt = this.db.prepare(`
        INSERT OR IGNORE INTO integrations (
          id, name, category, status, configured, last_verified_at, details, keys_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const trans = this.db.transaction((integrations: IntegrationConfig[]) => {
        for (const i of integrations) {
          insertInt.run(
            i.id,
            i.name,
            i.category || null,
            i.status,
            i.configured ? 1 : 0,
            i.lastVerifiedAt || null,
            i.details || null,
            JSON.stringify(i.keys || {})
          );
        }
      });
      trans(legacyInts.integrations || []);
    }

    // 7. Migrate Audit Logs
    const auditCount = (this.db.prepare('SELECT count(*) as c FROM audit_logs').get() as { c: number }).c;
    if (auditCount === 0) {
      const legacyAudits = readLegacy<AuditLogItem[]>('audit-logs.json', []);
      const insertAudit = this.db.prepare(`
        INSERT OR IGNORE INTO audit_logs (
          id, timestamp, actor_uid, actor_email, actor_role, action, target_type, target_id, details, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const trans = this.db.transaction((logs: AuditLogItem[]) => {
        for (const l of logs) {
          insertAudit.run(
            l.id,
            l.timestamp,
            l.actorUid,
            l.actorEmail || null,
            l.actorRole,
            l.action,
            l.targetType,
            l.targetId,
            l.details || null,
            JSON.stringify(l)
          );
        }
      });
      trans(legacyAudits);
    }
  }

  // --- ADMIMS ---
  public getAdminCount(): number {
    const row = this.db.prepare('SELECT count(*) as c FROM admins').get() as { c: number };
    return row ? row.c : 0;
  }

  public getAdmins(): AdminUser[] {
    const rows = this.db.prepare('SELECT * FROM admins ORDER BY created_at ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      salt: r.salt,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at || undefined
    }));
  }

  public getAdminByEmail(email: string): AdminUser | undefined {
    const clean = email.trim().toLowerCase();
    const r = this.db.prepare('SELECT * FROM admins WHERE email = ?').get(clean) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      salt: r.salt,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at || undefined
    };
  }

  public getAdminById(id: string): AdminUser | undefined {
    const r = this.db.prepare('SELECT * FROM admins WHERE id = ?').get(id) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      salt: r.salt,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at || undefined
    };
  }

  public insertAdmin(admin: AdminUser): AdminUser {
    this.db.prepare(`
      INSERT INTO admins (id, email, password_hash, salt, role, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      admin.id,
      admin.email.trim().toLowerCase(),
      admin.passwordHash,
      admin.salt,
      admin.role || 'Admin',
      admin.createdAt,
      admin.lastLoginAt || null
    );
    this.backupToJson('admins.json', this.getAdmins());
    return admin;
  }

  public updateAdminLogin(id: string, timestamp: string): void {
    this.db.prepare('UPDATE admins SET last_login_at = ? WHERE id = ?').run(timestamp, id);
    this.backupToJson('admins.json', this.getAdmins());
  }

  public updateAdminPassword(id: string, hash: string, salt: string): void {
    this.db.prepare('UPDATE admins SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, id);
    this.backupToJson('admins.json', this.getAdmins());
  }

  // --- SESSIONS ---
  public createSession(session: AdminSession): AdminSession {
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (token, admin_id, email, role, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(session.token, session.adminId, session.email, session.role || 'Admin', session.createdAt, session.expiresAt);
    this.backupToJson('sessions.json', this.getAllSessions());
    return session;
  }

  public getSession(token: string): AdminSession | null {
    if (!token) return null;
    const r = this.db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as any;
    if (!r) return null;
    return {
      token: r.token,
      adminId: r.admin_id,
      email: r.email,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      expiresAt: r.expires_at
    };
  }

  public deleteSession(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    this.backupToJson('sessions.json', this.getAllSessions());
  }

  public getAllSessions(): AdminSession[] {
    const rows = this.db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      token: r.token,
      adminId: r.admin_id,
      email: r.email,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      expiresAt: r.expires_at
    }));
  }

  // --- CAMPUSES ---
  public getAllCampuses(): University[] {
    const rows = this.db.prepare('SELECT raw_json FROM campuses ORDER BY name ASC').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as University);
  }

  public getCampusBySlug(slug: string): University | undefined {
    if (!slug) return undefined;
    const norm = slug.toLowerCase().trim().replace(/^@/, '').replace(/^\/ig\//, '');
    const row = this.db.prepare('SELECT raw_json FROM campuses WHERE lower(slug) = ? OR id = ?').get(norm, `uni_${norm.replace(/-/g, '_')}`) as { raw_json: string } | undefined;
    if (row) {
      return JSON.parse(row.raw_json) as University;
    }
    return undefined;
  }

  public getCampusById(id: string): University | undefined {
    const row = this.db.prepare('SELECT raw_json FROM campuses WHERE id = ?').get(id) as { raw_json: string } | undefined;
    if (row) {
      return JSON.parse(row.raw_json) as University;
    }
    return undefined;
  }

  public upsertCampus(campus: University): University {
    this.db.prepare(`
      INSERT OR REPLACE INTO campuses (
        id, name, slug, logo_url, cover_url, description, location,
        official_website_url, instagram_profile_url, instagram_handle,
        community_enabled, student_count, featured_count, established,
        class_year, primary_color, accent_color, gradient_from, gradient_to,
        tagline, created_at, updated_at, raw_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      campus.id,
      campus.name,
      campus.slug,
      campus.logoUrl || null,
      campus.coverUrl || null,
      campus.description || null,
      campus.location || null,
      campus.officialWebsiteUrl || null,
      campus.instagramProfileUrl || null,
      campus.instagramHandle || null,
      campus.communityEnabled !== false ? 1 : 0,
      campus.studentCount || 0,
      campus.featuredCount || 0,
      campus.established || null,
      campus.classYear || '2031',
      campus.primaryColor || '#004B87',
      campus.accentColor || '#0284C7',
      campus.gradientFrom || null,
      campus.gradientTo || null,
      campus.tagline || null,
      campus.createdAt || new Date().toISOString(),
      campus.updatedAt || new Date().toISOString(),
      JSON.stringify(campus)
    );
    this.backupToJson('campuses.json', this.getAllCampuses());
    return campus;
  }

  public deleteCampus(id: string): boolean {
    const info = this.db.prepare('DELETE FROM campuses WHERE id = ? OR slug = ?').run(id, id);
    this.backupToJson('campuses.json', this.getAllCampuses());
    return info.changes > 0;
  }

  // --- SUBMISSIONS ---
  public getAllSubmissions(): FeaturedSubmission[] {
    const rows = this.db.prepare('SELECT raw_json FROM submissions ORDER BY submitted_at DESC').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as FeaturedSubmission);
  }

  public getSubmissionById(id: string): FeaturedSubmission | undefined {
    const row = this.db.prepare('SELECT raw_json FROM submissions WHERE id = ?').get(id) as { raw_json: string } | undefined;
    if (row) {
      return JSON.parse(row.raw_json) as FeaturedSubmission;
    }
    return undefined;
  }

  public saveSubmission(raw: Partial<FeaturedSubmission> | any): FeaturedSubmission {
    const id = raw.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const studentUid = raw.studentUid || raw.userId || `std_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const studentDisplayName = raw.studentDisplayName || raw.studentName || 'Student';
    const studentEmail = raw.studentEmail || raw.email || null;
    const universitySlug = raw.universitySlug || (raw.universityId ? raw.universityId.replace(/^uni_/, '') : 'eku2031class');
    const universityId = raw.universityId || (universitySlug ? `uni_${universitySlug}` : 'uni_general');
    
    let universityName = raw.universityName;
    if (!universityName) {
      const uni = this.getCampusBySlug(universitySlug) || this.getCampusById(universityId);
      universityName = uni ? uni.name : 'Campus Community';
    }

    const instagramHandle = raw.instagramHandle || raw.personalInstagramHandle || '';
    const paymentStatus = raw.paymentStatus || 'UNPAID';
    const paymentAmount = typeof raw.paymentAmount === 'number' ? raw.paymentAmount : 6.00;
    const paymentCurrency = raw.paymentCurrency || 'USD';
    const paymentReference = raw.paymentReference || null;
    const moderationStatus = raw.moderationStatus || 'PENDING';
    const publishingStatus = raw.publishingStatus || 'NOT_READY';
    const instagramPostUrl = raw.instagramPostUrl || null;
    const submittedAt = raw.submittedAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const sub: FeaturedSubmission = {
      ...raw,
      id,
      studentUid,
      studentDisplayName,
      studentEmail: studentEmail || '',
      universityId,
      universityName,
      universitySlug,
      instagramHandle,
      paymentStatus,
      paymentAmount,
      moderationStatus,
      publishingStatus,
      submittedAt,
      updatedAt
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO submissions (
        id, student_uid, student_name, student_email, university_id,
        university_name, university_slug, instagram_handle, payment_status,
        payment_amount, payment_currency, payment_reference, moderation_status,
        publishing_status, instagram_post_url, submitted_at, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sub.id,
      sub.studentUid,
      sub.studentDisplayName || null,
      sub.studentEmail || null,
      sub.universityId,
      sub.universityName || null,
      sub.universitySlug || null,
      sub.instagramHandle || null,
      sub.paymentStatus,
      sub.paymentAmount || 6.00,
      paymentCurrency,
      paymentReference,
      sub.moderationStatus,
      sub.publishingStatus,
      instagramPostUrl,
      sub.submittedAt,
      sub.updatedAt,
      JSON.stringify(sub)
    );
    this.backupToJson('submissions.json', this.getAllSubmissions());
    return sub;
  }

  // --- PAYMENTS ---
  public getAllPayments(): PaymentRecord[] {
    const rows = this.db.prepare('SELECT raw_json FROM payments ORDER BY created_at DESC').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as PaymentRecord);
  }

  public recordPayment(raw: Partial<PaymentRecord> | any): PaymentRecord {
    const id = raw.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const submissionId = raw.submissionId || `sub_${Date.now()}`;
    const studentUid = raw.studentUid || `std_${Date.now()}`;
    const studentName = raw.studentName || 'Student';
    const universityId = raw.universityId || 'uni_general';
    const provider = raw.provider || 'STRIPE';
    const providerTransactionReference = raw.providerTransactionReference || null;
    const amountUsd = typeof raw.amountUsd === 'number' ? raw.amountUsd : 6.00;
    const currency = raw.currency || 'USD';
    const status = raw.status || 'PENDING';
    const idempotencyKey = raw.idempotencyKey || null;
    const verifiedAt = raw.verifiedAt || null;
    const createdAt = raw.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const p: PaymentRecord = {
      ...raw,
      id,
      submissionId,
      studentUid,
      studentName,
      universityId,
      provider,
      providerTransactionReference,
      amountUsd,
      currency,
      status,
      idempotencyKey,
      verifiedAt,
      createdAt,
      updatedAt
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO payments (
        id, submission_id, student_uid, student_name, university_id,
        provider, provider_transaction_reference, amount_usd, currency,
        status, idempotency_key, verified_at, created_at, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.id,
      p.submissionId,
      p.studentUid,
      p.studentName || null,
      p.universityId,
      p.provider,
      p.providerTransactionReference || null,
      p.amountUsd,
      p.currency || 'USD',
      p.status,
      p.idempotencyKey || null,
      p.verifiedAt || null,
      p.createdAt,
      p.updatedAt,
      JSON.stringify(p)
    );
    this.backupToJson('payments.json', this.getAllPayments());
    return p;
  }

  // --- REGISTERED USERS ---
  public getAllUsers(): User[] {
    const rows = this.db.prepare('SELECT raw_json FROM users ORDER BY created_at DESC').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as User);
  }

  public upsertUser(u: User): User {
    this.db.prepare(`
      INSERT OR REPLACE INTO users (
        id, name, email, role, university_id, university_name, university_slug,
        student_verification_status, created_at, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      u.id,
      u.name,
      u.email.toLowerCase().trim(),
      u.role || 'Student',
      u.universityId || null,
      u.universityName || null,
      u.universitySlug || null,
      u.studentVerificationStatus || 'UNVERIFIED',
      u.createdAt || new Date().toISOString(),
      u.updatedAt || new Date().toISOString(),
      JSON.stringify(u)
    );
    this.backupToJson('users.json', this.getAllUsers());
    return u;
  }

  // --- INSTAGRAM ACCOUNTS ---
  public getAllInstagramAccounts(): InstagramAccount[] {
    const rows = this.db.prepare('SELECT raw_json FROM instagram_accounts ORDER BY connected_at DESC').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as InstagramAccount);
  }

  public upsertInstagramAccount(acc: InstagramAccount): InstagramAccount {
    this.db.prepare(`
      INSERT OR REPLACE INTO instagram_accounts (
        id, username, university_id, university_name, status,
        connected_at, follower_count, profile_picture_url, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acc.id,
      acc.username,
      (acc as any).universityId || null,
      (acc as any).universityName || null,
      acc.status || 'CONNECTED',
      acc.connectedAt || new Date().toISOString(),
      acc.followersCount || 0,
      acc.profilePictureUrl || null,
      JSON.stringify(acc)
    );
    this.backupToJson('instagram.json', this.getAllInstagramAccounts());
    return acc;
  }

  // --- INTEGRATIONS ---
  public getAllIntegrations(): IntegrationConfig[] {
    const rows = this.db.prepare('SELECT * FROM integrations').all() as any[];
    return rows.map(r => {
      const keys = JSON.parse(r.keys_json || '{}');
      let status = r.status;
      let configured = Boolean(r.configured);

      if (r.id === 'email_transactional') {
        const resendKey = (
          process.env.RESEND_API_KEY ||
          process.env.RESEND_KEY ||
          process.env.RESEND_APIKEY ||
          process.env.RESEND_SECRET ||
          process.env.RESEND_TOKEN ||
          process.env.EMAIL_API_KEY ||
          process.env.TRANSACTIONAL_EMAIL_API_KEY ||
          keys.apiKey ||
          keys.resendApiKey ||
          ''
        ).trim();

        const webhookSec = (
          process.env.RESEND_WEBHOOK_SECRET ||
          process.env.EMAIL_WEBHOOK_SECRET ||
          process.env.WEBHOOK_SECRET ||
          keys.webhookSecret ||
          keys.resendWebhookSecret ||
          ''
        ).trim();

        if (resendKey) {
          configured = true;
          if (status === 'NOT_CONFIGURED') status = 'CONNECTED';
          keys.apiKey = resendKey;
          keys.provider = 'RESEND';
        }
        if (webhookSec) {
          keys.webhookSecret = webhookSec;
        }
      }

      return {
        id: r.id,
        name: r.name,
        category: r.category || 'General',
        status,
        configured,
        lastVerifiedAt: r.last_verified_at,
        details: r.details || '',
        keys
      };
    });
  }

  public upsertIntegration(config: IntegrationConfig): IntegrationConfig {
    this.db.prepare(`
      INSERT OR REPLACE INTO integrations (
        id, name, category, status, configured, last_verified_at, details, keys_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      config.id,
      config.name,
      config.category || 'General',
      config.status,
      config.configured ? 1 : 0,
      config.lastVerifiedAt || null,
      config.details || '',
      JSON.stringify(config.keys || {})
    );
    this.backupToJson('integrations.json', { integrations: this.getAllIntegrations() });
    return config;
  }

  // --- EMAIL LOGS ---
  public getAllEmailLogs(): EmailDeliveryLog[] {
    const rows = this.db.prepare('SELECT raw_json FROM email_logs ORDER BY sent_at DESC LIMIT 500').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as EmailDeliveryLog);
  }

  public insertEmailLog(log: EmailDeliveryLog): EmailDeliveryLog {
    this.db.prepare(`
      INSERT INTO email_logs (id, recipient, subject, template, status, sent_at, message_id, provider, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.recipient,
      log.subject,
      log.template,
      log.status,
      log.sentAt,
      log.messageId,
      log.provider,
      JSON.stringify(log)
    );
    this.backupToJson('email-logs.json', this.getAllEmailLogs());
    return log;
  }

  public updateEmailLogStatus(
    messageIdOrId: string, 
    status: 'BOUNCED' | 'DELIVERED' | 'FAILED' | 'QUEUED', 
    errorMessage?: string, 
    extraMetadata?: Record<string, any>
  ): EmailDeliveryLog | null {
    if (!messageIdOrId) return null;
    const cleanId = messageIdOrId.trim();

    const row = this.db.prepare(`
      SELECT id, raw_json FROM email_logs 
      WHERE id = ? 
         OR message_id = ? 
         OR message_id LIKE ? 
         OR message_id LIKE ?
      LIMIT 1
    `).get(cleanId, cleanId, `%${cleanId}%`, `<%${cleanId}%>`) as { id: string; raw_json: string } | undefined;

    if (!row || !row.raw_json) return null;

    try {
      const parsed = JSON.parse(row.raw_json) as EmailDeliveryLog;
      parsed.status = status;
      if (errorMessage !== undefined) {
        parsed.errorMessage = errorMessage;
      }
      if (extraMetadata) {
        parsed.metadata = { ...(parsed.metadata || {}), ...extraMetadata };
      }

      const updatedJson = JSON.stringify(parsed);

      this.db.prepare(`
        UPDATE email_logs 
        SET status = ?, raw_json = ? 
        WHERE id = ?
      `).run(status, updatedJson, row.id);

      this.backupToJson('email-logs.json', this.getAllEmailLogs());
      return parsed;
    } catch {
      return null;
    }
  }

  // --- CENTRAL EMAIL CONFIGURATION ---
  public getCentralEmailConfig(): CentralEmailConfig {
    const defaultConfig: CentralEmailConfig = {
      provider: 'SMTP',
      senderEmail: 'notifications@campusconnect.app',
      senderName: 'CampusConnect Global',
      replyTo: 'support@campusconnect.app',
      senderDomain: 'campusconnect.app',
      smtpHost: 'smtp.mailgun.org',
      smtpPort: 587,
      smtpUser: 'postmaster@campusconnect.app',
      smtpPass: '',
      apiKey: '',
      tlsEnabled: true,
      status: 'OPERATIONAL',
      sendingEnabled: true,
      dailyLimit: 5000,
      spfVerified: true,
      dkimVerified: true,
      dmarcVerified: true,
      updatedAt: new Date().toISOString()
    };

    let config: CentralEmailConfig;
    const row = this.db.prepare('SELECT raw_json FROM central_email_config WHERE id = ?').get('central') as { raw_json: string } | undefined;
    if (row && row.raw_json) {
      try {
        config = JSON.parse(row.raw_json) as CentralEmailConfig;
      } catch {
        config = { ...defaultConfig };
      }
    } else {
      config = { ...defaultConfig };
    }

    // Auto-detect and overlay Resend API key or SMTP from environment secrets
    const resendKey = (
      process.env.RESEND_API_KEY ||
      process.env.RESEND_KEY ||
      process.env.RESEND_APIKEY ||
      process.env.RESEND_SECRET ||
      process.env.RESEND_TOKEN ||
      process.env.EMAIL_API_KEY ||
      process.env.TRANSACTIONAL_EMAIL_API_KEY ||
      ''
    ).trim();
    if (resendKey) {
      config.apiKey = resendKey;
      config.provider = 'RESEND';
    }
    if (process.env.SMTP_HOST) {
      config.smtpHost = process.env.SMTP_HOST;
      if (process.env.SMTP_PORT) config.smtpPort = parseInt(process.env.SMTP_PORT, 10);
      if (process.env.SMTP_USER) config.smtpUser = process.env.SMTP_USER;
      if (process.env.SMTP_PASSWORD) config.smtpPass = process.env.SMTP_PASSWORD;
    }
    if (process.env.SMTP_SENDER_EMAIL) {
      config.senderEmail = process.env.SMTP_SENDER_EMAIL;
    }
    if (process.env.SMTP_SENDER_NAME) {
      config.senderName = process.env.SMTP_SENDER_NAME;
    }

    return config;
  }

  public saveCentralEmailConfig(updates: Partial<CentralEmailConfig>): CentralEmailConfig {
    const row = this.db.prepare('SELECT raw_json FROM central_email_config WHERE id = ?').get('central') as { raw_json: string } | undefined;
    let base: CentralEmailConfig = {
      provider: 'SMTP',
      senderEmail: 'notifications@campusconnect.app',
      senderName: 'CampusConnect Global',
      replyTo: 'support@campusconnect.app',
      senderDomain: 'campusconnect.app',
      smtpHost: 'smtp.mailgun.org',
      smtpPort: 587,
      smtpUser: 'postmaster@campusconnect.app',
      smtpPass: '',
      apiKey: '',
      tlsEnabled: true,
      status: 'OPERATIONAL',
      sendingEnabled: true,
      dailyLimit: 5000,
      spfVerified: true,
      dkimVerified: true,
      dmarcVerified: true,
      updatedAt: new Date().toISOString()
    };

    if (row && row.raw_json) {
      try {
        base = { ...base, ...JSON.parse(row.raw_json) };
      } catch {}
    }

    const updated: CentralEmailConfig = {
      ...base,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO central_email_config (
        id, provider, sender_email, sender_name, reply_to, sender_domain,
        smtp_host, smtp_port, smtp_user, smtp_pass, api_key, tls_enabled,
        status, sending_enabled, daily_limit, spf_verified, dkim_verified,
        dmarc_verified, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'central',
      updated.provider,
      updated.senderEmail,
      updated.senderName,
      updated.replyTo || null,
      updated.senderDomain,
      updated.smtpHost || null,
      updated.smtpPort || 587,
      updated.smtpUser || null,
      updated.smtpPass || null,
      updated.apiKey || null,
      updated.tlsEnabled ? 1 : 0,
      updated.status,
      updated.sendingEnabled ? 1 : 0,
      updated.dailyLimit || 5000,
      updated.spfVerified ? 1 : 0,
      updated.dkimVerified ? 1 : 0,
      updated.dmarcVerified ? 1 : 0,
      updated.updatedAt,
      JSON.stringify(updated)
    );

    this.backupToJson('email-config.json', updated);
    return updated;
  }

  // --- UNIVERSITY EMAIL IDENTITIES ---
  public getAllUniversityEmailIdentities(): UniversityEmailIdentity[] {
    const rows = this.db.prepare('SELECT raw_json FROM university_email_identities ORDER BY university_name ASC').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as UniversityEmailIdentity);
  }

  public getUniversityEmailIdentity(uniId: string): UniversityEmailIdentity | null {
    const row = this.db.prepare('SELECT raw_json FROM university_email_identities WHERE university_id = ? OR university_slug = ?').get(uniId, uniId) as { raw_json: string } | undefined;
    if (row && row.raw_json) {
      try {
        return JSON.parse(row.raw_json) as UniversityEmailIdentity;
      } catch {}
    }
    return null;
  }

  public saveUniversityEmailIdentity(identity: UniversityEmailIdentity): UniversityEmailIdentity {
    const updated = {
      ...identity,
      updatedAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO university_email_identities (
        university_id, university_slug, university_name, sender_name,
        sender_email, reply_to, logo_url, primary_color, secondary_color,
        signature, is_enabled, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      updated.universityId,
      updated.universitySlug,
      updated.universityName,
      updated.senderName,
      updated.senderEmail,
      updated.replyTo || null,
      updated.logoUrl || null,
      updated.primaryColor || null,
      updated.secondaryColor || null,
      updated.signature || null,
      updated.isEnabled ? 1 : 0,
      updated.updatedAt,
      JSON.stringify(updated)
    );

    this.backupToJson('university-email-identities.json', this.getAllUniversityEmailIdentities());
    return updated;
  }

  // --- UNIVERSITY EMAIL TEMPLATES ---
  public getUniversityEmailTemplates(uniId: string): UniversityEmailTemplate[] {
    const rows = this.db.prepare('SELECT raw_json FROM university_email_templates WHERE university_id = ?').all(uniId) as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as UniversityEmailTemplate);
  }

  public getUniversityEmailTemplate(uniId: string, eventType: string): UniversityEmailTemplate | null {
    const id = `${uniId}_${eventType}`;
    const row = this.db.prepare('SELECT raw_json FROM university_email_templates WHERE id = ?').get(id) as { raw_json: string } | undefined;
    if (row && row.raw_json) {
      try {
        return JSON.parse(row.raw_json) as UniversityEmailTemplate;
      } catch {}
    }
    return null;
  }

  public saveUniversityEmailTemplate(tpl: UniversityEmailTemplate): UniversityEmailTemplate {
    const id = `${tpl.universityId}_${tpl.eventType}`;
    const updated = {
      ...tpl,
      id,
      updatedAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO university_email_templates (
        id, university_id, event_type, subject, preheader, headline,
        body_markdown, button_text, button_link, footer_text, is_custom,
        updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      updated.universityId,
      updated.eventType,
      updated.subject,
      updated.preheader || null,
      updated.headline || null,
      updated.bodyMarkdown,
      updated.buttonText || null,
      updated.buttonLink || null,
      updated.footerText || null,
      updated.isCustom ? 1 : 0,
      updated.updatedAt,
      JSON.stringify(updated)
    );

    return updated;
  }

  public deleteUniversityEmailTemplate(uniId: string, eventType: string): boolean {
    const id = `${uniId}_${eventType}`;
    this.db.prepare('DELETE FROM university_email_templates WHERE id = ?').run(id);
    return true;
  }

  public getEmailLogById(id: string): DetailedEmailLog | null {
    if (!id) return null;
    const row = this.db.prepare('SELECT raw_json FROM email_logs WHERE id = ?').get(id) as { raw_json: string } | undefined;
    if (row && row.raw_json) {
      try {
        return JSON.parse(row.raw_json) as DetailedEmailLog;
      } catch {}
    }
    return null;
  }

  public findEmailLogByIdempotency(key: string): DetailedEmailLog | null {
    if (!key) return null;
    const rows = this.db
      .prepare('SELECT raw_json FROM email_logs WHERE raw_json LIKE ? ORDER BY sent_at DESC LIMIT 20')
      .all(`%${key}%`) as { raw_json: string }[];
    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.raw_json) as DetailedEmailLog;
        if (parsed.idempotencyKey === key) {
          return parsed;
        }
      } catch {}
    }
    return null;
  }

  public hasVerifiedExternalResendDelivery(): boolean {
    const rows = this.db
      .prepare("SELECT raw_json FROM email_logs WHERE provider = 'RESEND' AND status = 'DELIVERED' ORDER BY sent_at DESC LIMIT 100")
      .all() as { raw_json: string }[];
    for (const r of rows) {
      try {
        const log = JSON.parse(r.raw_json) as DetailedEmailLog;
        if (log?.metadata?.verifiedDomainUsed === true && !log?.metadata?.sandboxMode) {
          return true;
        }
      } catch {}
    }
    return false;
  }

  // --- AUDIT LOGS ---
  public getAllAuditLogs(): AuditLogItem[] {
    const rows = this.db.prepare('SELECT raw_json FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as AuditLogItem);
  }

  public insertAuditLog(log: AuditLogItem): AuditLogItem {
    this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor_uid, actor_email, actor_role, action, target_type, target_id, details, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.timestamp,
      log.actorUid,
      log.actorEmail || null,
      log.actorRole,
      log.action,
      log.targetType,
      log.targetId,
      log.details || null,
      JSON.stringify(log)
    );
    this.backupToJson('audit-logs.json', this.getAllAuditLogs());
    return log;
  }

  // Dual-write snapshot backup to JSON file for zero-data-loss redundancy
  private backupToJson(filename: string, data: any): void {
    try {
      const filePath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`Dual-write backup to ${filename} failed:`, err);
    }
  }

  public close(): void {
    this.db.close();
  }
}

export const sqliteStorage = new SQLiteStorage();
