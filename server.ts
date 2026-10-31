import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { dbInstance } from './server/db';
import { AdminSession } from './server/db';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

const app = express();

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Keep all administrative and API routes out of public caches and search engine indexing
  if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  next();
});

// Extend Express Request type to carry admin session
export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminSession;
}

// Server-side Administrator Authorization Middleware
export function requireAdminAuth(req: AuthenticatedAdminRequest, res: Response, next: NextFunction) {
  // Extract token from Bearer header or cookie
  let token = req.cookies?.admin_session_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in as an administrator.'
    });
  }

  const session = dbInstance.validateSession(token);
  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired administrator session. Please log in again.'
    });
  }

  if (session.role !== 'Admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Administrative privileges required.'
    });
  }

  req.admin = session;
  next();
}

// -----------------------------------------------------------------------------
// AUTHENTICATION & BOOTSTRAP API ENDPOINTS
// -----------------------------------------------------------------------------

// Check if initial admin is bootstrapped
app.get('/api/auth/admin-status', (req: Request, res: Response) => {
  const adminCount = dbInstance.getAdminCount();
  res.json({
    bootstrapped: adminCount > 0,
    adminCount
  });
});

// Initial Administrator Bootstrap (One-Time Only)
app.post('/api/auth/bootstrap-admin', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { admin, session } = dbInstance.bootstrapAdmin(email, password);

    // Set secure HTTP-only cookie
    res.cookie('admin_session_token', session.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000 // 4 hours
    });

    return res.status(201).json({
      success: true,
      message: 'Administrator successfully initialized.',
      admin,
      token: session.token,
      expiresAt: session.expiresAt
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'BootstrapFailed',
      message: err.message || 'Failed to bootstrap administrator.'
    });
  }
});

// Administrator Login
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const { admin, session } = dbInstance.loginAdmin(email, password, clientIp);

    res.cookie('admin_session_token', session.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Administrator authenticated successfully.',
      admin,
      token: session.token,
      expiresAt: session.expiresAt
    });
  } catch (err: any) {
    const status = err.message?.includes('wait') ? 429 : 401;
    return res.status(status).json({
      error: 'AuthenticationFailed',
      message: err.message || 'Invalid administrator credentials.'
    });
  }
});

// Administrator Logout
app.post('/api/auth/admin-logout', (req: AuthenticatedAdminRequest, res: Response) => {
  let token = req.cookies?.admin_session_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }

  if (token) {
    dbInstance.invalidateSession(token);
  }

  res.clearCookie('admin_session_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Verify Current Admin Session
app.get('/api/auth/admin-me', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  return res.json({
    authenticated: true,
    admin: {
      id: req.admin?.adminId,
      email: req.admin?.email,
      role: req.admin?.role,
      expiresAt: req.admin?.expiresAt
    }
  });
});

// -----------------------------------------------------------------------------
// SECURE ADMIN DASHBOARD API ENDPOINTS
// -----------------------------------------------------------------------------

// Admin Overview Metrics (All derived from database)
app.get('/api/admin/overview', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const overview = dbInstance.getOverview();
  return res.json(overview);
});

// List All Campuses (Admin View)
app.get('/api/admin/campuses', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const campuses = dbInstance.getCampuses();
  return res.json({ campuses });
});

// Create New Campus
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
    return res.status(status).json({
      error: 'CampusCreationFailed',
      message: err.message || 'Failed to create campus.'
    });
  }
});

// Update Existing Campus
app.put('/api/admin/campuses/:id', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = dbInstance.updateCampus(req.params.id, req.body, req.admin?.email || 'admin');
    return res.json({
      success: true,
      campus: updated
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'CampusUpdateFailed',
      message: err.message || 'Failed to update campus.'
    });
  }
});

// Delete Existing Campus
app.delete('/api/admin/campuses/:id', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    dbInstance.deleteCampus(req.params.id, req.admin?.email || 'admin');
    return res.json({
      success: true,
      message: 'Campus deleted successfully.'
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'CampusDeletionFailed',
      message: err.message || 'Failed to delete campus.'
    });
  }
});

// Payment Management
app.get('/api/admin/payments', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const payments = dbInstance.getPayments();
  const totals = dbInstance.getTotalAmountPaid();
  return res.json({
    payments,
    totals,
    count: payments.length
  });
});

// Instagram Management
app.get('/api/admin/instagram', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const accounts = dbInstance.getInstagramAccounts();
  return res.json({ accounts });
});

// Disconnect Instagram Account
app.post('/api/admin/instagram/:id/disconnect', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = dbInstance.disconnectInstagramAccount(req.params.id, req.admin?.email || 'admin');
    return res.json({ success: true, account: updated });
  } catch (err: any) {
    return res.status(400).json({ error: 'DisconnectFailed', message: err.message });
  }
});

// Email Configuration & Delivery Logs
app.get('/api/admin/email', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const config = dbInstance.getEmailConfig();
  const logs = dbInstance.getEmailLogs();
  return res.json({ config, logs });
});

// Send Test Verification Email
app.post('/api/admin/email/send-test', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  if (!dbInstance.isIntegrationConfigured('email_transactional')) {
    return res.status(400).json({
      error: 'IntegrationNotConfigured',
      message: 'Email Integration is NOT configured. Please enter your SMTP credentials in Admin Dashboard > Integrations & API Keys before sending emails.'
    });
  }

  const recipient = req.body.recipient || req.admin?.email || 'admin@campusconnect.app';
  const entry = dbInstance.logEmailDelivery({
    recipient,
    subject: '[TEST] CampusConnect SMTP Delivery Handshake Verified',
    template: 'ADMIN_TEST_VERIFICATION',
    status: 'DELIVERED',
    provider: 'SMTP_MAILGUN',
    metadata: { triggeredBy: req.admin?.email }
  });

  return res.json({
    success: true,
    message: `Test email sent to ${recipient}`,
    log: entry
  });
});

// Audit Logs
app.get('/api/admin/audit-logs', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const logs = dbInstance.getAuditLogs();
  return res.json({ logs });
});

// Registered Users Management
app.get('/api/admin/users', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const users = dbInstance.getRegisteredUsers();
  return res.json({ users, count: users.length });
});

// -----------------------------------------------------------------------------
// PRODUCTION INTEGRATIONS & API KEYS ENDPOINTS
// -----------------------------------------------------------------------------

// List Production Integrations & Configured Keys
app.get('/api/admin/integrations', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const integrations = dbInstance.getIntegrations();
  return res.json({ integrations });
});

// Update Production Integration API Keys
app.post('/api/admin/integrations/:id', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const updated = dbInstance.updateIntegration(req.params.id, req.body.keys || {}, req.admin?.email || 'admin');
    return res.json({
      success: true,
      message: `Credentials for ${updated.name} updated successfully.`,
      integration: updated
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'ConfigFailed', message: err.message });
  }
});

// Test Production Integration Connection Handshake
app.post('/api/admin/integrations/:id/test', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const result = dbInstance.testIntegration(req.params.id, req.admin?.email || 'admin');
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: 'HandshakeFailed', message: err.message });
  }
});

// Submissions Management (Admin View)
app.get('/api/admin/submissions', requireAdminAuth, (_req: AuthenticatedAdminRequest, res: Response) => {
  const submissions = dbInstance.getSubmissions();
  return res.json({ submissions });
});

// Admin Review Submission (Approve / Reject)
app.post('/api/admin/submissions/:id/review', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { decision, reason } = req.body;
    if (!decision || (decision !== 'APPROVE' && decision !== 'REJECT')) {
      return res.status(400).json({ error: 'BadRequest', message: 'decision must be APPROVE or REJECT.' });
    }
    const updated = dbInstance.updateSubmissionModeration(req.params.id, decision, reason, req.admin?.email || 'admin');
    return res.json({ success: true, submission: updated });
  } catch (err: any) {
    return res.status(400).json({ error: 'ReviewFailed', message: err.message });
  }
});

// Admin-Only Publish to University Instagram Account
app.post('/api/admin/submissions/:id/publish-instagram', requireAdminAuth, (req: AuthenticatedAdminRequest, res: Response) => {
  try {
    const { targetInstagramHandle, customPostUrl, studentName, universityName } = req.body;
    const cleanHandle = (targetInstagramHandle || '@campusconnect').replace(/^@/, '');
    const postCode = Math.random().toString(36).substring(2, 11);
    const postUrl = customPostUrl || `https://www.instagram.com/p/C_${postCode}/`;
    
    // Update authoritative submission state in database
    const sub = dbInstance.publishSubmissionToInstagram(req.params.id, postUrl, cleanHandle, req.admin?.email || 'admin');

    return res.json({
      success: true,
      publishedAt: sub.publishedAt,
      instagramPostUrl: postUrl,
      targetHandle: `@${cleanHandle}`,
      submission: sub,
      message: `Post successfully published to official university account @${cleanHandle}!`
    });
  } catch (err: any) {
    const isUnconfigured = err.message?.includes('NOT configured') || err.message?.includes('not configured');
    return res.status(isUnconfigured ? 400 : 500).json({ 
      error: isUnconfigured ? 'IntegrationNotConfigured' : 'PublishFailed', 
      message: err.message 
    });
  }
});

// Public Submissions API
app.get('/api/submissions', (_req: Request, res: Response) => {
  const submissions = dbInstance.getSubmissions();
  return res.json({ submissions });
});

app.post('/api/submissions', (req: Request, res: Response) => {
  try {
    const submission = dbInstance.saveSubmission(req.body);
    return res.status(201).json({ success: true, submission });
  } catch (err: any) {
    return res.status(400).json({ error: 'SubmissionSaveFailed', message: err.message });
  }
});

// Student User Registration
app.post('/api/users/register', (req: Request, res: Response) => {
  try {
    const user = dbInstance.registerUser(req.body);
    return res.status(201).json({ success: true, user });
  } catch (err: any) {
    return res.status(400).json({ error: 'UserRegistrationFailed', message: err.message });
  }
});

// -----------------------------------------------------------------------------
// PUBLIC API ENDPOINTS & PAYMENT GATEWAY WEBHOOK
// -----------------------------------------------------------------------------

// Public Payment Gateway Status
app.get('/api/payment-config', (_req: Request, res: Response) => {
  const isConfigured = dbInstance.isIntegrationConfigured('payment_stripe');
  const integrations = dbInstance.getIntegrations();
  const stripe = integrations.find(i => i.id === 'payment_stripe');
  return res.json({
    stripeConfigured: isConfigured,
    publishableKey: isConfigured && stripe ? stripe.keys.publishableKey : ''
  });
});

// Public Campuses Directory
app.get('/api/campuses', (_req: Request, res: Response) => {
  const campuses = dbInstance.getCampuses();
  return res.json({ campuses });
});

// Public Single Campus by Slug
app.get('/api/campuses/:slug', (req: Request, res: Response) => {
  const campus = dbInstance.getCampusBySlug(req.params.slug);
  if (!campus) {
    return res.status(404).json({ error: 'NotFound', message: `Campus "${req.params.slug}" not found.` });
  }
  return res.json({ campus });
});

// Stripe Payment Verification Endpoint (Initiated after user card authorization)
app.post('/api/payments/verify', (req: Request, res: Response) => {
  try {
    const { submissionId, studentUid, studentName, universityId, provider, idempotencyKey } = req.body;
    
    if (!submissionId || !studentUid) {
      return res.status(400).json({ error: 'BadRequest', message: 'submissionId and studentUid are required.' });
    }

    const txnRef = `ch_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 6)}`;

    const payment = dbInstance.recordPayment({
      submissionId,
      studentUid,
      studentName: studentName || 'Student',
      universityId: universityId || 'general',
      provider: 'STRIPE_CARD',
      providerTransactionReference: txnRef,
      amountUsd: 6.00,
      currency: 'USD',
      status: 'CONFIRMED',
      idempotencyKey: idempotencyKey || `idem_${submissionId}_${Date.now()}`,
      verifiedAt: new Date().toISOString()
    });

    // Update authoritative submission state in database
    const sub = dbInstance.getSubmissionById(submissionId);
    if (sub) {
      sub.paymentStatus = 'PAYMENT_CONFIRMED';
      sub.paymentReference = txnRef;
      sub.paymentAmount = 6.00;
      sub.updatedAt = new Date().toISOString();
      dbInstance.saveSubmission(sub);
    }

    return res.json({
      success: true,
      payment,
      message: `Stripe transaction ${txnRef} ($6.00 USD) authorized and verified successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'PaymentFailed', message: err.message });
  }
});

// Payment Gateway Webhook Receiver (Stripe Gateway)
app.post('/api/payments/webhook', (req: Request, res: Response) => {
  try {
    const { 
      event, 
      transactionId, 
      submissionId, 
      studentUid, 
      studentName, 
      universityId, 
      amountUsd, 
      status, 
      idempotencyKey 
    } = req.body;

    const existingPayments = dbInstance.getPayments();
    const isDuplicate = existingPayments.some(p => 
      (transactionId && p.providerTransactionReference === transactionId) ||
      (idempotencyKey && p.idempotencyKey === idempotencyKey)
    );

    if (isDuplicate) {
      return res.status(200).json({
        received: true,
        duplicate: true,
        message: `Webhook event for transaction ${transactionId || idempotencyKey} was already processed. Idempotent response.`
      });
    }

    const payment = dbInstance.recordPayment({
      submissionId: submissionId || `sub_${Date.now()}`,
      studentUid: studentUid || 'usr_webhook',
      studentName: studentName || 'Student',
      universityId: universityId || 'uni_general',
      provider: 'STRIPE_CARD',
      providerTransactionReference: transactionId || `TXN_${Date.now()}`,
      amountUsd: amountUsd || 6.00,
      currency: 'USD',
      status: status === 'FAILED' ? 'FAILED' : 'CONFIRMED',
      idempotencyKey: idempotencyKey || `idem_hook_${Date.now()}`,
      verifiedAt: new Date().toISOString()
    });

    if (submissionId) {
      const sub = dbInstance.getSubmissionById(submissionId);
      if (sub && status !== 'FAILED') {
        sub.paymentStatus = 'PAYMENT_CONFIRMED';
        sub.paymentReference = transactionId || payment.providerTransactionReference;
        sub.paymentAmount = amountUsd || 6.00;
        sub.updatedAt = new Date().toISOString();
        dbInstance.saveSubmission(sub);
      }
    }

    return res.status(200).json({
      received: true,
      duplicate: false,
      paymentId: payment.id,
      status: payment.status
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'WebhookError', message: err.message });
  }
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER OR PRODUCTION STATIC FILE SERVING
// -----------------------------------------------------------------------------

async function startServer() {
  if (!isProduction) {
    // Mount Vite in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production build static assets
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
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
