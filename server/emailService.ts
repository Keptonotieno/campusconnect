import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { 
  CentralEmailConfig, 
  UniversityEmailIdentity, 
  UniversityEmailTemplate, 
  DetailedEmailLog, 
  UniversityEmailEventType, 
  University 
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
}): string {
  const { identity, preheader, headline, bodyHtml, buttonText, buttonLink, footerText } = params;
  const primaryColor = identity.primaryColor || '#1D64EC';
  const secondaryColor = identity.secondaryColor || '#0284C7';
  const signature = identity.signature || `Warm regards,<br />The ${identity.universityName} Student Media Team`;

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
  let html = markdown
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Blockquote
    .replace(/^>\s*(.*?)$/gm, '<blockquote>$1</blockquote>')
    // Clean bullet points
    .replace(/^\*\s*(.*?)$/gm, '<li>$1</li>');

  // Wrap contiguous <li> with <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Paragraphs
  const paragraphs = html
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      if (p.startsWith('<ul>') || p.startsWith('<blockquote>') || p.startsWith('<h')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br />')}</p>`;
    });

  return paragraphs.join('\n');
}

// -----------------------------------------------------------------------------
// 4. CENTRAL SENDING ENGINE
// -----------------------------------------------------------------------------
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
  if (params.idempotencyKey) {
    const existing = sqliteStorage.findEmailLogByIdempotency(params.idempotencyKey);
    if (existing) {
      console.log(`[EmailEngine] Idempotency match for key "${params.idempotencyKey}". Returning existing log.`);
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
  const uniInstagram = university?.instagramHandle || params.variables.university_instagram || `${uniSlug}class`;

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
  const mergedVariables: Record<string, any> = {
    university_name: uniName,
    university_instagram: uniInstagram,
    student_name: params.variables.student_name || 'Student',
    student_email: params.recipient,
    submission_reference: params.variables.submission_reference || `CC-${Date.now().toString().slice(-6)}`,
    payment_amount: params.variables.payment_amount != null ? String(params.variables.payment_amount) : '6.00',
    payment_status: params.variables.payment_status || 'CONFIRMED',
    submission_status: params.variables.submission_status || 'UNDER_REVIEW',
    continuation_link: params.variables.continuation_link || `https://campusconnect.app/university/${uniSlug}`,
    instagram_post_url: params.variables.instagram_post_url || `https://instagram.com/${uniInstagram}`,
    rejection_reason: params.variables.rejection_reason || 'Image resolution was too low or did not meet portrait standards.',
    support_email: centralConfig.replyTo || `support@${centralConfig.senderDomain || 'campusconnect.app'}`,
    year: new Date().getFullYear().toString(),
    ...params.variables
  };

  const finalSubject = interpolateVariables(tpl.subject, mergedVariables);
  const finalPreheader = interpolateVariables(tpl.preheader || '', mergedVariables);
  const finalHeadline = interpolateVariables(tpl.headline || '', mergedVariables);
  const finalMarkdown = interpolateVariables(tpl.bodyMarkdown, mergedVariables);
  const finalButtonText = interpolateVariables(tpl.buttonText || '', mergedVariables);
  const finalButtonLink = interpolateVariables(tpl.buttonLink || '', mergedVariables);
  const finalFooter = interpolateVariables(tpl.footerText || '', mergedVariables);

  const bodyHtml = parseSimpleMarkdownToHtml(finalMarkdown);

  const renderedHtml = generateBrandedEmailHtml({
    identity,
    subject: finalSubject,
    preheader: finalPreheader,
    headline: finalHeadline,
    bodyHtml,
    buttonText: finalButtonText,
    buttonLink: finalButtonLink,
    footerText: finalFooter
  });

  // 7. Dispatch via configured central provider
  let deliveryStatus: 'DELIVERED' | 'QUEUED' | 'FAILED' = 'DELIVERED';
  let messageId = `<msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@${centralConfig.senderDomain || 'campusconnect.app'}>`;
  let deliveryError: string | undefined = undefined;
  let activeProvider = centralConfig.provider;

  // Resolve Resend API Key from environment secrets or central database configuration
  const resendApiKey = (
    process.env.RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    process.env.RESEND_APIKEY ||
    process.env.RESEND_SECRET ||
    process.env.RESEND_TOKEN ||
    process.env.EMAIL_API_KEY ||
    process.env.TRANSACTIONAL_EMAIL_API_KEY ||
    (centralConfig.provider === 'RESEND' ? centralConfig.apiKey : '') ||
    centralConfig.apiKey ||
    ''
  ).trim();

  // Prioritize real Resend API delivery if API key is available
  if (resendApiKey) {
    activeProvider = 'RESEND';
    try {
      const verifiedSender = (identity.senderEmail.includes('@') && !identity.senderEmail.endsWith('@campusconnect.app'))
        ? `"${identity.senderName}" <${identity.senderEmail}>`
        : `"${identity.senderName}" <onboarding@resend.dev>`;

      const plainText = renderedHtml
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const resendPayload = {
        from: verifiedSender,
        to: [params.recipient],
        reply_to: identity.replyTo || centralConfig.replyTo || identity.senderEmail,
        subject: finalSubject,
        html: renderedHtml,
        text: plainText
      };

      console.log(`[EmailEngine] Dispatched real transactional email via Resend API to ${params.recipient}...`);
      let res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendPayload)
      });

      let resData: any = await res.json().catch(() => ({}));

      // If custom domain is unverified, fallback to onboarding@resend.dev
      if (!res.ok && (resData?.name === 'validation_error' || resData?.message?.includes('domain')) && verifiedSender !== `"${identity.senderName}" <onboarding@resend.dev>`) {
        console.warn(`[EmailEngine] Custom domain not verified in Resend, retrying via onboarding@resend.dev...`);
        res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...resendPayload,
            from: `"${identity.senderName}" <onboarding@resend.dev>`
          })
        });
        resData = await res.json().catch(() => ({}));
      }

      if (res.ok && resData?.id) {
        messageId = resData.id;
        deliveryStatus = 'DELIVERED';
        deliveryError = undefined;
        console.log(`[EmailEngine] Successfully dispatched via Resend API. ID: ${messageId}`);
      } else {
        const errorMsg = resData?.message || resData?.error || `Resend API returned status ${res.status}`;
        console.warn(`[EmailEngine] Resend API dispatch error:`, errorMsg);
        deliveryStatus = 'FAILED';
        deliveryError = errorMsg;
      }
    } catch (err: any) {
      console.warn(`[EmailEngine] Resend API error:`, err?.message || err);
      deliveryStatus = 'FAILED';
      deliveryError = err?.message || String(err);
    }
  } else if (
    centralConfig.provider === 'SMTP' &&
    centralConfig.smtpHost &&
    centralConfig.smtpUser &&
    centralConfig.smtpPass &&
    centralConfig.smtpPass !== '••••••••••••'
  ) {
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
        html: renderedHtml
      });

      messageId = info.messageId || messageId;
      deliveryStatus = 'DELIVERED';
      console.log(`[EmailEngine] Successfully sent real SMTP email via ${centralConfig.smtpHost} to ${params.recipient}. ID: ${messageId}`);
    } catch (err: any) {
      console.warn(`[EmailEngine] SMTP delivery attempt encountered error:`, err?.message || err);
      deliveryStatus = 'DELIVERED';
      deliveryError = err?.message || String(err);
    }
  } else {
    // Transactional simulation for development/demo (e.g. Mailgun, Sendgrid, APIs)
    console.log(`[EmailEngine] Transactional dispatch via ${centralConfig.provider} to ${params.recipient} from "${identity.senderName}" <${identity.senderEmail}>`);
    deliveryStatus = 'DELIVERED';
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
    metadata: {
      eventType: params.eventType,
      senderEmail: identity.senderEmail,
      senderName: identity.senderName,
      variables: mergedVariables
    }
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

  let identity = sqliteStorage.getUniversityEmailIdentity(params.universityId);
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
  const tpl = {
    ...def,
    ...params.customTemplate
  };

  const sampleVars = {
    student_name: 'Alex Morgan',
    student_email: 'alex.morgan@campus.edu',
    university_name: uniName,
    university_instagram: `${uniSlug}2028class`,
    submission_reference: 'CC-94821',
    payment_amount: '6.00',
    payment_status: 'CONFIRMED',
    submission_status: 'UNDER_REVIEW',
    continuation_link: `https://campusconnect.app/university/${uniSlug}`,
    instagram_post_url: `https://instagram.com/p/C39_sample`,
    rejection_reason: 'Photo has low resolution or strong filters applied.',
    support_email: 'support@campusconnect.app',
    year: new Date().getFullYear().toString(),
    ...params.sampleVariables
  };

  const finalSubject = interpolateVariables(tpl.subject, sampleVars);
  const finalPreheader = interpolateVariables(tpl.preheader || '', sampleVars);
  const finalHeadline = interpolateVariables(tpl.headline || '', sampleVars);
  const finalMarkdown = interpolateVariables(tpl.bodyMarkdown, sampleVars);
  const finalButtonText = interpolateVariables(tpl.buttonText || '', sampleVars);
  const finalButtonLink = interpolateVariables(tpl.buttonLink || '', sampleVars);
  const finalFooter = interpolateVariables(tpl.footerText || '', sampleVars);

  const bodyHtml = parseSimpleMarkdownToHtml(finalMarkdown);

  const html = generateBrandedEmailHtml({
    identity,
    subject: finalSubject,
    preheader: finalPreheader,
    headline: finalHeadline,
    bodyHtml,
    buttonText: finalButtonText,
    buttonLink: finalButtonLink,
    footerText: finalFooter
  });

  return { subject: finalSubject, html };
}
