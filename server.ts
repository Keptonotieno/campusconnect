import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { dbInstance, EmailDeliveryError } from './server/db';
import type { AdminSession } from './server/db';
import type { User, FeaturedSubmission } from './src/types';
import {
  getNormalizedClientIp,
  validateAndStoreImageUpload,
  resolvePrivateUploadPath,
  signFileAccessToken,
  verifyFileAccessToken,
  timingSafeEqualStr,
  validateSafeHttpUrl,
  escapeHtml
} from './server/security';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Capture raw body for cryptographic webhook signature verification before JSON parsing
const jsonWithRawBody = express.json({
  limit: '2mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
});

const uploadJsonParser = express.json({
  limit: '10mb'
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/uploads/photo' || req.path === '/api/submissions') {
    return uploadJsonParser(req, res, next);
  }
  return jsonWithRawBody(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(cookieParser());

// -----------------------------------------------------------------------------
// GLOBAL SECURITY HEADERS MIDDLEWARE
// -----------------------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com https://accounts.google.com",
      "worker-src 'self' blob:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      isProduction
        ? "script-src 'self' https://js.stripe.com https://apis.google.com https://www.gstatic.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.gstatic.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://api.stripe.com https://api.resend.com ws: wss:"
    ].join('; ')
  );

  if (isProduction && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Keep all administrative, auth, file, and private API routes out of caches and search indexes
  if (
    req.path.startsWith('/admin') ||
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/users') ||
    req.path.startsWith('/api/payments') ||
    req.path.startsWith('/api/files')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  next();
});

// -----------------------------------------------------------------------------
// CSRF ORIGIN / FETCH-METADATA GUARD FOR STATE-CHANGING REQUESTS
// -----------------------------------------------------------------------------
const CSRF_EXEMPT_PATHS = new Set([
  '/api/payments/webhook',
  '/api/webhooks/resend',
  '/api/webhooks/email',
  '/api/email/webhook'
]);

app.use((req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }
  if (!req.path.startsWith('/api/') || CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  const host = (req.headers['x-forwarded-host'] as string || req.get('host') || '').split(',')[0].trim().toLowerCase();

  const parseOriginHost = (rawUrl?: string): string | null => {
    if (!rawUrl) return null;
    try {
      return new URL(rawUrl).host.toLowerCase();
    } catch {
      return null;
    }
  };

  if (typeof originHeader === 'string' && originHeader.length > 0) {
    const reqHost = parseOriginHost(originHeader);
    if (!reqHost || (host && reqHost !== host)) {
      dbInstance.logSecurityEvent(
        'HIGH',
        'CSRF_ORIGIN_BLOCKED',
        `Blocked cross-origin ${method} ${req.path} from Origin=${originHeader} (expected host ${host})`,
        undefined,
        getNormalizedClientIp(req)
      );
      return res.status(403).json({
        error: 'CsrfBlocked',
        message: 'Cross-origin state-changing request rejected.'
      });
    }
  } else if (typeof refererHeader === 'string' && refererHeader.length > 0) {
    const refHost = parseOriginHost(refererHeader);
    if (!refHost || (host && refHost !== host)) {
      dbInstance.logSecurityEvent(
        'HIGH',
        'CSRF_REFERER_BLOCKED',
        `Blocked cross-origin ${method} ${req.path} from Referer=${refererHeader}`,
        undefined,
        getNormalizedClientIp(req)
      );
      return res.status(403).json({
        error: 'CsrfBlocked',
        message: 'Cross-origin state-changing request rejected.'
      });
    }
  } else if (req.cookies?.admin_session_token || req.cookies?.cc_user_session) {
    // Cookie-authenticated mutation without Origin or Referer
    const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
    if (secFetchSite === 'cross-site') {
      return res.status(403).json({
        error: 'CsrfBlocked',
        message: 'Cross-site cookie mutation rejected.'
      });
    }
  }

  next();
});

// -----------------------------------------------------------------------------
// GENERAL API RATE LIMITER
// -----------------------------------------------------------------------------
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }
  const ip = getNormalizedClientIp(req);
  const limit = dbInstance.consumeRateLimit(`api_mut:${ip}`, 120, 60 * 1000, 60 * 1000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many requests. Please try again in ${limit.retryAfterSeconds}s.`
    });
  }
  next();
});

// -----------------------------------------------------------------------------
// REQUEST CONTEXT & AUTHORIZATION MIDDLEWARES
// -----------------------------------------------------------------------------
export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminSession;
}

export interface AuthenticatedUserRequest extends Request {
  user?: User;
  admin?: AdminSession;
}

function getCookieSecurityFlags(req: Request) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  const isHttps = Boolean(
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    origin.startsWith('https://') ||
    referer.startsWith('https://') ||
    isProduction
  );
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax'
  };
}

function extractAdminToken(req: Request): string | undefined {
  let token = req.cookies?.admin_session_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1].startsWith('sess_')) {
      token = parts[1];
    }
  }
  return token;
}

function extractUserToken(req: Request): string | undefined {
  let token = req.cookies?.cc_user_session;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1].startsWith('usr_sess_')) {
      token = parts[1];
    }
  }
  return token;
}

export function requireAdminAuth(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
  const token = extractAdminToken(req);
  if (token) {
    const session = dbInstance.validateSession(token);
    if (session) {
      if (session.role !== 'Admin' || !session.mfaVerified) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Administrative MFA privileges required.'
        });
      }
      req.admin = session;
      return next();
    }
  }

  // Explicitly distinguish student attempting admin access (403) vs anonymous (401)
  const userToken = extractUserToken(req);
  if (userToken && dbInstance.validateUserSession(userToken)) {
    dbInstance.logSecurityEvent(
      'HIGH',
      'PRIVILEGE_ESCALATION_ATTEMPT',
      `Student user attempted unauthorized access to admin endpoint ${req.method} ${req.path}`,
      undefined,
      getNormalizedClientIp(req)
    );
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Administrative privileges required.'
    });
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required. Please log in as an administrator.'
  });
}

export function requireUserAuth(req: AuthenticatedUserRequest, res: Response, next: NextFunction) {
  const token = extractUserToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please sign in to your student account.'
    });
  }
  const validated = dbInstance.validateUserSession(token);
  if (!validated) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Your session has expired. Please sign in again.'
    });
  }
  req.user = validated.user;
  next();
}

export function requireUserOrAdminAuth(req: AuthenticatedUserRequest, res: Response, next: NextFunction) {
  const adminToken = extractAdminToken(req);
  if (adminToken) {
    const adminSess = dbInstance.validateSession(adminToken);
    if (adminSess && adminSess.role === 'Admin' && adminSess.mfaVerified) {
      req.admin = adminSess;
      return next();
    }
  }
  const userToken = extractUserToken(req);
  if (userToken) {
    const validated = dbInstance.validateUserSession(userToken);
    if (validated) {
      req.user = validated.user;
      return next();
    }
  }
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required.'
  });
}

const getBaseUrl = (req: Request): string => {
  const configured = (process.env.APP_URL || '').trim();
  if (configured && configured.startsWith('http')) {
    return configured.replace(/\/+$/, '');
  }
  const host = (req.headers['x-forwarded-host'] as string || req.get('host') || '').split(',')[0].trim();
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol || 'http';
    return `${proto}://${host}`;
  }
  return 'https://campusconnect.app';
};

function resolveStripeCredentials() {
  const stripeIntegration = dbInstance.getIntegrations().find((i) => i.id === 'payment_stripe');
  const publishableKey = (
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    stripeIntegration?.keys?.publishableKey ||
    ''
  ).trim();
  const secretKey = (
    process.env.STRIPE_SECRET_KEY ||
    stripeIntegration?.keys?.secretKey ||
    ''
  ).trim();
  const webhookSecret = (
    process.env.STRIPE_WEBHOOK_SECRET ||
    stripeIntegration?.keys?.webhookSecret ||
    ''
  ).trim();

  return { publishableKey, secretKey, webhookSecret };
}

function verifyStripeWebhookSignature(
  rawBody: Buffer,
  sigHeader: string | undefined,
  webhookSecret: string,
  toleranceSeconds = 300
): boolean {
  if (!sigHeader || !webhookSecret || !rawBody) return false;
  const parts = sigHeader.split(',').map((p) => p.trim());
  let timestamp = '';
  const v1Sigs: string[] = [];

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx);
    const val = part.slice(eqIdx + 1);
    if (key === 't') timestamp = val;
    else if (key === 'v1') v1Sigs.push(val);
  }

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || v1Sigs.length === 0) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return v1Sigs.some((sig) => timingSafeEqualStr(sig, expectedSig));
}

// -----------------------------------------------------------------------------
// ADMIN AUTHENTICATION, BOOTSTRAP & TOTP MFA ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/auth/admin-status', (_req: Request, res: Response) => {
  const adminCount = dbInstance.getAdminCount();
  res.json({
    bootstrapped: adminCount > 0,
    adminCount
  });
});

app.post('/api/auth/bootstrap-admin', (req: Request, res: Response) => {
  const clientIp = getNormalizedClientIp(req);
  const limit = dbInstance.consumeRateLimit(`admin_boot:${clientIp}`, 5, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many bootstrap attempts. Wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`
    });
  }

  try {
    const { email, password } = req.body || {};
    const result = dbInstance.bootstrapAdmin(email, password, clientIp);
    return res.status(201).json({
      success: true,
      message: 'Administrator account created. Complete MFA enrollment to start your session.',
      admin: result.admin,
      mfaRequired: true,
      mfaSetupRequired: true,
      challengeToken: result.challengeToken,
      secret: result.secret,
      otpAuthUri: result.otpAuthUri,
      backupCodes: result.backupCodes
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'BootstrapFailed',
      message: err.message || 'Failed to initialize administrator.'
    });
  }
});

app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const clientIp = getNormalizedClientIp(req);
    const challenge = dbInstance.loginAdmin(email, password, clientIp);
    return res.json({
      success: true,
      message: challenge.mfaSetupRequired
        ? 'Scan or copy your MFA authenticator key and enter your 6-digit verification code.'
        : 'Enter the 6-digit verification code from your authenticator app.',
      ...challenge
    });
  } catch (err: any) {
    const status = err.message?.includes('wait') ? 429 : 401;
    return res.status(status).json({
      error: 'AuthenticationFailed',
      message: err.message || 'Invalid email or password.'
    });
  }
});

app.post('/api/auth/admin-mfa/verify', (req: Request, res: Response) => {
  try {
    const { challengeToken, code } = req.body || {};
    if (!challengeToken || !code) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'MFA challenge token and 6-digit verification code are required.'
      });
    }
    const clientIp = getNormalizedClientIp(req);
    const { admin, session } = dbInstance.verifyAdminMfaChallenge(String(challengeToken), String(code), clientIp);

    res.cookie('admin_session_token', session.token, {
      ...getCookieSecurityFlags(req),
      maxAge: 4 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Administrator authenticated with MFA.',
      admin,
      expiresAt: session.expiresAt
    });
  } catch (err: any) {
    const status = err.message?.includes('wait') ? 429 : 401;
    return res.status(status).json({
      error: 'MfaVerificationFailed',
      message: err.message || 'Invalid MFA verification code.'
    });
  }
});

app.post('/api/auth/admin-logout', (req: AuthenticatedAdminRequest, res: Response) => {
  const token = extractAdminToken(req);
  if (token) {
    const sess = dbInstance.validateSession(token);
    dbInstance.invalidateSession(token);
    if (sess) {
      dbInstance.logAudit({
        actorUid: sess.adminId,
        actorEmail: sess.email,
        actorRole: 'Admin',
        action: 'ADMIN_LOGOUT',
        targetType: 'USER',
        targetId: sess.adminId,
        details: `Administrator logged out from IP ${getNormalizedClientIp(req)}`
      });
    }
  }
  res.clearCookie('admin_session_token', getCookieSecurityFlags(req));
  return res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/admin-me', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({
    authenticated: true,
    admin: {
      id: req.admin?.adminId,
      email: req.admin?.email,
      role: req.admin?.role,
      mfaVerified: Boolean(req.admin?.mfaVerified),
      expiresAt: req.admin?.expiresAt
    }
  });
});

// -----------------------------------------------------------------------------
// STUDENT ACCOUNT RECOVERY & VERIFICATION ENDPOINTS
// -----------------------------------------------------------------------------

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const clientIp = getNormalizedClientIp(req);
  const ipLimit = dbInstance.consumeRateLimit(`pwd_forgot_ip:${clientIp}`, 6, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many password reset requests. Please wait ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minute(s).`
    });
  }

  try {
    const { email, universityId } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'BadRequest', message: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const acctLimit = dbInstance.consumeRateLimit(`pwd_forgot_acct:${cleanEmail}`, 4, 15 * 60 * 1000, 15 * 60 * 1000);
    if (!acctLimit.allowed) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Too many reset requests for this email. Please wait before trying again.'
      });
    }

    const token = dbInstance.issuePasswordResetToken(cleanEmail);
    // Non-enumerating response: never disclose whether an account exists
    if (!token) {
      return res.json({
        success: true,
        message: 'If an account matches that email address, password reset instructions have been dispatched.'
      });
    }

    const matchedUser = dbInstance.getRegisteredUsers().find((u) => u.email?.toLowerCase() === cleanEmail);
    const targetUni = universityId || matchedUser?.universityId || matchedUser?.universitySlug || 'general';
    const baseUrl = getBaseUrl(req);

    const log = await dbInstance.sendUniversityEmail({
      universityId: targetUni,
      eventType: 'PASSWORD_RESET',
      recipient: cleanEmail,
      variables: {
        student_name: matchedUser?.name || cleanEmail.split('@')[0],
        student_email: cleanEmail,
        base_url: baseUrl,
        continuation_link: `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(cleanEmail)}`
      },
      idempotencyKey: `pwd_reset_${cleanEmail}_${Math.floor(Date.now() / 60000)}`
    });

    if (log.status === 'FAILED') {
      return res.status(400).json({
        success: false,
        error: 'DispatchFailed',
        message: 'Unable to dispatch password reset email right now. Please contact support.',
        logId: log.id
      });
    }

    return res.json({
      success: true,
      message: 'If an account matches that email address, password reset instructions have been dispatched.'
    });
  } catch (err: any) {
    if (err instanceof EmailDeliveryError) {
      return res.status(400).json({
        success: false,
        error: err.code,
        message: 'Unable to send reset email at this time.'
      });
    }
    return res.status(500).json({ error: 'ResetFailed', message: 'Failed to process password reset request.' });
  }
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const clientIp = getNormalizedClientIp(req);
  const limit = dbInstance.consumeRateLimit(`pwd_reset_ip:${clientIp}`, 10, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many reset attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`
    });
  }

  try {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email, recovery token, and new password are required.' });
    }
    const result = dbInstance.resetUserPasswordWithToken(String(email), String(token), String(newPassword));
    if (!result.success) {
      return res.status(400).json({
        error: 'ResetInvalid',
        message: result.message || 'Reset link is invalid or has expired.'
      });
    }
    res.clearCookie('cc_user_session', getCookieSecurityFlags(req));
    return res.json({ success: true, message: 'Your password has been updated. All previous sessions were signed out.' });
  } catch {
    return res.status(500).json({ error: 'ResetFailed', message: 'Could not reset password.' });
  }
});

app.post('/api/auth/send-verification', async (req: AuthenticatedUserRequest, res: Response) => {
  const clientIp = getNormalizedClientIp(req);
  const limit = dbInstance.consumeRateLimit(`verif_send:${clientIp}`, 6, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many verification email requests. Wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`
    });
  }

  try {
    const { email, universityId, studentName } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'BadRequest', message: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const matchedUser = dbInstance.getRegisteredUsers().find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!matchedUser) {
      return res.json({
        success: true,
        message: 'If your student account is registered, a verification code has been dispatched.'
      });
    }

    const code = dbInstance.issueVerificationCode(cleanEmail);
    const targetUni = universityId || matchedUser.universityId || matchedUser.universitySlug || 'general';
    const baseUrl = getBaseUrl(req);

    const log = await dbInstance.sendUniversityEmail({
      universityId: targetUni,
      eventType: 'ACCOUNT_VERIFICATION',
      recipient: cleanEmail,
      variables: {
        student_name: studentName || matchedUser.name || cleanEmail.split('@')[0],
        student_email: cleanEmail,
        verification_code: code,
        base_url: baseUrl,
        continuation_link: `${baseUrl}/verify?code=${encodeURIComponent(code)}&email=${encodeURIComponent(cleanEmail)}`
      },
      idempotencyKey: `email_verif_${cleanEmail}_${Math.floor(Date.now() / 60000)}`
    });

    if (log.status === 'FAILED') {
      return res.status(400).json({
        success: false,
        error: 'DispatchFailed',
        message: log.errorMessage || 'Failed to dispatch verification email.',
        logId: log.id
      });
    }

    if (log.metadata?.sandboxRestriction) {
      return res.json({
        success: true,
        sandboxQueued: true,
        message: 'Verification email queued. External delivery activates after domain verification.',
        logId: log.id
      });
    }

    return res.json({
      success: true,
      message: `Verification code dispatched to ${cleanEmail}.`,
      logId: log.id
    });
  } catch (err: any) {
    if (err instanceof EmailDeliveryError) {
      return res.status(400).json({
        success: false,
        error: err.code,
        message: err.message,
        logId: err.emailLog?.id
      });
    }
    return res.status(500).json({ error: 'VerificationFailed', message: 'Failed to dispatch verification email.' });
  }
});

app.post('/api/auth/verify-email', (req: Request, res: Response) => {
  const clientIp = getNormalizedClientIp(req);
  const limit = dbInstance.consumeRateLimit(`verif_check:${clientIp}`, 10, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many verification attempts. Wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`
    });
  }

  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email address and verification code are required.' });
    }
    const result = dbInstance.verifyStudentEmailCode(String(email), String(code));
    if (!result.verified) {
      return res.status(400).json({ error: 'InvalidCode', message: 'Verification code is invalid or expired. Please request a new code.' });
    }
    return res.json({ success: true, verified: true, user: result.user, message: `Email ${email} verified successfully.` });
  } catch {
    return res.status(500).json({ error: 'VerifyFailed', message: 'Could not verify email.' });
  }
});

// -----------------------------------------------------------------------------
// SECURE ADMIN DASHBOARD API ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/admin/overview', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json(dbInstance.getOverview());
});

app.get('/api/admin/security-events', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ events: dbInstance.getSecurityEvents(150) });
});

app.get('/api/admin/audit-logs/verify', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json(dbInstance.verifyAuditLogChain());
});

app.get('/api/admin/campuses', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ campuses: dbInstance.getCampuses() });
});

app.post('/api/admin/campuses', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const newCampus = dbInstance.createCampus(req.body, req.admin?.email || 'admin');
    return res.status(201).json({
      success: true,
      campus: newCampus,
      canonicalUrls: {
        ig: `/ig/${newCampus.slug}`,
        u: `/u/${newCampus.slug}`,
        university: `/university/${newCampus.slug}`
      }
    });
  } catch (err: any) {
    const status = err.message?.includes('already exists') ? 409 : 400;
    return res.status(status).json({ error: 'CampusCreationFailed', message: err.message || 'Failed to create campus.' });
  }
});

app.put('/api/admin/campuses/:id', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = dbInstance.updateCampus(req.params.id, req.body, req.admin?.email || 'admin');
    return res.json({ success: true, campus: updated });
  } catch (err: any) {
    return res.status(400).json({ error: 'CampusUpdateFailed', message: err.message || 'Failed to update campus.' });
  }
});

app.delete('/api/admin/campuses/:id', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    dbInstance.deleteCampus(req.params.id, req.admin?.email || 'admin');
    return res.json({ success: true, message: 'Campus deleted successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: 'CampusDeletionFailed', message: err.message || 'Failed to delete campus.' });
  }
});

app.get('/api/admin/payments', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const payments = dbInstance.getPayments();
  const totals = dbInstance.getTotalAmountPaid();
  return res.json({ payments, totals, count: payments.length });
});

app.post('/api/admin/payments/webhook-test', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const body = req.body || {};
    const txnRef = String(body.transactionId || `TXN_TEST_${Date.now()}`).trim();
    const idempotencyKey = String(body.idempotencyKey || `idem_${Date.now()}`).trim();

    const existingPayments = dbInstance.getPayments();
    const isDuplicate = existingPayments.some(
      (p) => p.providerTransactionReference === txnRef || p.idempotencyKey === idempotencyKey
    );

    if (isDuplicate) {
      return res.json({
        success: true,
        duplicate: true,
        message: 'Duplicate webhook test safely ignored via idempotency check.'
      });
    }

    const payment = dbInstance.recordPayment({
      submissionId: String(body.submissionId || 'sub_test_hook'),
      studentUid: String(body.studentUid || 'usr_test_student'),
      studentName: String(body.studentName || 'Test Student'),
      universityId: String(body.universityId || 'uni_harvard'),
      provider: 'STRIPE_CARD',
      providerTransactionReference: txnRef,
      amountUsd: Number(body.amountUsd) || 6.00,
      currency: 'USD',
      status: 'CONFIRMED',
      idempotencyKey,
      verifiedAt: new Date().toISOString()
    });

    dbInstance.logAudit({
      actorUid: req.admin?.adminId || 'admin',
      actorEmail: req.admin?.email || 'admin',
      actorRole: 'Admin',
      action: 'ADMIN_WEBHOOK_IDEMPOTENCY_TEST',
      targetType: 'PAYMENT',
      targetId: payment.id,
      details: `Executed idempotency verification test (${txnRef})`
    });

    return res.json({
      success: true,
      duplicate: false,
      paymentId: payment.id,
      status: payment.status,
      message: `Test transaction ${txnRef} saved & idempotency key registered.`
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'WebhookTestFailed', message: err?.message || 'Could not run test.' });
  }
});

app.get('/api/admin/instagram', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ accounts: dbInstance.getInstagramAccounts() });
});

app.post('/api/admin/instagram/connect', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const account = dbInstance.connectInstagramAccount(req.body || {}, req.admin?.email || 'admin');
    return res.json({ success: true, account });
  } catch (err: any) {
    return res.status(400).json({ error: 'ConnectFailed', message: err.message });
  }
});

app.post('/api/admin/instagram/:id/refresh', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const account = dbInstance.refreshInstagramAccount(req.params.id, req.admin?.email || 'admin');
    return res.json({ success: true, account });
  } catch (err: any) {
    return res.status(400).json({ error: 'RefreshFailed', message: err.message });
  }
});

app.post('/api/admin/instagram/:id/disconnect', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = dbInstance.disconnectInstagramAccount(req.params.id, req.admin?.email || 'admin');
    return res.json({ success: true, account: updated });
  } catch (err: any) {
    return res.status(400).json({ error: 'DisconnectFailed', message: err.message });
  }
});

// Workspace Instagram routes (require authenticated student or admin)
app.get('/api/instagram/accounts', requireUserOrAdminAuth, (_req: AuthenticatedUserRequest, res: Response) => {
  return res.json({ accounts: dbInstance.getInstagramAccounts() });
});

app.post('/api/instagram/accounts', requireUserOrAdminAuth, (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const actor = req.admin?.email || req.user?.email || 'user';
    const account = dbInstance.connectInstagramAccount(req.body || {}, actor);
    return res.json({ success: true, account });
  } catch (err: any) {
    return res.status(400).json({ error: 'ConnectFailed', message: err.message });
  }
});

app.post('/api/instagram/accounts/:id/refresh', requireUserOrAdminAuth, (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const actor = req.admin?.email || req.user?.email || 'user';
    const account = dbInstance.refreshInstagramAccount(req.params.id, actor);
    return res.json({ success: true, account });
  } catch (err: any) {
    return res.status(400).json({ error: 'RefreshFailed', message: err.message });
  }
});

app.post('/api/instagram/accounts/:id/disconnect', requireUserOrAdminAuth, (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const actor = req.admin?.email || req.user?.email || 'user';
    const account = dbInstance.disconnectInstagramAccount(req.params.id, actor);
    return res.json({ success: true, account });
  } catch (err: any) {
    return res.status(400).json({ error: 'DisconnectFailed', message: err.message });
  }
});

// -----------------------------------------------------------------------------
// CENTRALIZED EMAIL INFRASTRUCTURE & UNIVERSITY EMAIL MANAGEMENT (ADMIN ONLY)
// -----------------------------------------------------------------------------

app.get('/api/admin/email/config', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
  const config = dbInstance.getCentralEmailConfig();
  const resendStatus = await dbInstance.getResendDomainStatus(req.query.refresh === '1').catch(() => undefined);
  const safeConfig = {
    ...config,
    smtpPass: config.smtpPass ? '••••••••••••' : '',
    apiKey: config.apiKey ? '••••••••••••' : '',
    ...(config.provider === 'RESEND' && resendStatus ? {
      status: resendStatus.productionReady ? 'OPERATIONAL' as const : 'DEGRADED' as const,
      spfVerified: resendStatus.verifiedDomains.length > 0,
      dkimVerified: resendStatus.verifiedDomains.length > 0
    } : {})
  };
  return res.json({ config: safeConfig, resendStatus });
});

app.post('/api/admin/email/config', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updates = { ...req.body };
    const existing = dbInstance.getCentralEmailConfig();
    if (updates.smtpPass === '••••••••••••') updates.smtpPass = existing.smtpPass;
    if (updates.apiKey === '••••••••••••') updates.apiKey = existing.apiKey;

    const saved = dbInstance.saveCentralEmailConfig(updates);
    dbInstance.logAudit({
      actorUid: req.admin?.adminId || 'admin',
      actorEmail: req.admin?.email || 'admin',
      actorRole: 'Admin',
      action: 'EMAIL_CONFIG_UPDATED',
      targetType: 'SYSTEM',
      targetId: 'central_email_config',
      details: `Updated central email infrastructure configuration (Provider: ${saved.provider}, Domain: ${saved.senderDomain})`
    });

    const resendStatus = await dbInstance.getResendDomainStatus(true).catch(() => undefined);
    const safeConfig = {
      ...saved,
      smtpPass: saved.smtpPass ? '••••••••••••' : '',
      apiKey: saved.apiKey ? '••••••••••••' : '',
      ...(saved.provider === 'RESEND' && resendStatus ? {
        status: resendStatus.productionReady ? 'OPERATIONAL' as const : 'DEGRADED' as const,
        spfVerified: resendStatus.verifiedDomains.length > 0,
        dkimVerified: resendStatus.verifiedDomains.length > 0
      } : {})
    };
    return res.json({ success: true, config: safeConfig, resendStatus });
  } catch (err: any) {
    return res.status(400).json({ error: 'ConfigSaveFailed', message: err.message });
  }
});

app.get('/api/admin/email/identities', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ identities: dbInstance.getAllUniversityEmailIdentities() });
});

app.get('/api/admin/email/identities/:uniId', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ identity: dbInstance.getUniversityEmailIdentity(req.params.uniId) });
});

app.post('/api/admin/email/identities/:uniId', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { senderEmail, senderName } = req.body || {};
    if (!senderName || !String(senderName).trim()) {
      return res.status(400).json({ error: 'InvalidIdentity', message: 'Sender display name is required.' });
    }
    if (!senderEmail || !String(senderEmail).includes('@')) {
      return res.status(400).json({ error: 'InvalidIdentity', message: 'A valid authorized sender email address is required.' });
    }

    const saved = dbInstance.saveUniversityEmailIdentity({
      ...req.body,
      senderName: String(senderName).trim(),
      senderEmail: String(senderEmail).trim().toLowerCase(),
      universityId: req.params.uniId
    });

    dbInstance.logAudit({
      actorUid: req.admin?.adminId || 'admin',
      actorEmail: req.admin?.email || 'admin',
      actorRole: 'Admin',
      action: 'UNIVERSITY_IDENTITY_UPDATED',
      targetType: 'CAMPUS',
      targetId: req.params.uniId,
      details: `Updated email identity for ${saved.universityName} (${saved.senderEmail})`
    });

    return res.json({ success: true, identity: saved });
  } catch (err: any) {
    return res.status(400).json({ error: 'IdentitySaveFailed', message: err.message });
  }
});

app.get('/api/admin/email/templates/:uniId', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ templates: dbInstance.getUniversityEmailTemplates(req.params.uniId) });
});

app.post('/api/admin/email/templates/:uniId', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const saved = dbInstance.saveUniversityEmailTemplate({
      ...req.body,
      universityId: req.params.uniId
    });

    dbInstance.logAudit({
      actorUid: req.admin?.adminId || 'admin',
      actorEmail: req.admin?.email || 'admin',
      actorRole: 'Admin',
      action: 'EMAIL_TEMPLATE_UPDATED',
      targetType: 'CAMPUS',
      targetId: `${req.params.uniId}_${saved.eventType}`,
      details: `Saved customized email template for event "${saved.eventType}" at university "${req.params.uniId}"`
    });

    return res.json({ success: true, template: saved });
  } catch (err: any) {
    return res.status(400).json({ error: 'TemplateSaveFailed', message: err.message });
  }
});

app.delete('/api/admin/email/templates/:uniId/:eventType', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    dbInstance.deleteUniversityEmailTemplate(req.params.uniId, req.params.eventType);
    return res.json({ success: true, message: `Template for ${req.params.eventType} reset to system default.` });
  } catch (err: any) {
    return res.status(400).json({ error: 'TemplateDeleteFailed', message: err.message });
  }
});

app.post('/api/admin/email/preview-template', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { universityId, eventType, customTemplate, sampleVariables } = req.body || {};
    const preview = dbInstance.previewUniversityEmail({
      universityId: universityId || 'general',
      eventType: eventType || 'WELCOME',
      customTemplate,
      sampleVariables
    });
    return res.json({ success: true, ...preview });
  } catch (err: any) {
    return res.status(400).json({ error: 'PreviewFailed', message: err.message });
  }
});

app.post('/api/admin/email/test-template', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { recipient, universityId, eventType, customVariables } = req.body || {};
    const targetRecipient = recipient || req.admin?.email || 'admin@campusconnect.app';
    const targetUni = universityId || 'general';
    const targetEvent = eventType || 'WELCOME';
    const baseUrl = getBaseUrl(req);

    const log = await dbInstance.sendUniversityEmail({
      universityId: targetUni,
      eventType: targetEvent,
      recipient: targetRecipient,
      sandboxForwardToOwner: true,
      variables: {
        student_name: 'Administrator (Test)',
        student_email: targetRecipient,
        submission_reference: `TEST-${Date.now().toString().slice(-4)}`,
        payment_amount: '6.00',
        base_url: baseUrl,
        ...customVariables
      }
    });

    const isDeliveredToTarget = log.status === 'DELIVERED' && !log.metadata?.sandboxRestriction;
    const resendStatus = await dbInstance.getResendDomainStatus(false).catch(() => undefined);
    let responseMessage = `Test ${targetEvent} email delivered to ${targetRecipient}`;
    if (log.status === 'FAILED') {
      responseMessage = `Email delivery failed: ${log.errorMessage || 'Unable to deliver message.'}`;
    } else if (log.metadata?.sandboxMode && log.metadata?.routedViaSandboxTo && log.metadata?.sandboxRestriction) {
      responseMessage = `Not delivered to ${targetRecipient}: Resend Sandbox only permits direct delivery to ${log.metadata.routedViaSandboxTo} until a domain is verified at resend.com/domains. A preview copy was sent to ${log.metadata.routedViaSandboxTo} instead.`;
    } else if (log.metadata?.sandboxRestriction) {
      responseMessage = log.errorMessage || `Email queued in Resend Sandbox Mode.`;
    }

    return res.status(log.status === 'FAILED' ? 400 : 200).json({
      success: isDeliveredToTarget,
      sandboxMode: Boolean(log.metadata?.sandboxMode || log.metadata?.sandboxRestriction),
      message: responseMessage,
      log,
      diagnostic: {
        provider: log.provider,
        httpStatus: log.metadata?.resendHttpStatus || 200,
        providerResponse: log.metadata?.resendResponse || null
      },
      resendStatus
    });
  } catch (err: any) {
    if (err instanceof EmailDeliveryError) {
      const resendStatus = await dbInstance.getResendDomainStatus(false).catch(() => undefined);
      return res.status(400).json({
        success: false,
        sandboxMode: err.code === 'RESEND_SANDBOX_BLOCKED',
        error: err.code,
        message: err.message,
        log: err.emailLog,
        diagnostic: {
          provider: err.provider,
          httpStatus: err.httpStatus,
          providerResponse: err.providerResponse
        },
        resendStatus
      });
    }
    return res.status(500).json({ error: 'TestSendFailed', message: 'Failed to dispatch test template.' });
  }
});

app.get('/api/admin/email', requireAdminAuth, async (_req: AuthenticatedAdminRequest, res: Response) => {
  const config = dbInstance.getCentralEmailConfig();
  const logs = dbInstance.getEmailLogs();
  const resendStatus = await dbInstance.getResendDomainStatus(false).catch(() => undefined);
  const safeConfig = {
    ...config,
    smtpPass: config.smtpPass ? '••••••••••••' : '',
    apiKey: config.apiKey ? '••••••••••••' : '',
    ...(config.provider === 'RESEND' && resendStatus ? {
      status: resendStatus.productionReady ? 'OPERATIONAL' as const : 'DEGRADED' as const,
      spfVerified: resendStatus.verifiedDomains.length > 0,
      dkimVerified: resendStatus.verifiedDomains.length > 0
    } : {})
  };
  return res.json({ config: safeConfig, logs, resendStatus });
});

app.post('/api/admin/email/send-test', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const recipient = req.body.recipient || req.admin?.email || 'admin@campusconnect.app';
    const baseUrl = getBaseUrl(req);
    const log = await dbInstance.sendUniversityEmail({
      universityId: 'general',
      eventType: 'WELCOME',
      recipient,
      sandboxForwardToOwner: true,
      variables: {
        student_name: 'Administrator',
        student_email: recipient,
        base_url: baseUrl
      }
    });

    const isDeliveredToTarget = log.status === 'DELIVERED' && !log.metadata?.sandboxRestriction;
    const resendStatus = await dbInstance.getResendDomainStatus(false).catch(() => undefined);
    let responseMessage = `Test email delivered to ${recipient}`;
    if (log.status === 'FAILED') {
      responseMessage = `Email delivery failed: ${log.errorMessage || 'Unable to deliver message.'}`;
    } else if (log.metadata?.sandboxMode && log.metadata?.routedViaSandboxTo && log.metadata?.sandboxRestriction) {
      responseMessage = `Not delivered to ${recipient}: Resend Sandbox only permits direct delivery to ${log.metadata.routedViaSandboxTo} until a domain is verified at resend.com/domains. A preview copy was sent to ${log.metadata.routedViaSandboxTo} instead.`;
    } else if (log.metadata?.sandboxRestriction) {
      responseMessage = log.errorMessage || `Email queued in Resend Sandbox Mode.`;
    }

    return res.status(log.status === 'FAILED' ? 400 : 200).json({
      success: isDeliveredToTarget,
      sandboxMode: Boolean(log.metadata?.sandboxMode || log.metadata?.sandboxRestriction),
      message: responseMessage,
      log,
      diagnostic: {
        provider: log.provider,
        httpStatus: log.metadata?.resendHttpStatus || 200,
        providerResponse: log.metadata?.resendResponse || null
      },
      resendStatus
    });
  } catch (err: any) {
    if (err instanceof EmailDeliveryError) {
      const resendStatus = await dbInstance.getResendDomainStatus(false).catch(() => undefined);
      return res.status(400).json({
        success: false,
        sandboxMode: err.code === 'RESEND_SANDBOX_BLOCKED',
        error: err.code,
        message: err.message,
        log: err.emailLog,
        diagnostic: {
          provider: err.provider,
          httpStatus: err.httpStatus,
          providerResponse: err.providerResponse
        },
        resendStatus
      });
    }
    return res.status(500).json({ error: 'SendFailed', message: 'Failed to send test email.' });
  }
});

app.post('/api/admin/email/logs/:id/retry', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const original = dbInstance.getEmailLogById(req.params.id);
    if (!original) {
      return res.status(404).json({ error: 'NotFound', message: 'Email delivery log entry not found.' });
    }

    const baseUrl = getBaseUrl(req);
    const nextAttempt = (Number(original.metadata?.attemptNumber) || 1) + 1;
    const savedVars = (original.metadata?.variables && typeof original.metadata.variables === 'object')
      ? original.metadata.variables
      : {};

    const retryLog = await dbInstance.sendUniversityEmail({
      universityId: original.universityId || original.metadata?.universityId || 'general',
      eventType: (original.template || 'WELCOME') as any,
      recipient: original.recipient,
      variables: {
        ...savedVars,
        base_url: savedVars.base_url || baseUrl
      },
      retryOfLogId: original.id,
      attemptNumber: nextAttempt,
      idempotencyKey: `retry_${original.id}_${nextAttempt}_${Date.now()}`
    });

    dbInstance.logAudit({
      actorUid: req.admin?.adminId || 'admin',
      actorEmail: req.admin?.email || 'admin',
      actorRole: 'Admin',
      action: 'EMAIL_RETRIED',
      targetType: 'SYSTEM',
      targetId: original.id,
      details: `Retried ${original.template} email to ${original.recipient} (Result: ${retryLog.status})`
    });

    const resendStatus = await dbInstance.getResendDomainStatus(false).catch(() => undefined);
    const isSuccess = retryLog.status !== 'FAILED';
    return res.status(isSuccess ? 200 : 400).json({
      success: isSuccess,
      message: isSuccess
        ? (retryLog.status === 'DELIVERED'
            ? `Retry delivered to ${original.recipient}`
            : retryLog.errorMessage || `Retry queued for ${original.recipient}`)
        : (retryLog.errorMessage || 'Retry dispatch failed.'),
      log: retryLog,
      diagnostic: {
        provider: retryLog.provider,
        httpStatus: retryLog.metadata?.resendHttpStatus || 200,
        providerResponse: retryLog.metadata?.resendResponse || null
      },
      resendStatus
    });
  } catch (err: any) {
    if (err instanceof EmailDeliveryError) {
      const resendStatus = await dbInstance.getResendDomainStatus(false).catch(() => undefined);
      return res.status(400).json({
        success: false,
        sandboxMode: err.code === 'RESEND_SANDBOX_BLOCKED',
        error: err.code,
        message: err.message,
        log: err.emailLog,
        diagnostic: {
          provider: err.provider,
          httpStatus: err.httpStatus,
          providerResponse: err.providerResponse
        },
        resendStatus
      });
    }
    return res.status(500).json({ error: 'RetryFailed', message: 'Failed to retry email.' });
  }
});

app.post('/api/admin/email/diagnostics', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { recipient, universityId, eventType, attemptTestSend } = req.body || {};
    const report = await dbInstance.runEmailDiagnostics({
      recipient: recipient ? String(recipient).trim() : undefined,
      universityId: universityId || 'general',
      eventType: eventType || 'WELCOME',
      attemptTestSend: Boolean(attemptTestSend)
    });
    return res.json(report);
  } catch {
    return res.status(500).json({ error: 'DiagnosticsFailed', message: 'Failed to run email diagnostics.' });
  }
});

app.get('/api/admin/audit-logs', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ logs: dbInstance.getAuditLogs() });
});

app.get('/api/admin/users', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const users = dbInstance.getRegisteredUsers();
  return res.json({ users, count: users.length });
});

app.get('/api/admin/integrations', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ integrations: dbInstance.getMaskedIntegrations() });
});

app.post('/api/admin/integrations/:id', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = dbInstance.updateIntegration(req.params.id, req.body?.keys || {}, req.admin?.email || 'admin');
    return res.json({
      success: true,
      message: `Credentials for ${updated.name} updated successfully.`,
      integration: dbInstance.maskIntegration(updated)
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'ConfigFailed', message: err.message });
  }
});

app.post('/api/admin/integrations/:id/test', requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const result = await dbInstance.testIntegration(req.params.id, req.admin?.email || 'admin');
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: 'HandshakeFailed', message: err.message });
  }
});

app.get('/api/admin/submissions', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({ submissions: dbInstance.getSubmissions() });
});

app.post('/api/admin/submissions/:id/review', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { decision, reason } = req.body || {};
    if (!decision || (decision !== 'APPROVE' && decision !== 'REJECT')) {
      return res.status(400).json({ error: 'BadRequest', message: 'decision must be APPROVE or REJECT.' });
    }
    const existing = dbInstance.getSubmissionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'NotFound', message: 'Submission not found.' });
    }
    if (decision === 'APPROVE' && existing.paymentStatus !== 'PAYMENT_CONFIRMED') {
      return res.status(400).json({
        error: 'PaymentRequired',
        message: 'Cannot approve a submission without verified payment confirmation.'
      });
    }

    const updated = dbInstance.updateSubmissionModeration(req.params.id, decision, reason, req.admin?.email || 'admin');

    if (updated.studentEmail) {
      const eventType = decision === 'APPROVE' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED';
      const baseUrl = getBaseUrl(req);
      dbInstance.sendUniversityEmail({
        universityId: updated.universityId || updated.universitySlug || 'general',
        eventType,
        recipient: updated.studentEmail,
        variables: {
          student_name: updated.studentDisplayName,
          student_email: updated.studentEmail,
          submission_reference: updated.id,
          rejection_reason: reason || updated.rejectionReason,
          base_url: baseUrl,
          continuation_link: `${baseUrl}/university/${updated.universitySlug || 'general'}`
        },
        idempotencyKey: `review_${updated.id}_${decision}_${Date.now()}`
      }).catch((err) => console.error('[ReviewEmailTrigger]', err));
    }

    return res.json({ success: true, submission: updated });
  } catch (err: any) {
    return res.status(400).json({ error: 'ReviewFailed', message: err.message });
  }
});

app.post('/api/admin/submissions/:id/publish-instagram', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { targetInstagramHandle, customPostUrl } = req.body || {};
    const existing = dbInstance.getSubmissionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'NotFound', message: 'Submission not found.' });
    }
    if (existing.paymentStatus !== 'PAYMENT_CONFIRMED' || existing.moderationStatus !== 'APPROVED') {
      return res.status(400).json({
        error: 'PreconditionFailed',
        message: 'Submission must have verified payment and moderator approval before publishing.'
      });
    }

    const cleanHandle = (targetInstagramHandle || existing.universityInstagramHandle || 'campusconnect').replace(/^@/, '');
    const postCode = crypto.randomBytes(5).toString('hex');
    const postUrl = (typeof customPostUrl === 'string' && customPostUrl.trim())
      ? customPostUrl.trim()
      : `https://www.instagram.com/p/C_${postCode}/`;

    const sub = dbInstance.publishSubmissionToInstagram(req.params.id, postUrl, cleanHandle, req.admin?.email || 'admin');

    if (sub.studentEmail) {
      const baseUrl = getBaseUrl(req);
      dbInstance.sendUniversityEmail({
        universityId: sub.universityId || sub.universitySlug || 'general',
        eventType: 'INSTAGRAM_PUBLISHED',
        recipient: sub.studentEmail,
        variables: {
          student_name: sub.studentDisplayName,
          student_email: sub.studentEmail,
          submission_reference: sub.id,
          instagram_post_url: sub.instagramPostUrl,
          university_instagram: cleanHandle,
          base_url: baseUrl,
          continuation_link: `${baseUrl}/university/${sub.universitySlug || 'general'}`
        },
        idempotencyKey: `publish_${sub.id}_${Date.now()}`
      }).catch((err) => console.error('[PublishEmailTrigger]', err));
    }

    return res.json({
      success: true,
      publishedAt: sub.publishedAt,
      instagramPostUrl: sub.instagramPostUrl,
      targetHandle: `@${cleanHandle}`,
      submission: sub,
      message: `Post successfully published to official university account @${cleanHandle}!`
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'PublishFailed', message: err.message });
  }
});

// -----------------------------------------------------------------------------
// SECURE FILE UPLOAD & SIGNED FILE SERVING
// -----------------------------------------------------------------------------

app.post('/api/uploads/photo', requireUserOrAdminAuth, (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const { dataUrl, universityId } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'BadRequest', message: 'Image dataUrl is required.' });
    }
    const ownerUid = req.admin?.adminId || req.user?.id || 'unknown';
    const stored = validateAndStoreImageUpload(dataUrl, 8 * 1024 * 1024);

    dbInstance.registerUploadedFile({
      id: stored.fileId,
      ownerUid,
      universityId: typeof universityId === 'string' ? universityId : undefined,
      mimeType: stored.mimeType,
      ext: stored.ext,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      isPublic: false,
      createdAt: new Date().toISOString()
    });

    const signed = signFileAccessToken(stored.fileId, 1800);
    return res.status(201).json({
      success: true,
      fileId: stored.fileId,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      url: `/api/files/${stored.fileId}`,
      previewUrl: `/api/files/${stored.fileId}?exp=${signed.exp}&sig=${signed.sig}`
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'UploadRejected', message: err.message || 'Invalid image upload.' });
  }
});

app.get('/api/files/:id', (req: AuthenticatedUserRequest, res: Response) => {
  const fileId = (req.params.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(fileId)) {
    return res.status(400).json({ error: 'InvalidFileId', message: 'Malformed file identifier.' });
  }

  const record = dbInstance.getUploadedFile(fileId);
  if (!record) {
    return res.status(404).json({ error: 'NotFound', message: 'File not found.' });
  }

  let authorized = record.isPublic;

  if (!authorized && req.query.exp && req.query.sig) {
    authorized = verifyFileAccessToken(fileId, String(req.query.exp), String(req.query.sig));
  }

  if (!authorized) {
    const adminToken = extractAdminToken(req);
    if (adminToken) {
      const adminSess = dbInstance.validateSession(adminToken);
      if (adminSess && adminSess.role === 'Admin' && adminSess.mfaVerified) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    const userToken = extractUserToken(req);
    if (userToken) {
      const validated = dbInstance.validateUserSession(userToken);
      if (validated && validated.user.id === record.ownerUid) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view this file.' });
  }

  const filePath = resolvePrivateUploadPath(record.id, record.ext);
  if (!filePath) {
    return res.status(404).json({ error: 'NotFound', message: 'File binary unavailable.' });
  }

  res.setHeader('Content-Type', record.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', 'sandbox');
  res.setHeader('Cache-Control', record.isPublic ? 'public, max-age=3600' : 'private, no-store');
  return res.sendFile(filePath);
});

// -----------------------------------------------------------------------------
// STUDENT SUBMISSIONS & AUTHENTICATED PROFILE ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/submissions', (_req: Request, res: Response) => {
  return res.json({ submissions: dbInstance.getPublicSubmissions() });
});

app.get('/api/submissions/mine', requireUserAuth, (req: AuthenticatedUserRequest, res: Response) => {
  return res.json({ submissions: dbInstance.getSubmissionsByStudent(req.user!.id) });
});

app.post('/api/submissions', requireUserAuth, (req: AuthenticatedUserRequest, res: Response) => {
  const clientIp = getNormalizedClientIp(req);
  const limit = dbInstance.consumeRateLimit(`sub_create:${req.user!.id}:${clientIp}`, 12, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'TooManyRequests',
      message: 'Submission rate limit reached. Please wait a few minutes.'
    });
  }

  try {
    const body = req.body || {};
    const targetCampus = dbInstance.getCampusBySlug(body.universitySlug || body.universityId || '');
    if (!targetCampus) {
      return res.status(400).json({ error: 'InvalidUniversity', message: 'Please select a valid university campus.' });
    }

    if (!body.publicationConsent || !body.rightsConfirmed || !body.termsAgreed) {
      return res.status(400).json({
        error: 'ConsentRequired',
        message: 'Publication consent, rights confirmation, and terms agreement are required.'
      });
    }

    const resolveSubmissionImage = (rawVal: unknown, fieldName: string): string => {
      if (typeof rawVal !== 'string' || !rawVal.trim()) {
        throw new Error(`${fieldName} is required.`);
      }
      const trimmed = rawVal.trim();
      if (trimmed.startsWith('data:')) {
        const stored = validateAndStoreImageUpload(trimmed, 8 * 1024 * 1024);
        dbInstance.registerUploadedFile({
          id: stored.fileId,
          ownerUid: req.user!.id,
          universityId: targetCampus.id,
          mimeType: stored.mimeType,
          ext: stored.ext,
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          isPublic: false,
          createdAt: new Date().toISOString()
        });
        return `/api/files/${stored.fileId}`;
      }
      if (trimmed.startsWith('/api/files/')) {
        const fid = trimmed.replace('/api/files/', '').split('?')[0];
        const rec = dbInstance.getUploadedFile(fid);
        if (!rec || rec.ownerUid !== req.user!.id) {
          throw new Error(`Invalid or unauthorized file reference for ${fieldName}.`);
        }
        return `/api/files/${fid}`;
      }
      const urlCheck = validateSafeHttpUrl(trimmed, { allowHttp: false });
      if (!urlCheck.valid || !urlCheck.normalized) {
        throw new Error(`Invalid ${fieldName}: ${urlCheck.reason}`);
      }
      return urlCheck.normalized;
    };

    const safeOriginalPath = resolveSubmissionImage(body.originalImagePath, 'originalImagePath');
    const safeWatermarkedPath = body.watermarkedImagePath
      ? resolveSubmissionImage(body.watermarkedImagePath, 'watermarkedImagePath')
      : safeOriginalPath;

    const cleanId = typeof body.id === 'string' && /^sub_[a-zA-Z0-9_-]{4,40}$/.test(body.id)
      ? body.id
      : `sub_${crypto.randomBytes(6).toString('hex')}`;

    const existing = dbInstance.getSubmissionById(cleanId);
    if (existing && existing.studentUid !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Cannot overwrite another student submission.' });
    }

    // Strictly enforce server-authoritative ownership & workflow state (never trust client status)
    const authoritativeSubmission: FeaturedSubmission = {
      id: cleanId,
      studentUid: req.user!.id,
      studentDisplayName: String(body.studentDisplayName || req.user!.name || 'Student').trim().slice(0, 100),
      studentEmail: req.user!.email,
      studentAvatarUrl: safeWatermarkedPath,
      universityId: targetCampus.id,
      universityName: targetCampus.name,
      universitySlug: targetCampus.slug,
      universityInstagramHandle: targetCampus.instagramHandle,
      personalInstagramHandle: typeof body.personalInstagramHandle === 'string'
        ? body.personalInstagramHandle.trim().replace(/^@/, '').slice(0, 60)
        : undefined,
      instagramHandle: typeof body.instagramHandle === 'string'
        ? body.instagramHandle.trim().slice(0, 62)
        : undefined,
      major: typeof body.major === 'string' ? body.major.trim().slice(0, 100) : undefined,
      classYear: typeof body.classYear === 'string' ? body.classYear.trim().slice(0, 12) : targetCampus.classYear,
      snapchatHandle: typeof body.snapchatHandle === 'string' ? body.snapchatHandle.trim().slice(0, 60) : undefined,
      tiktokHandle: typeof body.tiktokHandle === 'string' ? body.tiktokHandle.trim().slice(0, 60) : undefined,
      originalImagePath: safeOriginalPath,
      watermarkedImagePath: safeWatermarkedPath,
      caption: String(body.caption || '').trim().slice(0, 1200),
      publicationConsent: true,
      rightsConfirmed: true,
      termsAgreed: true,
      paymentStatus: existing?.paymentStatus || 'AWAITING_PAYMENT',
      paymentReference: existing?.paymentReference,
      paymentAmount: 6.00,
      moderationStatus: existing?.moderationStatus || 'PENDING',
      publishingStatus: existing?.publishingStatus || 'NOT_READY',
      submittedAt: existing?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = dbInstance.saveSubmission(authoritativeSubmission);

    if (saved.studentEmail) {
      const baseUrl = getBaseUrl(req);
      dbInstance.sendUniversityEmail({
        universityId: saved.universityId || 'general',
        eventType: 'SUBMISSION_RECEIVED',
        recipient: saved.studentEmail,
        variables: {
          student_name: saved.studentDisplayName,
          student_email: saved.studentEmail,
          submission_reference: saved.id,
          base_url: baseUrl,
          continuation_link: `${baseUrl}/university/${saved.universitySlug || 'general'}`
        },
        idempotencyKey: `sub_recv_${saved.id}`
      }).catch((err) => console.error('[SubmissionReceivedEmailTrigger]', err));
    }

    return res.status(201).json({ success: true, submission: saved });
  } catch (err: any) {
    return res.status(400).json({ error: 'SubmissionSaveFailed', message: err.message || 'Could not save submission.' });
  }
});

app.post('/api/users/register', (req: Request, res: Response) => {
  const clientIp = getNormalizedClientIp(req);
  const limit = dbInstance.consumeRateLimit(`user_reg:${clientIp}`, 10, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many registration attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`
    });
  }

  try {
    const registered = dbInstance.registerUser(req.body || {});
    const loginRes = dbInstance.loginUser(registered.email, String(req.body?.password || ''), clientIp);
    if (loginRes.sessionToken) {
      res.cookie('cc_user_session', loginRes.sessionToken, {
        ...getCookieSecurityFlags(req),
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    if (registered.email) {
      const baseUrl = getBaseUrl(req);
      dbInstance.sendUniversityEmail({
        universityId: registered.universityId || registered.universitySlug || 'general',
        eventType: 'WELCOME',
        recipient: registered.email,
        variables: {
          student_name: registered.name,
          student_email: registered.email,
          university_name: registered.universityName,
          base_url: baseUrl,
          continuation_link: registered.universitySlug ? `${baseUrl}/university/${registered.universitySlug}` : baseUrl
        },
        idempotencyKey: `welcome_${registered.id}`
      }).catch((err) => console.error('[WelcomeEmailTrigger]', err));
    }

    return res.status(201).json({
      success: true,
      user: loginRes.user || registered,
      expiresAt: loginRes.expiresAt
    });
  } catch (err: any) {
    const status = err.message?.includes('already exists') ? 409 : 400;
    return res.status(status).json({ error: 'UserRegistrationFailed', message: err.message });
  }
});

app.post('/api/users/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !String(email).includes('@') || !password) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email and password are required.' });
    }
    const clientIp = getNormalizedClientIp(req);
    const result = dbInstance.loginUser(String(email), String(password), clientIp);
    if (!result.authenticated || !result.user || !result.sessionToken) {
      return res.status(result.locked ? 429 : 401).json({
        error: result.locked ? 'AccountLocked' : 'AuthenticationFailed',
        message: result.message || 'Invalid email or password.'
      });
    }

    res.cookie('cc_user_session', result.sessionToken, {
      ...getCookieSecurityFlags(req),
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      user: result.user,
      expiresAt: result.expiresAt
    });
  } catch {
    return res.status(500).json({ error: 'LoginFailed', message: 'Failed to sign in.' });
  }
});

app.get('/api/users/me', requireUserAuth, (req: AuthenticatedUserRequest, res: Response) => {
  return res.json({ authenticated: true, user: req.user });
});

app.post('/api/users/logout', (req: Request, res: Response) => {
  const token = extractUserToken(req);
  if (token) {
    dbInstance.invalidateUserSession(token);
  }
  res.clearCookie('cc_user_session', getCookieSecurityFlags(req));
  return res.json({ success: true, message: 'Signed out successfully.' });
});

app.put('/api/users/profile', requireUserAuth, (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const updated = dbInstance.updateUserProfile(req.user!.id, req.body || {});
    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: 'ProfileUpdateFailed', message: err.message || 'Could not update profile.' });
  }
});

app.post('/api/users/change-password', requireUserAuth, (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'BadRequest', message: 'Current password and new password are required.' });
    }
    const result = dbInstance.changeUserPassword(req.user!.id, String(currentPassword), String(newPassword));
    if (!result.success) {
      return res.status(400).json({ error: 'PasswordChangeFailed', message: result.message });
    }
    res.clearCookie('cc_user_session', getCookieSecurityFlags(req));
    return res.json({
      success: true,
      sessionRevoked: true,
      message: 'Password updated and prior sessions revoked. Please sign in again.'
    });
  } catch {
    return res.status(500).json({ error: 'PasswordChangeFailed', message: 'Could not update password.' });
  }
});

// -----------------------------------------------------------------------------
// PUBLIC DIRECTORY, PAYMENTS & SIGNED WEBHOOKS
// -----------------------------------------------------------------------------

app.get('/api/payment-config', (_req: Request, res: Response) => {
  const { publishableKey, secretKey } = resolveStripeCredentials();
  const configured = Boolean(publishableKey && secretKey);
  return res.json({
    stripeConfigured: configured,
    publishableKey: configured ? publishableKey : ''
  });
});

app.get('/api/campuses', (_req: Request, res: Response) => {
  return res.json({ campuses: dbInstance.getCampuses() });
});

app.get('/api/campuses/:slug', (req: Request, res: Response) => {
  const campus = dbInstance.getCampusBySlug(req.params.slug);
  if (!campus) {
    return res.status(404).json({ error: 'NotFound', message: `Campus "${req.params.slug}" not found.` });
  }
  return res.json({ campus });
});

app.post('/api/payments/create-intent', requireUserAuth, async (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const { submissionId, idempotencyKey } = req.body || {};
    if (!submissionId) {
      return res.status(400).json({ error: 'BadRequest', message: 'submissionId is required.' });
    }

    const sub = dbInstance.getSubmissionById(String(submissionId));
    if (!sub) {
      return res.status(404).json({ error: 'NotFound', message: 'Submission not found.' });
    }
    if (sub.studentUid !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only pay for your own submission.' });
    }
    if (sub.paymentStatus === 'PAYMENT_CONFIRMED') {
      return res.status(409).json({ error: 'AlreadyPaid', message: 'This submission has already been paid and confirmed.' });
    }

    const { publishableKey, secretKey } = resolveStripeCredentials();
    if (!secretKey || !publishableKey) {
      return res.status(503).json({
        error: 'PaymentGatewayNotConfigured',
        message: 'Live Stripe payment processing requires STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY.'
      });
    }

    const bodyParams = new URLSearchParams({
      amount: '600',
      currency: 'usd',
      'metadata[submissionId]': sub.id,
      'metadata[studentUid]': req.user!.id,
      'metadata[universityId]': sub.universityId,
      'automatic_payment_methods[enabled]': 'true'
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': typeof idempotencyKey === 'string' && idempotencyKey.trim()
          ? idempotencyKey.trim()
          : `pi_create_${sub.id}_${req.user!.id}`
      },
      body: bodyParams.toString()
    });

    const intent: any = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok || !intent?.id || !intent?.client_secret) {
      return res.status(502).json({
        error: 'StripeError',
        message: intent?.error?.message || 'Unable to initialize Stripe PaymentIntent.'
      });
    }

    return res.json({
      success: true,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      publishableKey,
      amountUsd: 6.00,
      currency: 'USD'
    });
  } catch {
    return res.status(500).json({ error: 'PaymentInitFailed', message: 'Could not initialize Stripe checkout.' });
  }
});

app.post('/api/payments/verify', requireUserAuth, async (req: AuthenticatedUserRequest, res: Response) => {
  try {
    const { submissionId, paymentIntentId, idempotencyKey } = req.body || {};
    if (!submissionId || !paymentIntentId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'submissionId and Stripe paymentIntentId are required for server-side verification.'
      });
    }

    const sub = dbInstance.getSubmissionById(String(submissionId));
    if (!sub) {
      return res.status(404).json({ error: 'NotFound', message: 'Submission not found.' });
    }
    if (sub.studentUid !== req.user!.id) {
      dbInstance.logSecurityEvent(
        'HIGH',
        'PAYMENT_IDOR_ATTEMPT',
        `Student ${req.user!.email} attempted to verify payment for another user's submission ${sub.id}`,
        req.user!.email,
        getNormalizedClientIp(req)
      );
      return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to verify this submission payment.' });
    }

    const { secretKey } = resolveStripeCredentials();
    if (!secretKey) {
      return res.status(503).json({
        error: 'PaymentGatewayNotConfigured',
        message: 'Stripe secret key is not configured on the server; payment cannot be verified.'
      });
    }

    const cleanPi = String(paymentIntentId).trim();
    if (!cleanPi.startsWith('pi_')) {
      return res.status(400).json({ error: 'InvalidPaymentIntent', message: 'Invalid Stripe PaymentIntent identifier.' });
    }

    const stripeRes = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(cleanPi)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });
    const intent: any = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok || !intent?.id) {
      return res.status(402).json({
        error: 'PaymentVerificationFailed',
        message: intent?.error?.message || 'Unable to verify PaymentIntent with Stripe.'
      });
    }

    if (
      intent.status !== 'succeeded' ||
      Number(intent.amount_received) < 600 ||
      String(intent.currency || '').toLowerCase() !== 'usd'
    ) {
      return res.status(402).json({
        error: 'PaymentNotSettled',
        message: `Stripe PaymentIntent status is "${intent.status}" with amount_received=${intent.amount_received}.`
      });
    }

    if (
      (intent.metadata?.submissionId && intent.metadata.submissionId !== sub.id) ||
      (intent.metadata?.studentUid && intent.metadata.studentUid !== req.user!.id)
    ) {
      return res.status(403).json({
        error: 'PaymentOwnershipMismatch',
        message: 'Stripe PaymentIntent metadata does not match this submission.'
      });
    }

    const payment = dbInstance.recordPayment({
      submissionId: sub.id,
      studentUid: req.user!.id,
      studentName: sub.studentDisplayName || req.user!.name,
      universityId: sub.universityId,
      provider: 'STRIPE_CARD',
      providerTransactionReference: intent.id,
      amountUsd: Number(intent.amount_received) / 100,
      currency: 'USD',
      status: 'CONFIRMED',
      idempotencyKey: typeof idempotencyKey === 'string' && idempotencyKey ? idempotencyKey : `pi_${intent.id}`,
      verifiedAt: new Date().toISOString()
    });

    sub.paymentStatus = 'PAYMENT_CONFIRMED';
    sub.paymentReference = intent.id;
    sub.paymentAmount = payment.amountUsd;
    sub.updatedAt = new Date().toISOString();
    dbInstance.saveSubmission(sub);

    if (sub.studentEmail) {
      const baseUrl = getBaseUrl(req);
      dbInstance.sendUniversityEmail({
        universityId: sub.universityId || 'general',
        eventType: 'PAYMENT_CONFIRMATION',
        recipient: sub.studentEmail,
        variables: {
          student_name: payment.studentName || sub.studentDisplayName,
          student_email: sub.studentEmail,
          submission_reference: intent.id,
          payment_amount: payment.amountUsd.toFixed(2),
          payment_status: 'CONFIRMED',
          base_url: baseUrl,
          continuation_link: `${baseUrl}/university/${sub.universitySlug || 'general'}`
        },
        idempotencyKey: `pay_conf_${payment.id}`
      }).catch((err) => console.error('[PaymentVerifyEmailTrigger]', err));
    }

    return res.json({
      success: true,
      payment,
      message: `Stripe PaymentIntent ${intent.id} ($${payment.amountUsd.toFixed(2)} USD) verified successfully.`
    });
  } catch {
    return res.status(500).json({ error: 'PaymentFailed', message: 'Failed to verify payment.' });
  }
});

// Cryptographically Signed Stripe Webhook Receiver (Fail-Closed)
app.post('/api/payments/webhook', (req: any, res: Response) => {
  try {
    const { webhookSecret } = resolveStripeCredentials();
    if (!webhookSecret) {
      return res.status(503).json({
        error: 'WebhookSecretNotConfigured',
        message: 'STRIPE_WEBHOOK_SECRET is not configured on the server.'
      });
    }

    const sigHeader = req.headers['stripe-signature'] as string | undefined;
    const rawBody: Buffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8');

    if (!verifyStripeWebhookSignature(rawBody, sigHeader, webhookSecret, 300)) {
      dbInstance.logSecurityEvent(
        'HIGH',
        'PAYMENT_WEBHOOK_SIGNATURE_INVALID',
        `Rejected forged or expired Stripe webhook call from IP ${getNormalizedClientIp(req)}`,
        undefined,
        getNormalizedClientIp(req)
      );
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired Stripe-Signature header.'
      });
    }

    const event = req.body || {};
    const eventType = String(event.type || '');
    const obj = event.data?.object || {};
    const txnRef = obj.id || event.id;
    const submissionId = obj.metadata?.submissionId;
    const studentUid = obj.metadata?.studentUid;
    const universityId = obj.metadata?.universityId || 'general';
    const amountCents = Number(obj.amount_received ?? obj.amount ?? 0);
    const currency = String(obj.currency || 'usd').toLowerCase();

    if (!txnRef) {
      return res.status(400).json({ error: 'BadRequest', message: 'Missing transaction reference in webhook payload.' });
    }

    const existingPayments = dbInstance.getPayments();
    const isDuplicate = existingPayments.some(
      (p) => p.providerTransactionReference === txnRef || (event.id && p.idempotencyKey === event.id)
    );
    if (isDuplicate) {
      return res.status(200).json({
        received: true,
        duplicate: true,
        message: 'Webhook event already processed idempotently.'
      });
    }

    const isFailure = eventType.includes('failed');
    if (!isFailure && (amountCents < 600 || currency !== 'usd')) {
      return res.status(400).json({
        error: 'InvalidPaymentAmount',
        message: 'Settled payment amount or currency does not meet minimum requirement.'
      });
    }

    const sub = submissionId ? dbInstance.getSubmissionById(String(submissionId)) : undefined;
    const payment = dbInstance.recordPayment({
      submissionId: sub?.id || String(submissionId || ''),
      studentUid: sub?.studentUid || String(studentUid || ''),
      studentName: sub?.studentDisplayName || 'Student',
      universityId: sub?.universityId || String(universityId),
      provider: 'STRIPE_CARD',
      providerTransactionReference: String(txnRef),
      amountUsd: amountCents / 100,
      currency: 'USD',
      status: isFailure ? 'FAILED' : 'CONFIRMED',
      idempotencyKey: event.id || `wh_${txnRef}`,
      verifiedAt: new Date().toISOString()
    });

    if (sub) {
      if (!isFailure) {
        sub.paymentStatus = 'PAYMENT_CONFIRMED';
        sub.paymentReference = String(txnRef);
        sub.paymentAmount = payment.amountUsd;
        sub.updatedAt = new Date().toISOString();
        dbInstance.saveSubmission(sub);
      }

      if (sub.studentEmail) {
        const baseUrl = getBaseUrl(req);
        dbInstance.sendUniversityEmail({
          universityId: sub.universityId || 'general',
          eventType: isFailure ? 'PAYMENT_FAILURE' : 'PAYMENT_CONFIRMATION',
          recipient: sub.studentEmail,
          variables: {
            student_name: payment.studentName || sub.studentDisplayName,
            student_email: sub.studentEmail,
            submission_reference: String(txnRef),
            payment_amount: payment.amountUsd.toFixed(2),
            payment_status: isFailure ? 'FAILED' : 'CONFIRMED',
            base_url: baseUrl,
            continuation_link: `${baseUrl}/university/${sub.universitySlug || 'general'}`
          },
          idempotencyKey: `pay_hook_${payment.id}`
        }).catch((err) => console.error('[PaymentWebhookEmailTrigger]', err));
      }
    }

    return res.status(200).json({
      received: true,
      duplicate: false,
      paymentId: payment.id,
      status: payment.status
    });
  } catch {
    return res.status(400).json({ error: 'WebhookError', message: 'Failed to process Stripe webhook.' });
  }
});

// -----------------------------------------------------------------------------
// TRANSACTIONAL EMAIL WEBHOOK RECEIVER (Svix / HMAC Fail-Closed)
// -----------------------------------------------------------------------------
const handleEmailWebhook = (req: any, res: Response) => {
  try {
    const emailIntegration = dbInstance.getIntegrations().find((i) => i.id === 'email_transactional');
    const dbWebhookSecret = emailIntegration?.keys?.webhookSecret || emailIntegration?.keys?.resendWebhookSecret || '';
    const webhookSecret = (
      process.env.RESEND_WEBHOOK_SECRET ||
      process.env.EMAIL_WEBHOOK_SECRET ||
      process.env.WEBHOOK_SECRET ||
      dbWebhookSecret ||
      ''
    ).trim();

    if (!webhookSecret) {
      return res.status(503).json({
        error: 'WebhookSecretNotConfigured',
        message: 'Email webhook signing secret is not configured.'
      });
    }

    const svixId = req.headers['svix-id'] as string | undefined;
    const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
    const svixSig = req.headers['svix-signature'] as string | undefined;
    const headerSecret = req.headers['x-webhook-secret'] as string | undefined;
    const rawBodyStr: string = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});

    let signatureVerified = false;
    if (headerSecret && timingSafeEqualStr(headerSecret.trim(), webhookSecret)) {
      signatureVerified = true;
    } else if (svixId && svixTimestamp && svixSig) {
      const tsNum = Number(svixTimestamp);
      const nowSec = Math.floor(Date.now() / 1000);
      if (Number.isFinite(tsNum) && Math.abs(nowSec - tsNum) <= 300) {
        try {
          const cleanSecret = webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : webhookSecret;
          const secretBytes = Buffer.from(cleanSecret, 'base64');
          const signedContent = `${svixId}.${svixTimestamp}.${rawBodyStr}`;
          const expectedSig = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
          const signatures = svixSig.split(' ').map((s) => s.replace(/^v1,/, '').trim());
          signatureVerified = signatures.some((sig) => timingSafeEqualStr(sig, expectedSig));
        } catch {
          signatureVerified = false;
        }
      }
    }

    if (!signatureVerified) {
      dbInstance.logSecurityEvent(
        'HIGH',
        'EMAIL_WEBHOOK_SIGNATURE_INVALID',
        `Rejected unauthenticated email webhook call from IP ${getNormalizedClientIp(req)}`,
        undefined,
        getNormalizedClientIp(req)
      );
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid webhook signature.' });
    }

    const body = req.body || {};
    const eventType = body.type || body.event || 'email.delivered';
    const emailData = body.data || body;
    const emailId = emailData.email_id || emailData.id || body.email_id || body.id;
    const recipient = Array.isArray(emailData.to) ? emailData.to[0] : (emailData.to || body.recipient);

    let status: 'DELIVERED' | 'QUEUED' | 'FAILED' | 'BOUNCED' = 'DELIVERED';
    let errorMessage: string | undefined;

    if (eventType === 'email.bounced' || eventType.includes('bounce')) {
      status = 'BOUNCED';
      errorMessage = emailData.bounce?.message || 'Bounced by recipient mail exchange';
    } else if (eventType === 'email.complained' || eventType.includes('complaint')) {
      status = 'BOUNCED';
      errorMessage = 'Spam complaint recorded';
    } else if (eventType === 'email.delivery_delayed' || eventType.includes('delayed')) {
      status = 'QUEUED';
      errorMessage = 'Delivery delayed by carrier';
    } else if (eventType === 'email.sent' || eventType === 'email.queued') {
      status = 'QUEUED';
    }

    const metadataUpdate: Record<string, any> = {
      lastWebhookEvent: eventType,
      lastWebhookAt: new Date().toISOString(),
      signatureVerified: true
    };
    if (eventType === 'email.opened') metadataUpdate.openedAt = new Date().toISOString();
    if (eventType === 'email.clicked') metadataUpdate.clickedAt = new Date().toISOString();

    const updated = emailId ? dbInstance.updateEmailLogStatus(emailId, status, errorMessage, metadataUpdate) : null;

    dbInstance.logAudit({
      actorUid: 'email_webhook',
      actorRole: 'System',
      action: 'EMAIL_WEBHOOK_PROCESSED',
      targetType: 'SYSTEM',
      targetId: emailId || 'unknown',
      details: `Processed ${eventType} webhook for message ${emailId || 'unknown'} (Recipient: ${recipient || 'unknown'}, Status: ${status})`
    });

    return res.status(200).json({
      received: true,
      success: true,
      event: eventType,
      emailId,
      status,
      signatureVerified: true,
      logUpdated: Boolean(updated)
    });
  } catch {
    return res.status(400).json({ error: 'WebhookError', message: 'Failed to process email webhook.' });
  }
};

app.post('/api/webhooks/resend', handleEmailWebhook);
app.post('/api/webhooks/email', handleEmailWebhook);
app.post('/api/email/webhook', handleEmailWebhook);

app.get('/api/webhooks/resend', (_req: Request, res: Response) => {
  return res.status(200).json({ status: 'ACTIVE', provider: 'Resend Email Webhook Gateway' });
});
app.get('/api/webhooks/email', (_req: Request, res: Response) => {
  return res.status(200).json({ status: 'ACTIVE', provider: 'Email Webhook Gateway' });
});
app.get('/api/email/webhook', (_req: Request, res: Response) => {
  return res.status(200).json({ status: 'ACTIVE', provider: 'Email Webhook Gateway' });
});

// Unknown API routes always return clean JSON 404 (never fall through to HTML)
app.all('/api/*', (_req: Request, res: Response) => {
  return res.status(404).json({ error: 'NotFound', message: 'API endpoint not found.' });
});

// Safe Global Error Handler (Suppress stack traces and internal details in HTTP responses)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'InvalidJson', message: 'Malformed JSON request body.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'PayloadTooLarge', message: 'Request payload exceeds permitted size limit.' });
  }
  console.error('[UnhandledServerError]', err?.message || err);
  return res.status(500).json({ error: 'InternalServerError', message: 'An unexpected server error occurred.' });
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER OR PRODUCTION STATIC FILE SERVING
// -----------------------------------------------------------------------------

const DEFAULT_SSR_OG_IMAGE =
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80';

function extractCommunitySlugFromPath(reqPath: string): string | null {
  const clean = (reqPath || '').split('?')[0].split('#')[0];
  const match = clean.match(/^\/(?:ig|u|university|submit)\/([^/]+)\/?$/i);
  if (!match) return null;
  try {
    const slug = decodeURIComponent(match[1]).replace(/^@/, '').trim();
    return /^[a-zA-Z0-9._-]{2,120}$/.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

function injectCommunityMetaHtml(rawHtml: string, req: Request): string {
  const slug = extractCommunitySlugFromPath(req.path);
  if (!slug) return rawHtml;

  const campus = dbInstance.getCampusBySlug(slug);
  if (!campus) return rawHtml;

  const rawHandle = (campus.instagramHandle || campus.slug || '').trim();
  const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  const classYear = campus.classYear ? `Class of ${campus.classYear}` : 'Student Community';
  const isBuilder = req.path.toLowerCase().startsWith('/submit/');

  const rawTitle = isBuilder
    ? `Submit Post – ${campus.name} (${handle}) | CampusConnect`
    : `${campus.name} ${classYear} (${handle}) | CampusConnect`;
  const rawDescription = campus.description?.trim()
    ? `${campus.description.trim()} Share your campus intro and get featured on ${handle}.`
    : `Official ${campus.name} ${classYear} student community on CampusConnect. Get featured on ${handle}.`;

  const host = (req.headers['x-forwarded-host'] as string || req.get('host') || 'localhost:3000').split(',')[0].trim();
  const proto = (req.headers['x-forwarded-proto'] as string || (req.secure ? 'https' : 'http')).split(',')[0].trim();
  const canonicalUrl = `${proto}://${host}/ig/${encodeURIComponent(campus.slug)}`;

  const imageCheck = validateSafeHttpUrl(campus.coverUrl || campus.logoUrl || '');
  const ogImage = imageCheck.valid && imageCheck.normalized ? imageCheck.normalized : DEFAULT_SSR_OG_IMAGE;

  const trimAtWord = (text: string, max: number) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    const sliced = clean.slice(0, max - 1);
    const spaceIdx = sliced.lastIndexOf(' ');
    return `${(spaceIdx > max * 0.6 ? sliced.slice(0, spaceIdx) : sliced).trimEnd()}…`;
  };

  const safeTitle = escapeHtml(trimAtWord(rawTitle, 100));
  const safeDesc = escapeHtml(trimAtWord(rawDescription, 160));
  const safeImage = escapeHtml(ogImage);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeAlt = escapeHtml(`${campus.name} ${classYear} (${handle}) campus community cover`);

  let html = rawHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`)
    .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${safeImage}" />`)
    .replace(/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${safeAlt}" />`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`)
    .replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safeImage}" />`);

  if (!/property="og:url"/i.test(html)) {
    html = html.replace('</head>', `    <meta property="og:url" content="${safeUrl}" />\n  </head>`);
  }
  if (!/rel="canonical"/i.test(html)) {
    html = html.replace('</head>', `    <link rel="canonical" href="${safeUrl}" />\n  </head>`);
  }

  return html;
}

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.get(['/ig/:slug', '/u/:slug', '/university/:slug', '/submit/:slug'], async (req: Request, res: Response, next: NextFunction) => {
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        const template = fs.readFileSync(indexPath, 'utf-8');
        const withMeta = injectCommunityMetaHtml(template, req);
        const transformed = await vite.transformIndexHtml(req.originalUrl, withMeta);
        res.status(200).setHeader('Content-Type', 'text/html').end(transformed);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      try {
        if (extractCommunitySlugFromPath(req.path)) {
          const raw = fs.readFileSync(indexPath, 'utf-8');
          const withMeta = injectCommunityMetaHtml(raw, req);
          return res.status(200).setHeader('Content-Type', 'text/html').end(withMeta);
        }
      } catch {
        // Fallback to standard static index.html
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusConnect Server listening on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
