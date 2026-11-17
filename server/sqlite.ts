import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  DetailedEmailLog
} from '../src/types';
import { VERIFIED_UNIVERSITIES } from '../src/data/universities';
import { encryptSecret, decryptSecret, sha256Hex, hmacSha256Hex } from './security';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'Admin';
  createdAt: string;
  lastLoginAt?: string;
  mfaEnabled?: boolean;
  totpSecretEnc?: string;
  backupCodesHashJson?: string;
  failedLoginCount?: number;
  lockedUntil?: string;
  passwordUpdatedAt?: string;
}

export interface AdminSession {
  token: string;
  adminId: string;
  email: string;
  role: 'Admin';
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  mfaVerified?: boolean;
}

export interface UserSession {
  userId: string;
  email: string;
  role: 'Student';
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
}

export interface SecurityEvent {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  eventType: string;
  actorEmail?: string;
  ipAddress?: string;
  details: string;
  createdAt: string;
}

export interface UploadedFileRecord {
  id: string;
  ownerUid: string;
  universityId?: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
  sizeBytes: number;
  sha256: string;
  isPublic: boolean;
  createdAt: string;
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
    this.ensureSchemaMigrations();
    this.migrateFromJsonFiles();
    this.cleanupSensitiveJsonArtifacts();
  }

  private initPragmas() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
  }

  private ensureColumn(table: string, column: string, definition: string) {
    const cols = this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some(c => c.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  private ensureSchemaMigrations() {
    this.ensureColumn('admins', 'mfa_enabled', 'INTEGER NOT NULL DEFAULT 0');
    this.ensureColumn('admins', 'totp_secret_enc', 'TEXT');
    this.ensureColumn('admins', 'backup_codes_hash_json', 'TEXT');
    this.ensureColumn('admins', 'failed_login_count', 'INTEGER NOT NULL DEFAULT 0');
    this.ensureColumn('admins', 'locked_until', 'TEXT');
    this.ensureColumn('admins', 'password_updated_at', 'TEXT');

    this.ensureColumn('sessions', 'ip_address', 'TEXT');
    this.ensureColumn('sessions', 'mfa_verified', 'INTEGER NOT NULL DEFAULT 1');

    this.ensureColumn('audit_logs', 'prev_hash', 'TEXT');
    this.ensureColumn('audit_logs', 'entry_hash', 'TEXT');
  }

  private cleanupSensitiveJsonArtifacts() {
    const sensitiveFiles = [
      'admins.json',
      'sessions.json',
      'users.json',
      'integrations.json',
      'email-config.json'
    ];
    for (const file of sensitiveFiles) {
      const p = path.join(DATA_DIR, file);
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      } catch {
        // ignore cleanup failure
      }
    }
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

      CREATE TABLE IF NOT EXISTS auth_tokens (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        type TEXT NOT NULL,
        token_or_code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS central_email_config (
        id TEXT PRIMARY KEY DEFAULT 'central',
        provider TEXT NOT NULL DEFAULT 'RESEND',
        sender_email TEXT NOT NULL DEFAULT 'notifications@campusconnect.app',
        sender_name TEXT NOT NULL DEFAULT 'CampusConnect Global',
        reply_to TEXT DEFAULT 'support@campusconnect.app',
        sender_domain TEXT DEFAULT 'campusconnect.app',
        smtp_host TEXT DEFAULT '',
        smtp_port INTEGER DEFAULT 587,
        smtp_user TEXT DEFAULT '',
        smtp_pass TEXT,
        api_key TEXT,
        tls_enabled INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'DEGRADED',
        sending_enabled INTEGER NOT NULL DEFAULT 1,
        daily_limit INTEGER NOT NULL DEFAULT 5000,
        spf_verified INTEGER NOT NULL DEFAULT 0,
        dkim_verified INTEGER NOT NULL DEFAULT 0,
        dmarc_verified INTEGER NOT NULL DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS user_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Student',
        ip_address TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        window_reset_at INTEGER NOT NULL,
        locked_until INTEGER
      );

      CREATE TABLE IF NOT EXISTS security_events (
        id TEXT PRIMARY KEY,
        severity TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_email TEXT,
        ip_address TEXT,
        details TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mfa_challenges (
        challenge_id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        email TEXT NOT NULL,
        ip_address TEXT,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS used_totp_steps (
        admin_id TEXT NOT NULL,
        step INTEGER NOT NULL,
        used_at TEXT NOT NULL,
        PRIMARY KEY (admin_id, step)
      );

      CREATE TABLE IF NOT EXISTS uploaded_files (
        id TEXT PRIMARY KEY,
        owner_uid TEXT NOT NULL,
        university_id TEXT,
        mime_type TEXT NOT NULL,
        ext TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        is_public INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_campuses_slug ON campuses(slug);
      CREATE INDEX IF NOT EXISTS idx_submissions_uni ON submissions(university_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_uid);
      CREATE INDEX IF NOT EXISTS idx_payments_sub ON payments(submission_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_ref_unique ON payments(provider_transaction_reference)
        WHERE provider_transaction_reference IS NOT NULL AND provider_transaction_reference != '';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_unique ON payments(idempotency_key)
        WHERE idempotency_key IS NOT NULL AND idempotency_key != '';
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_uid ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_identities_slug ON university_email_identities(university_slug);
      CREATE INDEX IF NOT EXISTS idx_email_templates_uni ON university_email_templates(university_id);
      CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_owner ON uploaded_files(owner_uid);
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

    // Purge any known compromised legacy backdoor password hash from admins table
    const LEGACY_BACKDOOR_HASH =
      '35ccecf09a2bf467713f8ac92907f8f8adc4645ebb6b465298403db9574de02b4b32a9cb7c600cf3265429d15989117d4cf0bd7bbdeac84a123d45a8ce6ab74e';
    this.db.prepare('DELETE FROM admins WHERE password_hash = ?').run(LEGACY_BACKDOOR_HASH);

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

    // 6. Migrate Integrations (with built-in defaults if integrations.json is not present)
    const intCount = (this.db.prepare('SELECT count(*) as c FROM integrations').get() as { c: number }).c;
    if (intCount === 0) {
      const defaultIntegrations: IntegrationConfig[] = [
        {
          id: 'payment_stripe',
          name: 'Stripe Gateway',
          category: 'Payment Processing',
          status: 'NOT_CONFIGURED',
          configured: false,
          lastVerifiedAt: null,
          details: 'Processes student $6.00 feature fees with 256-bit SSL encryption. Requires Stripe publishable and secret keys to activate live checkouts.',
          keys: { publishableKey: '', secretKey: '', webhookSecret: '' }
        },
        {
          id: 'firebase_firestore',
          name: 'Firebase Firestore & Auth',
          category: 'Persistent Database & Identity',
          status: 'CONNECTED',
          configured: true,
          lastVerifiedAt: new Date().toISOString(),
          details: 'Authoritative cloud database with granular RBAC security rules.',
          keys: {
            projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
            databaseId: process.env.VITE_FIREBASE_DATABASE_ID || '',
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || ''
          }
        },
        {
          id: 'email_transactional',
          name: 'Transactional Email Service',
          category: 'Notifications & Verification',
          status: 'NOT_CONFIGURED',
          configured: false,
          lastVerifiedAt: null,
          details: 'Centralized Resend & SMTP transactional email service for university-branded student notifications.',
          keys: {
            provider: 'RESEND',
            smtpHost: '',
            smtpPort: '587',
            smtpUser: '',
            smtpPassword: '',
            senderEmail: 'notifications@campusconnect.app',
            senderName: 'CampusConnect Global',
            apiKey: '',
            webhookSecret: '',
            resendApiKey: ''
          }
        }
      ];
      const legacyInts = readLegacy<{ integrations: IntegrationConfig[] }>('integrations.json', { integrations: defaultIntegrations });
      const rawSeedList = (legacyInts.integrations && legacyInts.integrations.length > 0)
        ? legacyInts.integrations
        : defaultIntegrations;
      const seedList = rawSeedList.filter(i => i.id !== 'meta_instagram');
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
      trans(seedList);
    }

    // Ensure obsolete Meta Instagram integration requirement is removed from existing databases
    this.db.prepare("DELETE FROM integrations WHERE id = 'meta_instagram'").run();

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

  // --- ADMINS ---
  public getAdminCount(): number {
    const row = this.db.prepare('SELECT count(*) as c FROM admins').get() as { c: number };
    return row ? row.c : 0;
  }

  private mapAdminRow(r: any): AdminUser {
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      salt: r.salt,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at || undefined,
      mfaEnabled: Boolean(r.mfa_enabled),
      totpSecretEnc: r.totp_secret_enc || undefined,
      backupCodesHashJson: r.backup_codes_hash_json || undefined,
      failedLoginCount: r.failed_login_count || 0,
      lockedUntil: r.locked_until || undefined,
      passwordUpdatedAt: r.password_updated_at || undefined
    };
  }

  public getAdmins(): AdminUser[] {
    const rows = this.db.prepare('SELECT * FROM admins ORDER BY created_at ASC').all() as any[];
    return rows.map(r => this.mapAdminRow(r));
  }

  public getAdminByEmail(email: string): AdminUser | undefined {
    const clean = email.trim().toLowerCase();
    const r = this.db.prepare('SELECT * FROM admins WHERE email = ?').get(clean) as any;
    return r ? this.mapAdminRow(r) : undefined;
  }

  public getAdminById(id: string): AdminUser | undefined {
    const r = this.db.prepare('SELECT * FROM admins WHERE id = ?').get(id) as any;
    return r ? this.mapAdminRow(r) : undefined;
  }

  public insertAdmin(admin: AdminUser): AdminUser {
    this.db.prepare(`
      INSERT INTO admins (
        id, email, password_hash, salt, role, created_at, last_login_at,
        mfa_enabled, totp_secret_enc, backup_codes_hash_json, failed_login_count, locked_until, password_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      admin.id,
      admin.email.trim().toLowerCase(),
      admin.passwordHash,
      admin.salt,
      admin.role || 'Admin',
      admin.createdAt,
      admin.lastLoginAt || null,
      admin.mfaEnabled ? 1 : 0,
      admin.totpSecretEnc || null,
      admin.backupCodesHashJson || null,
      admin.failedLoginCount || 0,
      admin.lockedUntil || null,
      admin.passwordUpdatedAt || admin.createdAt
    );
    return admin;
  }

  public updateAdminLogin(id: string, timestamp: string): void {
    this.db.prepare('UPDATE admins SET last_login_at = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?').run(timestamp, id);
  }

  public recordAdminFailedLogin(id: string, failedCount: number, lockedUntil: string | null): void {
    this.db.prepare('UPDATE admins SET failed_login_count = ?, locked_until = ? WHERE id = ?').run(failedCount, lockedUntil, id);
  }

  public updateAdminPassword(id: string, hash: string, salt: string): void {
    this.db.prepare('UPDATE admins SET password_hash = ?, salt = ?, password_updated_at = ? WHERE id = ?')
      .run(hash, salt, new Date().toISOString(), id);
  }

  public updateAdminMfa(
    id: string,
    mfaEnabled: boolean,
    totpSecretEnc: string | null,
    backupCodesHashJson: string | null
  ): void {
    this.db.prepare('UPDATE admins SET mfa_enabled = ?, totp_secret_enc = ?, backup_codes_hash_json = ? WHERE id = ?')
      .run(mfaEnabled ? 1 : 0, totpSecretEnc, backupCodesHashJson, id);
  }

  public updateAdminBackupCodes(id: string, backupCodesHashJson: string): void {
    this.db.prepare('UPDATE admins SET backup_codes_hash_json = ? WHERE id = ?').run(backupCodesHashJson, id);
  }

  // --- ADMIN SESSIONS (Hashed token at rest) ---
  public createSession(session: AdminSession): AdminSession {
    const tokenHash = sha256Hex(session.token);
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (token, admin_id, email, role, created_at, expires_at, ip_address, mfa_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tokenHash,
      session.adminId,
      session.email,
      session.role || 'Admin',
      session.createdAt,
      session.expiresAt,
      session.ipAddress || null,
      session.mfaVerified !== false ? 1 : 0
    );
    return session;
  }

  public getSession(rawToken: string): AdminSession | null {
    if (!rawToken) return null;
    const tokenHash = sha256Hex(rawToken);
    const r = this.db.prepare('SELECT * FROM sessions WHERE token = ?').get(tokenHash) as any;
    if (!r) return null;
    return {
      token: rawToken,
      adminId: r.admin_id,
      email: r.email,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      ipAddress: r.ip_address || undefined,
      mfaVerified: r.mfa_verified !== 0
    };
  }

  public deleteSession(rawToken: string): void {
    if (!rawToken) return;
    const tokenHash = sha256Hex(rawToken);
    this.db.prepare('DELETE FROM sessions WHERE token = ?').run(tokenHash);
  }

  public deleteAdminSessionsForAdmin(adminId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(adminId);
  }

  public getAllSessions(): AdminSession[] {
    const rows = this.db.prepare('SELECT admin_id, email, role, created_at, expires_at, ip_address, mfa_verified FROM sessions ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      token: '[REDACTED]',
      adminId: r.admin_id,
      email: r.email,
      role: r.role as 'Admin',
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      ipAddress: r.ip_address || undefined,
      mfaVerified: r.mfa_verified !== 0
    }));
  }

  // --- STUDENT USER SESSIONS (Hashed token at rest) ---
  public createUserSession(
    rawToken: string,
    userId: string,
    email: string,
    ipAddress: string,
    expiresAt: string
  ): void {
    const tokenHash = sha256Hex(rawToken);
    this.db.prepare(`
      INSERT OR REPLACE INTO user_sessions (token_hash, user_id, email, role, ip_address, created_at, expires_at)
      VALUES (?, ?, ?, 'Student', ?, ?, ?)
    `).run(tokenHash, userId, email.toLowerCase().trim(), ipAddress, new Date().toISOString(), expiresAt);
  }

  public getUserSession(rawToken: string): UserSession | null {
    if (!rawToken) return null;
    const tokenHash = sha256Hex(rawToken);
    const r = this.db.prepare('SELECT * FROM user_sessions WHERE token_hash = ?').get(tokenHash) as any;
    if (!r) return null;
    if (new Date(r.expires_at).getTime() < Date.now()) {
      this.db.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(tokenHash);
      return null;
    }
    return {
      userId: r.user_id,
      email: r.email,
      role: 'Student',
      ipAddress: r.ip_address || undefined,
      createdAt: r.created_at,
      expiresAt: r.expires_at
    };
  }

  public deleteUserSession(rawToken: string): void {
    if (!rawToken) return;
    this.db.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(sha256Hex(rawToken));
  }

  public deleteUserSessionsForUser(userId: string): void {
    this.db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
  }

  // --- PERSISTENT RATE LIMITS & LOCKOUTS ---
  public consumeRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number,
    lockoutMs = windowMs
  ): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const row = this.db.prepare('SELECT count, window_reset_at, locked_until FROM rate_limits WHERE key = ?').get(key) as
      | { count: number; window_reset_at: number; locked_until: number | null }
      | undefined;

    if (row && row.locked_until && row.locked_until > now) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((row.locked_until - now) / 1000))
      };
    }

    if (!row || row.window_reset_at <= now) {
      this.db.prepare(`
        INSERT OR REPLACE INTO rate_limits (key, count, window_reset_at, locked_until)
        VALUES (?, 1, ?, NULL)
      `).run(key, now + windowMs);
      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - 1),
        retryAfterSeconds: 0
      };
    }

    const nextCount = row.count + 1;
    if (nextCount > maxAttempts) {
      const lockUntil = now + lockoutMs;
      this.db.prepare('UPDATE rate_limits SET count = ?, locked_until = ? WHERE key = ?')
        .run(nextCount, lockUntil, key);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(lockoutMs / 1000))
      };
    }

    this.db.prepare('UPDATE rate_limits SET count = ? WHERE key = ?').run(nextCount, key);
    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - nextCount),
      retryAfterSeconds: 0
    };
  }

  public resetRateLimit(key: string): void {
    this.db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
  }

  // --- MFA CHALLENGES & TOTP REPLAY GUARD ---
  public createMfaChallenge(challengeId: string, adminId: string, email: string, ipAddress: string, ttlMinutes = 5): void {
    const challengeHash = sha256Hex(challengeId);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    this.db.prepare('UPDATE mfa_challenges SET used = 1 WHERE admin_id = ? AND used = 0').run(adminId);
    this.db.prepare(`
      INSERT INTO mfa_challenges (challenge_id, admin_id, email, ip_address, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(challengeHash, adminId, email.toLowerCase().trim(), ipAddress, expiresAt, new Date().toISOString());
  }

  public getMfaChallenge(challengeId: string): { adminId: string; email: string; ipAddress?: string } | null {
    if (!challengeId) return null;
    const challengeHash = sha256Hex(challengeId);
    const r = this.db.prepare('SELECT admin_id, email, ip_address, expires_at, used FROM mfa_challenges WHERE challenge_id = ?').get(challengeHash) as any;
    if (!r || r.used === 1) return null;
    if (new Date(r.expires_at).getTime() < Date.now()) return null;
    return { adminId: r.admin_id, email: r.email, ipAddress: r.ip_address || undefined };
  }

  public markMfaChallengeUsed(challengeId: string): void {
    if (!challengeId) return;
    this.db.prepare('UPDATE mfa_challenges SET used = 1 WHERE challenge_id = ?').run(sha256Hex(challengeId));
  }

  public markTotpStepUsed(adminId: string, step: number): boolean {
    try {
      this.db.prepare('INSERT INTO used_totp_steps (admin_id, step, used_at) VALUES (?, ?, ?)')
        .run(adminId, step, new Date().toISOString());
      return true;
    } catch {
      return false; // Replay rejected
    }
  }

  // --- SECURITY EVENTS ---
  public insertSecurityEvent(evt: SecurityEvent): SecurityEvent {
    this.db.prepare(`
      INSERT INTO security_events (id, severity, event_type, actor_email, ip_address, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(evt.id, evt.severity, evt.eventType, evt.actorEmail || null, evt.ipAddress || null, evt.details, evt.createdAt);
    return evt;
  }

  public getSecurityEvents(limit = 100): SecurityEvent[] {
    const rows = this.db.prepare('SELECT * FROM security_events ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      severity: r.severity,
      eventType: r.event_type,
      actorEmail: r.actor_email || undefined,
      ipAddress: r.ip_address || undefined,
      details: r.details || '',
      createdAt: r.created_at
    }));
  }

  // --- UPLOADED FILES METADATA ---
  public insertUploadedFile(rec: UploadedFileRecord): UploadedFileRecord {
    this.db.prepare(`
      INSERT OR REPLACE INTO uploaded_files (id, owner_uid, university_id, mime_type, ext, size_bytes, sha256, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rec.id,
      rec.ownerUid,
      rec.universityId || null,
      rec.mimeType,
      rec.ext,
      rec.sizeBytes,
      rec.sha256,
      rec.isPublic ? 1 : 0,
      rec.createdAt
    );
    return rec;
  }

  public getUploadedFile(id: string): UploadedFileRecord | null {
    const r = this.db.prepare('SELECT * FROM uploaded_files WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      ownerUid: r.owner_uid,
      universityId: r.university_id || undefined,
      mimeType: r.mime_type,
      ext: r.ext,
      sizeBytes: r.size_bytes,
      sha256: r.sha256,
      isPublic: Boolean(r.is_public),
      createdAt: r.created_at
    };
  }

  public markUploadedFilePublic(id: string): void {
    this.db.prepare('UPDATE uploaded_files SET is_public = 1 WHERE id = ?').run(id);
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

  public getUserByEmail(email: string): (User & { passwordHash?: string; passwordSalt?: string }) | null {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    const row = this.db.prepare('SELECT raw_json FROM users WHERE email = ? LIMIT 1').get(clean) as { raw_json: string } | undefined;
    if (!row?.raw_json) return null;
    try {
      return JSON.parse(row.raw_json);
    } catch {
      return null;
    }
  }

  public getUserById(id: string): (User & { passwordHash?: string; passwordSalt?: string }) | null {
    if (!id) return null;
    const row = this.db.prepare('SELECT raw_json FROM users WHERE id = ? LIMIT 1').get(id) as { raw_json: string } | undefined;
    if (!row?.raw_json) return null;
    try {
      return JSON.parse(row.raw_json);
    } catch {
      return null;
    }
  }

  public upsertUser(u: User & { passwordHash?: string; passwordSalt?: string }): User {
    const cleanEmail = u.email.toLowerCase().trim();
    const existing = this.getUserByEmail(cleanEmail);
    const merged = {
      ...existing,
      ...u,
      id: u.id || existing?.id || `usr_${crypto.randomBytes(8).toString('hex')}`,
      email: cleanEmail,
      passwordHash: u.passwordHash || existing?.passwordHash,
      passwordSalt: u.passwordSalt || existing?.passwordSalt,
      updatedAt: new Date().toISOString()
    };
    this.db.prepare(`
      INSERT OR REPLACE INTO users (
        id, name, email, role, university_id, university_name, university_slug,
        student_verification_status, created_at, updated_at, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      merged.id,
      merged.name,
      merged.email,
      merged.role || 'Student',
      merged.universityId || null,
      merged.universityName || null,
      merged.universitySlug || null,
      merged.studentVerificationStatus || 'UNVERIFIED',
      merged.createdAt || new Date().toISOString(),
      merged.updatedAt,
      JSON.stringify(merged)
    );
    return merged;
  }

  // --- AUTH VERIFICATION & PASSWORD RESET TOKENS (Hashed at rest) ---
  public createAuthToken(
    email: string,
    type: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    tokenOrCode: string,
    ttlMinutes = 30
  ): void {
    const cleanEmail = email.toLowerCase().trim();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
    const id = `tok_${crypto.randomBytes(8).toString('hex')}`;
    const hashedValue = sha256Hex(`${type}:${cleanEmail}:${tokenOrCode.trim()}`);
    this.db.prepare('UPDATE auth_tokens SET used = 1 WHERE email = ? AND type = ? AND used = 0').run(cleanEmail, type);
    this.db.prepare(`
      INSERT INTO auth_tokens (id, email, type, token_or_code, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(id, cleanEmail, type, hashedValue, expiresAt, now.toISOString());
  }

  public verifyAndConsumeAuthToken(
    email: string,
    type: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    tokenOrCode: string
  ): boolean {
    const cleanEmail = email.toLowerCase().trim();
    const cleanValue = tokenOrCode.trim();
    if (!cleanEmail || !cleanValue) return false;
    const hashedValue = sha256Hex(`${type}:${cleanEmail}:${cleanValue}`);
    const row = this.db.prepare(`
      SELECT id, expires_at, used FROM auth_tokens
      WHERE email = ? AND type = ? AND token_or_code = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(cleanEmail, type, hashedValue) as { id: string; expires_at: string; used: number } | undefined;

    if (!row || row.used === 1) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;

    this.db.prepare('UPDATE auth_tokens SET used = 1 WHERE id = ?').run(row.id);
    return true;
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

  private static readonly INTEGRATION_SECRET_FIELDS = new Set([
    'apiKey',
    'resendApiKey',
    'smtpPassword',
    'secretKey',
    'webhookSecret',
    'resendWebhookSecret',
    'appSecret',
    'accessToken',
    'webhookVerifyToken'
  ]);

  // --- INTEGRATIONS (Encrypted secret fields at rest) ---
  public getAllIntegrations(): IntegrationConfig[] {
    const rows = this.db.prepare('SELECT * FROM integrations').all() as any[];
    return rows.map(r => {
      const rawKeys = JSON.parse(r.keys_json || '{}');
      const keys: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawKeys)) {
        keys[k] = typeof v === 'string' && SQLiteStorage.INTEGRATION_SECRET_FIELDS.has(k)
          ? decryptSecret(v)
          : String(v ?? '');
      }
      let status = r.status;
      let configured = Boolean(r.configured);

      if (r.id === 'payment_stripe') {
        const envPub = (process.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
        const envSec = (process.env.STRIPE_SECRET_KEY || '').trim();
        const envHook = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
        if (envPub && !keys.publishableKey) keys.publishableKey = envPub;
        if (envSec && !keys.secretKey) keys.secretKey = envSec;
        if (envHook && !keys.webhookSecret) keys.webhookSecret = envHook;
        if (keys.publishableKey && keys.secretKey) {
          configured = true;
          if (status === 'NOT_CONFIGURED') status = 'CONNECTED';
        }
      }

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
    const cleanKeys = { ...(config.keys || {}) };
    if (config.id === 'email_transactional') {
      const envResend = (process.env.RESEND_API_KEY || '').trim();
      const envWebhook = (process.env.RESEND_WEBHOOK_SECRET || '').trim();
      if (envResend && cleanKeys.apiKey === envResend) cleanKeys.apiKey = '';
      if (envResend && cleanKeys.resendApiKey === envResend) cleanKeys.resendApiKey = '';
      if (envWebhook && cleanKeys.webhookSecret === envWebhook) cleanKeys.webhookSecret = '';
    }
    const encryptedKeys: Record<string, string> = {};
    for (const [k, v] of Object.entries(cleanKeys)) {
      if (typeof v === 'string' && v.trim() && SQLiteStorage.INTEGRATION_SECRET_FIELDS.has(k)) {
        encryptedKeys[k] = encryptSecret(v);
      } else {
        encryptedKeys[k] = String(v ?? '');
      }
    }

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
      JSON.stringify(encryptedKeys)
    );
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
      provider: 'RESEND',
      senderEmail: 'notifications@campusconnect.app',
      senderName: 'CampusConnect Global',
      replyTo: 'support@campusconnect.app',
      senderDomain: 'campusconnect.app',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      apiKey: '',
      tlsEnabled: true,
      status: 'DEGRADED',
      sendingEnabled: true,
      dailyLimit: 5000,
      spfVerified: false,
      dkimVerified: false,
      dmarcVerified: false,
      updatedAt: new Date().toISOString()
    };

    let config: CentralEmailConfig;
    const row = this.db.prepare('SELECT raw_json FROM central_email_config WHERE id = ?').get('central') as { raw_json: string } | undefined;
    if (row && row.raw_json) {
      try {
        config = { ...defaultConfig, ...JSON.parse(row.raw_json) };
      } catch {
        config = { ...defaultConfig };
      }
    } else {
      config = { ...defaultConfig };
    }

    // Migrate legacy unconfigured Mailgun/SMTP seed row to honest unconfigured RESEND defaults
    if (
      config.provider === 'SMTP' &&
      !(config.smtpPass || '').trim() &&
      !(config.apiKey || '').trim() &&
      (!config.smtpHost || config.smtpHost === 'smtp.mailgun.org')
    ) {
      config.provider = 'RESEND';
      config.smtpHost = '';
      config.smtpUser = '';
      config.status = 'DEGRADED';
      config.spfVerified = false;
      config.dkimVerified = false;
      config.dmarcVerified = false;
    }

    // Decrypt persisted credentials before returning to server callers
    if (config.smtpPass) config.smtpPass = decryptSecret(config.smtpPass);
    if (config.apiKey) config.apiKey = decryptSecret(config.apiKey);

    // Fallback to integrations['email_transactional'] key if central config apiKey is empty
    if (!config.apiKey && config.provider === 'RESEND') {
      try {
        const intRow = this.db.prepare('SELECT keys_json FROM integrations WHERE id = ?').get('email_transactional') as { keys_json: string } | undefined;
        if (intRow?.keys_json) {
          const parsedKeys = JSON.parse(intRow.keys_json);
          const storedKey = decryptSecret((parsedKeys?.apiKey || parsedKeys?.resendApiKey || '').trim());
          if (storedKey) {
            config.apiKey = storedKey;
          }
        }
      } catch {}
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

    // Honest status when no credentials exist
    if (config.provider === 'RESEND' && !(config.apiKey || '').trim()) {
      config.status = 'DEGRADED';
      config.spfVerified = false;
      config.dkimVerified = false;
      config.dmarcVerified = false;
    } else if (config.provider === 'SMTP' && !(config.smtpPass || '').trim()) {
      config.status = 'DEGRADED';
    }

    return config;
  }

  public saveCentralEmailConfig(updates: Partial<CentralEmailConfig>): CentralEmailConfig {
    const row = this.db.prepare('SELECT raw_json FROM central_email_config WHERE id = ?').get('central') as { raw_json: string } | undefined;
    let base: CentralEmailConfig = {
      provider: 'RESEND',
      senderEmail: 'notifications@campusconnect.app',
      senderName: 'CampusConnect Global',
      replyTo: 'support@campusconnect.app',
      senderDomain: 'campusconnect.app',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      apiKey: '',
      tlsEnabled: true,
      status: 'DEGRADED',
      sendingEnabled: true,
      dailyLimit: 5000,
      spfVerified: false,
      dkimVerified: false,
      dmarcVerified: false,
      updatedAt: new Date().toISOString()
    };

    if (row && row.raw_json) {
      try {
        base = { ...base, ...JSON.parse(row.raw_json) };
        if (base.smtpPass) base.smtpPass = decryptSecret(base.smtpPass);
        if (base.apiKey) base.apiKey = decryptSecret(base.apiKey);
      } catch {}
    }

    const updated: CentralEmailConfig = {
      ...base,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const storedRecord: CentralEmailConfig = {
      ...updated,
      smtpPass: updated.smtpPass ? encryptSecret(updated.smtpPass) : '',
      apiKey: updated.apiKey ? encryptSecret(updated.apiKey) : ''
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
      storedRecord.provider,
      storedRecord.senderEmail,
      storedRecord.senderName,
      storedRecord.replyTo || null,
      storedRecord.senderDomain,
      storedRecord.smtpHost || null,
      storedRecord.smtpPort || 587,
      storedRecord.smtpUser || null,
      storedRecord.smtpPass || null,
      storedRecord.apiKey || null,
      storedRecord.tlsEnabled ? 1 : 0,
      storedRecord.status,
      storedRecord.sendingEnabled ? 1 : 0,
      storedRecord.dailyLimit || 5000,
      storedRecord.spfVerified ? 1 : 0,
      storedRecord.dkimVerified ? 1 : 0,
      storedRecord.dmarcVerified ? 1 : 0,
      storedRecord.updatedAt,
      JSON.stringify(storedRecord)
    );

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

  // --- AUDIT LOGS (HMAC hash-chained for tamper detection) ---
  public getAllAuditLogs(): AuditLogItem[] {
    const rows = this.db.prepare('SELECT raw_json FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all() as { raw_json: string }[];
    return rows.map(r => JSON.parse(r.raw_json) as AuditLogItem);
  }

  public insertAuditLog(log: AuditLogItem): AuditLogItem {
    const prevRow = this.db
      .prepare('SELECT entry_hash FROM audit_logs WHERE entry_hash IS NOT NULL ORDER BY rowid DESC LIMIT 1')
      .get() as { entry_hash: string } | undefined;
    const prevHash = prevRow?.entry_hash || 'GENESIS';
    const payloadStr = JSON.stringify({
      id: log.id,
      timestamp: log.timestamp,
      actorUid: log.actorUid,
      actorEmail: log.actorEmail || null,
      actorRole: log.actorRole,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details || null
    });
    const entryHash = hmacSha256Hex(`${prevHash}|${payloadStr}`);

    this.db.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, actor_uid, actor_email, actor_role, action,
        target_type, target_id, details, raw_json, prev_hash, entry_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(log),
      prevHash,
      entryHash
    );
    return log;
  }

  public verifyAuditLogChain(): { valid: boolean; total: number; chainedCount: number; brokenAtId?: string } {
    const rows = this.db
      .prepare('SELECT id, timestamp, actor_uid, actor_email, actor_role, action, target_type, target_id, details, prev_hash, entry_hash FROM audit_logs ORDER BY rowid ASC')
      .all() as any[];

    let expectedPrev = 'GENESIS';
    let chainedCount = 0;

    for (const r of rows) {
      if (!r.entry_hash) continue; // Legacy pre-hardening rows lack chain hashes
      chainedCount++;
      if ((r.prev_hash || '') !== expectedPrev) {
        return { valid: false, total: rows.length, chainedCount, brokenAtId: r.id };
      }
      const payloadStr = JSON.stringify({
        id: r.id,
        timestamp: r.timestamp,
        actorUid: r.actor_uid,
        actorEmail: r.actor_email || null,
        actorRole: r.actor_role,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        details: r.details || null
      });
      const expectedEntry = hmacSha256Hex(`${expectedPrev}|${payloadStr}`);
      if (r.entry_hash !== expectedEntry) {
        return { valid: false, total: rows.length, chainedCount, brokenAtId: r.id };
      }
      expectedPrev = r.entry_hash;
    }

    return { valid: true, total: rows.length, chainedCount };
  }

  // Dual-write snapshot backup to JSON file ONLY for non-sensitive public/operational collections
  private backupToJson(filename: string, data: any): void {
    const BLOCKED_BACKUP_FILES = new Set([
      'admins.json',
      'sessions.json',
      'users.json',
      'integrations.json',
      'email-config.json',
      'audit-logs.json'
    ]);
    if (BLOCKED_BACKUP_FILES.has(filename)) return;
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
