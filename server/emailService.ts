import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { 
  CentralEmailConfig, 
  UniversityEmailIdentity, 
  UniversityEmailTemplate, 
  DetailedEmailLog, 
  UniversityEmailEventType, 
  University,
  ResendDomainStatus
} from '../src/types';
import { sqliteStorage } from './sqlite';
import { findUniversityBySlug, VERIFIED_UNIVERSITIES } from '../src/data/universities';

// -----------------------------------------------------------------------------
// 1. DEFAULT UNIVERSITY EMAIL TEMPLATES (9 EVENT TYPES)
// -----------------------------------------------------------------------------
export const DEFAULT_UNIVERSITY_TEMPLATES: Record<
  UniversityEmailEventType, 
  Omit<UniversityEmailTemplate, 'id' | 'universityId' | 'isCustom' | 'updatedAt'>
> = {
  WELCOME: {
    eventType: 'WELCOME',
    subject: 'Welcome to the {{university_name}} Community on CampusConnect!',
    preheader: 'Your university introduction profile has been initialized.',
    headline: 'Welcome to {{university_name}}!',
    bodyMarkdown: 
`Hi **{{student_name}}**,

Welcome to the official **{{university_name}}** student community network! We are thrilled to have you join your incoming class.

Through CampusConnect, you can:
* Introduce yourself to classmates before arriving on campus.
* Get your official student feature published to the **@{{university_instagram}}** class account.
* Connect with roommates, student groups, and campus organizations.

Click below to complete your profile and prepare your introduction photo!`,
    buttonText: 'Open My Campus Portal',
    buttonLink: '{{continuation_link}}',
    footerText: 'Need assistance? Reach out to your campus support team at {{support_email}}.'
  },

  ACCOUNT_VERIFICATION: {
    eventType: 'ACCOUNT_VERIFICATION',
    subject: 'Verify your student account for {{university_name}}',
    preheader: 'Confirm your student email address to activate your account.',
    headline: 'Confirm Your Email Address',
    bodyMarkdown: 
`Hi **{{student_name}}**,

Please verify your student email address to complete your account setup for **{{university_name}}**.

This protects your student identity and allows our student moderation team to verify class rosters.`,
    buttonText: 'Verify Student Email',
    buttonLink: '{{continuation_link}}',
    footerText: 'If you did not request this verification, you can safely ignore this email.'
  },

  PASSWORD_RESET: {
    eventType: 'PASSWORD_RESET',
    subject: 'Password reset request for {{university_name}} CampusConnect',
    preheader: 'Follow the link inside to choose a new password.',
    headline: 'Reset Your Password',
    bodyMarkdown: 
`Hi **{{student_name}}**,

We received a request to reset the password associated with your **{{university_name}}** account.

Click the button below to set a new password. This link is secure and will expire in 1 hour.`,
    buttonText: 'Reset Password',
    buttonLink: '{{continuation_link}}',
    footerText: 'If you did not request this change, please ignore this email or contact support.'
  },

  PAYMENT_CONFIRMATION: {
    eventType: 'PAYMENT_CONFIRMATION',
    subject: 'Receipt: Student Feature Fee Paid for {{university_name}}',
    preheader: 'Payment confirmed: ${{payment_amount}} for your official introduction feature.',
    headline: 'Payment Confirmed',
    bodyMarkdown: 
`Hi **{{student_name}}**,

Thank you for your payment! We have successfully processed your **\${{payment_amount}} USD** fee for the **{{university_name}}** official student introduction feature.

**Transaction Summary:**
* **Reference:** {{submission_reference}}
* **Status:** Confirmed & Verified
* **University:** {{university_name}}
* **Amount Paid:** \${{payment_amount}} USD

Our moderation team has received your submission and will review your photo within 24–48 hours.`,
    buttonText: 'Track Submission Status',
    buttonLink: '{{continuation_link}}',
    footerText: 'CampusConnect payments are processed securely via Stripe. A copy of this receipt has been saved.'
  },

  PAYMENT_FAILURE: {
    eventType: 'PAYMENT_FAILURE',
    subject: 'Action Required: Payment could not be processed for {{university_name}}',
    preheader: 'We encountered an issue processing your student feature fee.',
    headline: 'Payment Unsuccessful',
    bodyMarkdown: 
`Hi **{{student_name}}**,

We were unable to process the payment for your **{{university_name}}** student feature submission.

No charges were made to your account. Your introduction draft and photos have been saved safely. Please review your card details or try an alternate payment method.`,
    buttonText: 'Retry Payment',
    buttonLink: '{{continuation_link}}',
    footerText: 'If you continue experiencing difficulties, contact support at {{support_email}}.'
  },

  SUBMISSION_RECEIVED: {
    eventType: 'SUBMISSION_RECEIVED',
    subject: 'Submission Received: {{university_name}} Student Feature',
    preheader: 'We received your introduction photo and details.',
    headline: 'We Received Your Submission!',
    bodyMarkdown: 
`Hi **{{student_name}}**,

Great news! Your student introduction photo for **{{university_name}}** has been received by our editorial team.

**Submission Details:**
* **Reference Number:** {{submission_reference}}
* **Current Status:** Under Review
* **Target Account:** @{{university_instagram}}

Our campus moderators review all submissions to ensure they meet university community standards. You will receive an email update as soon as your review is complete!`,
    buttonText: 'View Submission',
    buttonLink: '{{continuation_link}}',
    footerText: 'Average review time is currently 12–24 business hours.'
  },

  SUBMISSION_APPROVED: {
    eventType: 'SUBMISSION_APPROVED',
    subject: 'Good news! Your {{university_name}} introduction has been APPROVED',
    preheader: 'Your photo is queued for publication on Instagram.',
    headline: 'Your Feature is Approved!',
    bodyMarkdown: 
`Hi **{{student_name}}**,

Congratulations! Your student introduction feature for **{{university_name}}** has been reviewed and **approved** by our editorial board.

Your watermarked photo has been queued in our publishing pipeline for the official class Instagram page (**@{{university_instagram}}**).

We will notify you immediately once your post goes live on Instagram!`,
    buttonText: 'Check Publishing Queue',
    buttonLink: '{{continuation_link}}',
    footerText: 'Thank you for being part of the {{university_name}} community!'
  },

  SUBMISSION_REJECTED: {
    eventType: 'SUBMISSION_REJECTED',
    subject: 'Update regarding your {{university_name}} feature submission',
    preheader: 'Your introduction submission requires adjustments.',
    headline: 'Update on Your Submission',
    bodyMarkdown: 
`Hi **{{student_name}}**,

Thank you for submitting your introduction to the **{{university_name}}** student community.

During review, our moderation team noted the following feedback:
> **Reason:** {{rejection_reason}}

Don't worry — your payment is secure! You can upload a replacement photo or update your details at any time without paying again.`,
    buttonText: 'Update My Submission',
    buttonLink: '{{continuation_link}}',
    footerText: 'Need clarification on photo guidelines? Reply to this email or visit our help center.'
  },

  INSTAGRAM_PUBLISHED: {
    eventType: 'INSTAGRAM_PUBLISHED',
    subject: 'Your student feature is now LIVE on {{university_name}} Instagram!',
    preheader: 'See your feature live on the official class Instagram.',
    headline: 'You Are Featured on Instagram!',
    bodyMarkdown: 
`Hi **{{student_name}}**,

Your student introduction feature has officially been published to **@{{university_instagram}}**!

Check out your post on Instagram, tag your friends, and connect with other students in the comments:
* **Post Link:** {{instagram_post_url}}

Welcome again to the **{{university_name}}** family!`,
    buttonText: 'View Instagram Post',
    buttonLink: '{{instagram_post_url}}',
    footerText: 'Proudly presented by CampusConnect in partnership with {{university_name}} student media.'
  }
};

// -----------------------------------------------------------------------------
// 2. RESPONSIVE HTML EMAIL GENERATOR
// -----------------------------------------------------------------------------
export function generateBrandedEmailHtml(params: {
  identity: UniversityEmailIdentity;
  subject: string;
  preheader?: string;
  headline?: string;
  bodyHtml: string;
  buttonText?: string;
  buttonLink?: string;
  footerText?: string;
  signatureHtml?: string;
}): string {
  const { identity, preheader, headline, bodyHtml, buttonText, buttonLink, footerText, signatureHtml } = params;
  const primaryColor = identity.primaryColor || '#1D64EC';
  const secondaryColor = identity.secondaryColor || '#0284C7';
  const rawSignature = identity.signature || `Warm regards,<br />The ${identity.universityName} Student Media Team`;
  const hasHtmlTags = /<(?:br|p|strong|em|div|span|a)\b/i.test(rawSignature);
  const signature = signatureHtml || (hasHtmlTags ? rawSignature : parseSimpleMarkdownToHtml(rawSignature));

  const logoHtml = identity.logoUrl
    ? `<img src="${identity.logoUrl}" alt="${identity.universityName}" style="max-height: 48px; max-width: 180px; display: block;" />`
    : `<div style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; font-weight: 800; font-size: 16px; padding: 10px 16px; border-radius: 8px; letter-spacing: -0.5px;">${identity.universityName}</div>`;

  const buttonHtml = buttonText && buttonLink
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
        <tr>
          <td align="left" style="border-radius: 8px; background-color: ${primaryColor};">
            <a href="${buttonLink}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px;">
              ${buttonText} &rarr;
            </a>
          </td>
        </tr>
      </table>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${params.subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; }
    a { color: ${primaryColor}; text-decoration: underline; }
    p { margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 15px; }
    ul { margin: 0 0 16px 20px; padding: 0; color: #334155; }
    li { margin-bottom: 8px; line-height: 1.5; font-size: 15px; }
    blockquote { margin: 16px 0; padding: 12px 18px; background-color: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 4px; font-style: italic; color: #1e293b; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; mso-hide: all; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  ${preheader ? `<span class="preheader" style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" style="background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor});"></td>
          </tr>

          <!-- Header / Logo -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    ${logoHtml}
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; background-color: #f8fafc; padding: 6px 12px; border-radius: 20px; border: 1px solid #e2e8f0;">
                      CampusConnect
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              ${headline ? `<h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.25;">${headline}</h1>` : ''}
              
              <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                ${bodyHtml}
              </div>

              ${buttonHtml}

              <!-- Signature -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b; line-height: 1.6;">
                ${signature}
              </div>
            </td>
          </tr>

          <!-- University Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              ${footerText ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;">${footerText}</p>` : ''}
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This email was sent to you on behalf of <strong>${identity.universityName}</strong> via the centralized CampusConnect platform.<br />
                © ${new Date().getFullYear()} CampusConnect Technologies Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <!-- Security / Unsubscribe Notice -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
              Secure Transactional Delivery · Protected by TLS 1.3 · Official University Partner
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// 3. VARIABLE SUBSTITUTION & MARKDOWN HELPER
// -----------------------------------------------------------------------------
export function interpolateVariables(templateStr: string, variables: Record<string, any>): string {
  if (!templateStr) return '';
  let result = templateStr;
  for (const [key, val] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(pattern, val != null ? String(val) : '');
  }
  return result;
}

export function parseSimpleMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const formatInline = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push(`<p>${paragraphLines.map(formatInline).join('<br />')}</p>`);
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.map(item => `<li>${formatInline(item)}</li>`).join('')}</ul>`);
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^\*\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1]);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${formatInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks.join('\n');
}

// -----------------------------------------------------------------------------
// 4. RESEND DOMAIN STATUS CACHE & CENTRAL SENDING ENGINE
// -----------------------------------------------------------------------------
let resendStatusCache: {
  keyHash: string;
  expiresAt: number;
  status: ResendDomainStatus;
} | null = null;

function escapeHtmlSafe(val: string): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolveResendApiKey(centralConfig?: CentralEmailConfig): string {
  const envKey = (
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    process.env.RESEND_APIKEY ||
    process.env.RESEND_SECRET ||
    process.env.RESEND_TOKEN ||
    process.env.EMAIL_API_KEY ||
    process.env.TRANSACTIONAL_EMAIL_API_KEY ||
    ''
  ).trim();
  if (envKey) return envKey;
  const cfg = centralConfig || sqliteStorage.getCentralEmailConfig();
  return cfg.provider === 'RESEND' ? (cfg.apiKey || '').trim() : '';
}

function hashKeyPrefix(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
}

export function getCachedResendStatus(apiKeyOverride?: string): ResendDomainStatus | null {
  const key = (apiKeyOverride || resolveResendApiKey()).trim();
  const centralConfig = sqliteStorage.getCentralEmailConfig();
  if (!key) {
    return {
      connected: false,
      mode: 'UNCONFIGURED',
      verifiedDomains: [],
      domains: [],
      externalDeliveryVerified: false,
      productionReady: false,
      authorizedDomain: centralConfig.senderDomain || 'campusconnect.app'
    };
  }
  const keyHash = hashKeyPrefix(key);
  if (resendStatusCache && resendStatusCache.keyHash === keyHash) {
    const extVerified = sqliteStorage.hasVerifiedExternalResendDelivery();
    return {
      ...resendStatusCache.status,
      externalDeliveryVerified: extVerified,
      productionReady: resendStatusCache.status.mode === 'PRODUCTION' && extVerified
    };
  }
  return null;
}

export async function getResendDomainStatus(apiKeyOverride?: string, forceRefresh = false): Promise<ResendDomainStatus> {
  const apiKey = (apiKeyOverride || resolveResendApiKey()).trim();
  const centralConfig = sqliteStorage.getCentralEmailConfig();
  const fallbackDomain = centralConfig.senderDomain || 'campusconnect.app';

  if (!apiKey) {
    return {
      connected: false,
      mode: 'UNCONFIGURED',
      verifiedDomains: [],
      domains: [],
      externalDeliveryVerified: false,
      productionReady: false,
      authorizedDomain: fallbackDomain,
      checkedAt: new Date().toISOString()
    };
  }

  const keyHash = hashKeyPrefix(apiKey);
  if (!forceRefresh && resendStatusCache && resendStatusCache.keyHash === keyHash && resendStatusCache.expiresAt > Date.now()) {
    const extVerified = sqliteStorage.hasVerifiedExternalResendDelivery();
    return {
      ...resendStatusCache.status,
      externalDeliveryVerified: extVerified,
      productionReady: resendStatusCache.status.mode === 'PRODUCTION' && extVerified
    };
  }

  const previousOwnerEmail =
    resendStatusCache && resendStatusCache.keyHash === keyHash
      ? resendStatusCache.status.ownerEmail
      : undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timer));

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(data?.message || '').toLowerCase();
      // Sending-only Resend keys cannot call GET /domains (401/403 restricted_api_key),
      // yet can still send from any verified custom domain configured in Central Email Config.
      if ((res.status === 401 || res.status === 403) && (msg.includes('restrict') || msg.includes('only send'))) {
        const extVerified = sqliteStorage.hasVerifiedExternalResendDelivery();
        const inferredDomain =
          (centralConfig.senderEmail?.includes('@') ? centralConfig.senderEmail.split('@')[1] : '') ||
          centralConfig.senderDomain ||
          fallbackDomain;
        const restrictedStatus: ResendDomainStatus = {
          connected: true,
          mode: extVerified ? 'PRODUCTION' : 'SANDBOX',
          verifiedDomains: inferredDomain ? [inferredDomain.toLowerCase()] : [],
          domains: inferredDomain ? [{ name: inferredDomain.toLowerCase(), status: 'configured' }] : [],
          ownerEmail: previousOwnerEmail,
          externalDeliveryVerified: extVerified,
          productionReady: extVerified,
          authorizedDomain: inferredDomain || fallbackDomain,
          checkedAt: new Date().toISOString()
        };
        resendStatusCache = {
          keyHash,
          expiresAt: Date.now() + 15_000,
          status: restrictedStatus
        };
        return restrictedStatus;
      }

      return {
        connected: false,
        mode: 'UNCONFIGURED',
        verifiedDomains: [],
        domains: [],
        ownerEmail: previousOwnerEmail,
        externalDeliveryVerified: false,
        productionReady: false,
        authorizedDomain: fallbackDomain,
        checkedAt: new Date().toISOString()
      };
    }

    const rawDomains: any[] = Array.isArray(data?.data) ? data.data : [];
    const domains = rawDomains
      .filter((d) => d && typeof d.name === 'string')
      .map((d) => ({
        name: String(d.name).toLowerCase(),
        status: String(d.status || 'unknown').toLowerCase()
      }));

    const verifiedDomains = domains
      .filter((d) => d.status === 'verified')
      .map((d) => d.name);

    const extVerified = verifiedDomains.length > 0 && sqliteStorage.hasVerifiedExternalResendDelivery();
    const authorizedDomain =
      verifiedDomains.find((d) => d === (centralConfig.senderDomain || '').toLowerCase()) ||
      verifiedDomains[0] ||
      fallbackDomain;

    const status: ResendDomainStatus = {
      connected: true,
      mode: verifiedDomains.length > 0 ? 'PRODUCTION' : 'SANDBOX',
      verifiedDomains,
      domains,
      ownerEmail: verifiedDomains.length === 0 ? previousOwnerEmail : undefined,
      externalDeliveryVerified: extVerified,
      productionReady: verifiedDomains.length > 0 && extVerified,
      authorizedDomain,
      checkedAt: new Date().toISOString()
    };

    resendStatusCache = {
      keyHash,
      expiresAt: Date.now() + (verifiedDomains.length > 0 ? 60_000 : 3_000),
      status
    };
    return status;
  } catch {
    return {
      connected: false,
      mode: 'UNCONFIGURED',
      verifiedDomains: [],
      domains: [],
      ownerEmail: previousOwnerEmail,
      externalDeliveryVerified: false,
      productionReady: false,
      authorizedDomain: fallbackDomain,
      checkedAt: new Date().toISOString()
    };
  }
}

export interface SendUniversityEmailParams {
  universityId: string;
  eventType: UniversityEmailEventType;
  recipient: string;
  variables: {
    student_name?: string;
    student_email?: string;
    university_name?: string;
    university_instagram?: string;
    submission_reference?: string;
    payment_amount?: string | number;
    payment_status?: string;
    submission_status?: string;
    continuation_link?: string;
    instagram_post_url?: string;
    rejection_reason?: string;
    support_email?: string;
    [key: string]: any;
  };
  idempotencyKey?: string;
  sandboxForwardToOwner?: boolean;
  retryOfLogId?: string;
  attemptNumber?: number;
}

export async function sendUniversityEmail(params: SendUniversityEmailParams): Promise<DetailedEmailLog> {
  const centralConfig = sqliteStorage.getCentralEmailConfig();

  // 1. Check if sending is globally enabled
  if (!centralConfig.sendingEnabled) {
    console.warn(`[EmailEngine] Sending is DISABLED globally in Central Email Configuration. Skipping email to ${params.recipient}.`);
    const log: DetailedEmailLog = {
      id: 'eml_' + crypto.randomBytes(6).toString('hex'),
      universityId: params.universityId,
      recipient: params.recipient,
      subject: `[DISABLED] ${params.eventType}`,
      template: params.eventType,
      status: 'FAILED',
      sentAt: new Date().toISOString(),
      messageId: `<disabled_${Date.now()}@campusconnect.app>`,
      provider: centralConfig.provider,
      errorMessage: 'Sending is disabled globally in Central Email Configuration.',
      idempotencyKey: params.idempotencyKey
    };
    sqliteStorage.insertEmailLog(log);
    return log;
  }

  // 2. Check idempotency guard to prevent duplicate notifications
  if (params.idempotencyKey && !params.retryOfLogId) {
    const existing = sqliteStorage.findEmailLogByIdempotency(params.idempotencyKey);
    if (existing && (existing.status === 'DELIVERED' || existing.status === 'QUEUED')) {
      console.log(`[EmailEngine] Idempotency match for key "${params.idempotencyKey}". Preventing duplicate send.`);
      return existing;
    }
  }

  // 3. Resolve university
  let university = sqliteStorage.getAllCampuses().find(c => c.id === params.universityId || c.slug === params.universityId);
  if (!university) {
    university = findUniversityBySlug(params.universityId) || VERIFIED_UNIVERSITIES.find(u => u.id === params.universityId);
  }
  const uniName = university ? university.name : params.variables.university_name || 'University';
  const uniSlug = university ? university.slug : params.universityId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const rawUniInstagram = university?.instagramHandle || params.variables.university_instagram || `${uniSlug}class`;
  const uniInstagram = String(rawUniInstagram).replace(/^@+/, '');

  // 4. Resolve university email identity
  let identity = sqliteStorage.getUniversityEmailIdentity(params.universityId);
  if (!identity && university) {
    identity = sqliteStorage.getUniversityEmailIdentity(university.slug);
  }

  if (!identity) {
    // Generate intelligent default identity using central provider domain
    const senderAlias = `${uniSlug}@${centralConfig.senderDomain || 'notifications.campusconnect.app'}`;
    identity = {
      universityId: university?.id || params.universityId,
      universitySlug: uniSlug,
      universityName: uniName,
      senderName: `${uniName} Campus Portal`,
      senderEmail: senderAlias,
      replyTo: centralConfig.replyTo || `admissions@${uniSlug}.edu`,
      logoUrl: university?.logoUrl,
      primaryColor: university?.primaryColor || '#1D64EC',
      secondaryColor: university?.secondaryColor || university?.accentColor || '#38BDF8',
      signature: `Warm regards,\n\n**The ${uniName} Student Media & Community Team**`,
      isEnabled: true
    };
  }

  // If university identity is explicitly disabled, suppress sending
  if (!identity.isEnabled) {
    console.warn(`[EmailEngine] Email identity for ${uniName} is DISABLED. Suppressing notification.`);
    const log: DetailedEmailLog = {
      id: 'eml_' + crypto.randomBytes(6).toString('hex'),
      universityId: identity.universityId,
      universityName: uniName,
      recipient: params.recipient,
      subject: `[CAMPUS DISABLED] ${params.eventType}`,
      template: params.eventType,
      status: 'FAILED',
      sentAt: new Date().toISOString(),
      messageId: `<suppressed_${Date.now()}@campusconnect.app>`,
      provider: centralConfig.provider,
      errorMessage: `Email sending is disabled for university ${uniName}.`,
      idempotencyKey: params.idempotencyKey
    };
    sqliteStorage.insertEmailLog(log);
    return log;
  }

  // 5. Resolve template (custom or system default)
  let tpl = sqliteStorage.getUniversityEmailTemplate(identity.universityId, params.eventType);
  if (!tpl) {
    const def = DEFAULT_UNIVERSITY_TEMPLATES[params.eventType] || DEFAULT_UNIVERSITY_TEMPLATES.WELCOME;
    tpl = {
      id: `${identity.universityId}_${params.eventType}`,
      universityId: identity.universityId,
      eventType: params.eventType,
      subject: def.subject,
      preheader: def.preheader,
      headline: def.headline,
      bodyMarkdown: def.bodyMarkdown,
      buttonText: def.buttonText,
      buttonLink: def.buttonLink,
      footerText: def.footerText,
      isCustom: false
    };
  }

  // 6. Merge template variables
  const baseOrigin = params.variables.base_url || 'https://campusconnect.app';
  const mergedVariables: Record<string, any> = {
    university_name: uniName,
    university_instagram: uniInstagram,
    student_name: params.variables.student_name || 'Student',
    student_email: params.recipient,
    submission_reference: params.variables.submission_reference || `CC-${Date.now().toString().slice(-6)}`,
    payment_amount: params.variables.payment_amount != null ? String(params.variables.payment_amount) : '6.00',
    payment_status: params.variables.payment_status || 'CONFIRMED',
    submission_status: params.variables.submission_status || 'UNDER_REVIEW',
    continuation_link: params.variables.continuation_link || `${baseOrigin}/university/${uniSlug}`,
    instagram_post_url: params.variables.instagram_post_url || `https://instagram.com/${uniInstagram}`,
    rejection_reason: params.variables.rejection_reason || 'Image resolution was too low or did not meet portrait standards.',
    support_email: centralConfig.replyTo || `support@${centralConfig.senderDomain || 'campusconnect.app'}`,
    year: new Date().getFullYear().toString(),
    ...params.variables
  };
  mergedVariables.university_instagram = String(mergedVariables.university_instagram || uniInstagram).replace(/^@+/, '');

  const finalSubject = interpolateVariables(tpl.subject, mergedVariables);
  const finalPreheader = interpolateVariables(tpl.preheader || '', mergedVariables);
  const finalHeadline = interpolateVariables(tpl.headline || '', mergedVariables);
  const finalMarkdown = interpolateVariables(tpl.bodyMarkdown, mergedVariables);
  const finalButtonText = interpolateVariables(tpl.buttonText || '', mergedVariables);
  const finalButtonLink = interpolateVariables(tpl.buttonLink || '', mergedVariables);
  const finalFooter = interpolateVariables(tpl.footerText || '', mergedVariables);

  const rawSignature = interpolateVariables(
    identity.signature || `Warm regards,\n\n**The ${identity.universityName} Student Media Team**`,
    mergedVariables
  );
  const signatureHtml = /<(?:br|p|strong|em|div|span|a)\b/i.test(rawSignature)
    ? rawSignature
    : parseSimpleMarkdownToHtml(rawSignature);

  const bodyHtml = parseSimpleMarkdownToHtml(finalMarkdown);

  const renderedHtml = generateBrandedEmailHtml({
    identity,
    subject: finalSubject,
    preheader: finalPreheader,
    headline: finalHeadline,
    bodyHtml,
    buttonText: finalButtonText,
    buttonLink: finalButtonLink,
    footerText: finalFooter,
    signatureHtml
  });

  // 7. Dispatch via configured central provider
  let deliveryStatus: 'DELIVERED' | 'QUEUED' | 'FAILED' = 'DELIVERED';
  let messageId = `<msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@${centralConfig.senderDomain || 'campusconnect.app'}>`;
  let deliveryError: string | undefined = undefined;
  let activeProvider = centralConfig.provider;
  const metadataPayload: Record<string, any> = {
    eventType: params.eventType,
    universityId: identity.universityId,
    senderEmail: identity.senderEmail,
    senderName: identity.senderName,
    attemptNumber: params.attemptNumber || 1,
    ...(params.retryOfLogId ? { retryOfLogId: params.retryOfLogId } : {}),
    variables: mergedVariables
  };

  const resendApiKey = resolveResendApiKey(centralConfig);

  const hasSmtpCredentials = Boolean(
    centralConfig.smtpHost &&
    centralConfig.smtpUser &&
    centralConfig.smtpPass &&
    centralConfig.smtpPass !== '••••••••••••'
  );

  const plainText = renderedHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const trySmtpDelivery = async (): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
    try {
      const transporter = nodemailer.createTransport({
        host: centralConfig.smtpHost,
        port: centralConfig.smtpPort || 587,
        secure: centralConfig.smtpPort === 465,
        auth: {
          user: centralConfig.smtpUser,
          pass: centralConfig.smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: `"${identity.senderName}" <${identity.senderEmail}>`,
        to: params.recipient,
        replyTo: identity.replyTo || centralConfig.replyTo || identity.senderEmail,
        subject: finalSubject,
        html: renderedHtml,
        text: plainText
      });

      return { ok: true, messageId: info.messageId };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Prioritize real Resend API delivery if API key is available
  if (resendApiKey) {
    activeProvider = 'RESEND';
    try {
      const cachedMode = getCachedResendStatus(resendApiKey)?.mode;
      const domainStatus = await getResendDomainStatus(resendApiKey, cachedMode !== 'PRODUCTION');
      const identityParts = identity.senderEmail.split('@');
      const identityLocal = (identityParts[0] || uniSlug || 'notifications').replace(/[^a-z0-9._+-]/gi, '');
      const identityDomain = (identityParts[1] || '').toLowerCase();
      const centralEmailParts = (centralConfig.senderEmail || '').split('@');
      const centralEmailDomain = (centralEmailParts[1] || '').toLowerCase();
      const centralRootDomain = (centralConfig.senderDomain || '').toLowerCase();
      const preferredVerifiedDomain =
        (centralRootDomain && domainStatus.verifiedDomains.includes(centralRootDomain) ? centralRootDomain : '') ||
        domainStatus.verifiedDomains[0] ||
        '';

      let selectedFromEmail = 'onboarding@resend.dev';
      if (identity.senderEmail.includes('@') && domainStatus.verifiedDomains.includes(identityDomain)) {
        selectedFromEmail = identity.senderEmail;
      } else if (preferredVerifiedDomain) {
        if (identity.universityId === 'general' && centralConfig.senderEmail.includes('@') && domainStatus.verifiedDomains.includes(centralEmailDomain)) {
          selectedFromEmail = centralConfig.senderEmail;
        } else {
          selectedFromEmail = `${identityLocal}@${preferredVerifiedDomain}`;
        }
      }

      const verifiedSender = `"${identity.senderName}" <${selectedFromEmail}>`;
      const isVerifiedCustomDomainSend = selectedFromEmail !== 'onboarding@resend.dev' && domainStatus.verifiedDomains.length > 0;
      metadataPayload.actualFromAddress = verifiedSender;
      metadataPayload.verifiedDomainUsed = isVerifiedCustomDomainSend;

      const resendPayload = {
        from: verifiedSender,
        to: [params.recipient],
        reply_to: identity.replyTo || centralConfig.replyTo || identity.senderEmail,
        subject: finalSubject,
        html: renderedHtml,
        text: plainText
      };

      const dispatchResendWithRetry = async (payload: Record<string, any>) => {
        const maxAttempts = 3;
        let lastRes: globalThis.Response | null = null;
        let lastData: any = {};
        let lastErr: any = null;
        let attemptsUsed = 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          attemptsUsed = attempt;
          try {
            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            const jsonData = await response.json().catch(() => ({}));
            lastRes = response;
            lastData = jsonData;

            const isTransient = response.status === 429 || response.status >= 500;
            if (response.ok || !isTransient || attempt === maxAttempts) {
              return { res: response, resData: jsonData, attemptsUsed };
            }
            console.warn(`[EmailEngine] Transient Resend status ${response.status} on attempt ${attempt}/${maxAttempts}, retrying...`);
          } catch (fetchErr: any) {
            lastErr = fetchErr;
            if (attempt === maxAttempts) {
              throw fetchErr;
            }
            console.warn(`[EmailEngine] Network error on Resend attempt ${attempt}/${maxAttempts}, retrying...`);
          }
          await sleep(400 * attempt);
        }

        if (!lastRes) {
          throw lastErr || new Error('Resend request failed after retries.');
        }
        return { res: lastRes, resData: lastData, attemptsUsed };
      };

      console.log(`[EmailEngine] Dispatched real transactional email via Resend API (${selectedFromEmail}) to ${params.recipient}...`);
      let { res, resData, attemptsUsed } = await dispatchResendWithRetry(resendPayload);
      metadataPayload.attempts = attemptsUsed;

      // If custom domain is unverified, retry via onboarding@resend.dev
      if (!res.ok && (resData?.name === 'validation_error' || String(resData?.message || '').toLowerCase().includes('domain')) && selectedFromEmail !== 'onboarding@resend.dev') {
        console.warn(`[EmailEngine] Sender domain not verified in Resend, retrying via onboarding@resend.dev...`);
        selectedFromEmail = 'onboarding@resend.dev';
        metadataPayload.actualFromAddress = `"${identity.senderName}" <onboarding@resend.dev>`;
        metadataPayload.verifiedDomainUsed = false;
        const fallbackAttempt = await dispatchResendWithRetry({
          ...resendPayload,
          from: `"${identity.senderName}" <onboarding@resend.dev>`
        });
        res = fallbackAttempt.res;
        resData = fallbackAttempt.resData;
        metadataPayload.attempts = attemptsUsed + fallbackAttempt.attemptsUsed;
      }

      if (res.ok && resData?.id) {
        messageId = resData.id;
        deliveryStatus = 'DELIVERED';
        deliveryError = undefined;
        if (metadataPayload.verifiedDomainUsed && resendStatusCache) {
          resendStatusCache.status.externalDeliveryVerified = true;
          resendStatusCache.status.productionReady = resendStatusCache.status.mode === 'PRODUCTION';
        }
        console.log(`[EmailEngine] Successfully dispatched via Resend API. ID: ${messageId}`);
      } else {
        const errorMsg = resData?.message || resData?.error || `Resend API returned status ${res.status}`;
        const sandboxMatch = typeof errorMsg === 'string'
          ? errorMsg.match(/only send testing emails to your own email address\s*\(([^)]+)\)/i)
          : null;
        const isSandboxRestriction = Boolean(sandboxMatch) || /verify a domain at resend\.com\/domains/i.test(String(errorMsg));

        if (isSandboxRestriction) {
          const ownerEmail = (sandboxMatch?.[1] || domainStatus.ownerEmail || '').trim();
          const keyHash = hashKeyPrefix(resendApiKey);
          if (ownerEmail) {
            const nextStatus: ResendDomainStatus = {
              ...(resendStatusCache?.keyHash === keyHash ? resendStatusCache.status : domainStatus),
              connected: true,
              mode: 'SANDBOX',
              ownerEmail,
              checkedAt: new Date().toISOString()
            };
            resendStatusCache = {
              keyHash,
              expiresAt: Date.now() + 60_000,
              status: nextStatus
            };
          }

          console.info(
            `[EmailEngine] Resend sandbox active${ownerEmail ? ` (owner: ${ownerEmail})` : ''}. Handling dispatch to ${params.recipient} cleanly.`
          );

          // 1. Try SMTP fallback if full SMTP credentials exist
          let handled = false;
          if (hasSmtpCredentials) {
            const smtpRes = await trySmtpDelivery();
            if (smtpRes.ok) {
              activeProvider = 'SMTP';
              messageId = smtpRes.messageId || messageId;
              deliveryStatus = 'DELIVERED';
              deliveryError = undefined;
              metadataPayload.smtpFallback = true;
              handled = true;
              console.log(`[EmailEngine] Dispatched via SMTP fallback to ${params.recipient}. ID: ${messageId}`);
            }
          }

          // 2. For Admin sandbox tests, route a clearly labeled copy to the verified Resend owner inbox
          if (!handled && params.sandboxForwardToOwner && ownerEmail) {
            const bannerHtml = `<div style="background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:12px 16px;border-radius:8px;margin:0 0 16px 0;font-family:sans-serif;font-size:13px;"><strong>Resend Sandbox Test Copy:</strong> Intended recipient was <strong>${escapeHtmlSafe(params.recipient)}</strong>. Delivered to your verified Resend owner inbox (<strong>${escapeHtmlSafe(ownerEmail)}</strong>) because no custom domain is verified yet at <code>resend.com/domains</code>.</div>`;
            const forwardedHtml = renderedHtml.includes('<body')
              ? renderedHtml.replace(/(<body[^>]*>)/i, `$1\n${bannerHtml}`)
              : `${bannerHtml}\n${renderedHtml}`;

            const ownerRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: `"${identity.senderName}" <onboarding@resend.dev>`,
                to: [ownerEmail],
                reply_to: identity.replyTo || centralConfig.replyTo || identity.senderEmail,
                subject: `[Sandbox Copy -> ${params.recipient}] ${finalSubject}`,
                html: forwardedHtml,
                text: `Resend Sandbox Test Copy (Intended recipient: ${params.recipient})\n\n${plainText}`
              })
            });
            const ownerData: any = await ownerRes.json().catch(() => ({}));
            if (ownerRes.ok && ownerData?.id) {
              messageId = ownerData.id;
              const sameAsOwner = params.recipient.trim().toLowerCase() === ownerEmail.toLowerCase();
              deliveryStatus = sameAsOwner ? 'DELIVERED' : 'QUEUED';
              deliveryError = sameAsOwner
                ? undefined
                : `Resend Sandbox Mode blocked direct delivery to ${params.recipient} because no custom domain is verified at resend.com/domains. A preview copy was sent to your Resend owner inbox (${ownerEmail}) instead.`;
              metadataPayload.sandboxMode = true;
              metadataPayload.sandboxRestriction = !sameAsOwner;
              metadataPayload.intendedRecipient = params.recipient;
              metadataPayload.routedViaSandboxTo = ownerEmail;
              handled = true;
              console.log(`[EmailEngine] Sandbox test copy delivered to verified owner ${ownerEmail} (intended: ${params.recipient}). ID: ${messageId}`);
            }
          }

          // 3. Otherwise record cleanly as QUEUED with clear domain-verification guidance
          if (!handled) {
            deliveryStatus = 'QUEUED';
            deliveryError = `Resend Sandbox Mode: External delivery to ${params.recipient} requires verifying a domain at resend.com/domains${ownerEmail ? ` (testing limited to ${ownerEmail})` : ''}.`;
            metadataPayload.sandboxRestriction = true;
            if (ownerEmail) {
              metadataPayload.sandboxOwnerEmail = ownerEmail;
            }
          }
        } else {
          console.warn(`[EmailEngine] Resend API dispatch error:`, errorMsg);
          deliveryStatus = 'FAILED';
          deliveryError = errorMsg;
        }
      }
    } catch (err: any) {
      console.warn(`[EmailEngine] Resend API error:`, err?.message || err);
      deliveryStatus = 'FAILED';
      deliveryError = err?.message || String(err);
    }
  } else if (centralConfig.provider === 'SMTP' && hasSmtpCredentials) {
    const smtpRes = await trySmtpDelivery();
    if (smtpRes.ok) {
      messageId = smtpRes.messageId || messageId;
      deliveryStatus = 'DELIVERED';
      console.log(`[EmailEngine] Successfully sent real SMTP email via ${centralConfig.smtpHost} to ${params.recipient}. ID: ${messageId}`);
    } else {
      console.warn(`[EmailEngine] SMTP delivery attempt encountered error:`, smtpRes.error);
      deliveryStatus = 'FAILED';
      deliveryError = smtpRes.error;
    }
  } else {
    console.warn(`[EmailEngine] Cannot dispatch email to ${params.recipient}: no active Resend API key or SMTP credentials configured.`);
    deliveryStatus = 'FAILED';
    deliveryError = 'No active email provider credentials found on the server. Add your RESEND_API_KEY in Secrets or configure Resend / SMTP credentials in Central Email Infrastructure.';
    metadataPayload.unconfiguredProvider = true;
  }

  // 8. Log delivery in SQLite
  const emailLog: DetailedEmailLog = {
    id: 'eml_' + crypto.randomBytes(6).toString('hex'),
    universityId: identity.universityId,
    universityName: uniName,
    recipient: params.recipient,
    subject: finalSubject,
    template: params.eventType,
    status: deliveryStatus,
    sentAt: new Date().toISOString(),
    messageId,
    provider: activeProvider,
    errorMessage: deliveryError,
    idempotencyKey: params.idempotencyKey,
    renderedHtml,
    metadata: metadataPayload
  };

  sqliteStorage.insertEmailLog(emailLog);
  return emailLog;
}

// -----------------------------------------------------------------------------
// 5. PREVIEW & TEST SEND HELPERS
// -----------------------------------------------------------------------------
export function previewUniversityEmail(params: {
  universityId: string;
  eventType: UniversityEmailEventType;
  customTemplate?: Partial<UniversityEmailTemplate>;
  sampleVariables?: Record<string, any>;
}): { subject: string; html: string } {
  let university = sqliteStorage.getAllCampuses().find(c => c.id === params.universityId || c.slug === params.universityId);
  if (!university) {
    university = findUniversityBySlug(params.universityId) || VERIFIED_UNIVERSITIES[0];
  }
  const uniName = university ? university.name : 'University of Example';
  const uniSlug = university ? university.slug : 'university-of-example';
  const rawUniInstagram = university?.instagramHandle || `${uniSlug}2028class`;
  const uniInstagram = String(rawUniInstagram).replace(/^@+/, '');

  let identity = sqliteStorage.getUniversityEmailIdentity(params.universityId);
  if (!identity && university) {
    identity = sqliteStorage.getUniversityEmailIdentity(university.slug);
  }
  if (!identity) {
    identity = {
      universityId: university?.id || 'sample',
      universitySlug: uniSlug,
      universityName: uniName,
      senderName: `${uniName} Campus Portal`,
      senderEmail: `${uniSlug}@notifications.campusconnect.app`,
      replyTo: `admissions@${uniSlug}.edu`,
      logoUrl: university?.logoUrl,
      primaryColor: university?.primaryColor || '#1D64EC',
      secondaryColor: university?.secondaryColor || university?.accentColor || '#38BDF8',
      signature: `Warm regards,\n\n**The ${uniName} Student Media Team**`,
      isEnabled: true
    };
  }

  const def = DEFAULT_UNIVERSITY_TEMPLATES[params.eventType] || DEFAULT_UNIVERSITY_TEMPLATES.WELCOME;
  const savedCustom = sqliteStorage.getUniversityEmailTemplate(identity.universityId, params.eventType);
  const tpl = {
    ...def,
    ...(savedCustom || {}),
    ...params.customTemplate
  };

  const sampleVars: Record<string, any> = {
    student_name: 'Alex Morgan',
    student_email: 'alex.morgan@campus.edu',
    university_name: uniName,
    university_instagram: uniInstagram,
    submission_reference: 'CC-94821',
    payment_amount: '6.00',
    payment_status: 'CONFIRMED',
    submission_status: 'UNDER_REVIEW',
    continuation_link: `https://campusconnect.app/university/${uniSlug}`,
    instagram_post_url: `https://instagram.com/${uniInstagram}`,
    rejection_reason: 'Photo has low resolution or strong filters applied.',
    support_email: 'support@campusconnect.app',
    year: new Date().getFullYear().toString(),
    ...params.sampleVariables
  };
  sampleVars.university_instagram = String(sampleVars.university_instagram || uniInstagram).replace(/^@+/, '');

  const finalSubject = interpolateVariables(tpl.subject, sampleVars);
  const finalPreheader = interpolateVariables(tpl.preheader || '', sampleVars);
  const finalHeadline = interpolateVariables(tpl.headline || '', sampleVars);
  const finalMarkdown = interpolateVariables(tpl.bodyMarkdown, sampleVars);
  const finalButtonText = interpolateVariables(tpl.buttonText || '', sampleVars);
  const finalButtonLink = interpolateVariables(tpl.buttonLink || '', sampleVars);
  const finalFooter = interpolateVariables(tpl.footerText || '', sampleVars);

  const rawSignature = interpolateVariables(
    identity.signature || `Warm regards,\n\n**The ${identity.universityName} Student Media Team**`,
    sampleVars
  );
  const signatureHtml = /<(?:br|p|strong|em|div|span|a)\b/i.test(rawSignature)
    ? rawSignature
    : parseSimpleMarkdownToHtml(rawSignature);

  const bodyHtml = parseSimpleMarkdownToHtml(finalMarkdown);

  const html = generateBrandedEmailHtml({
    identity,
    subject: finalSubject,
    preheader: finalPreheader,
    headline: finalHeadline,
    bodyHtml,
    buttonText: finalButtonText,
    buttonLink: finalButtonLink,
    footerText: finalFooter,
    signatureHtml
  });

  return { subject: finalSubject, html };
}
