// ─────────────────────────────────────────────────────────────────────────────
// PRIVEX — Email Service
// Uses Nodemailer with Ethereal (free fake SMTP) for the demo environment.
// If SMTP_HOST / SMTP_USER / SMTP_PASS are set in .env, uses real SMTP instead.
// ─────────────────────────────────────────────────────────────────────────────

import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;   // Ethereal preview link (demo only)
  to?: string;
  subject?: string;
  error?: string;
}

let _transporter: Transporter | null = null;
let _testAccount: { user: string; pass: string } | null = null;

/**
 * Lazily initialise the transporter.
 * If real SMTP credentials are present, use them.
 * Otherwise create an Ethereal test account on first call.
 */
async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    // ── Real SMTP
    _transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass },
    });
    logger.info('Email: using real SMTP', { host: smtpHost });
  } else {
    // ── Ethereal fake SMTP (demo / hackathon)
    if (!_testAccount) {
      _testAccount = await nodemailer.createTestAccount();
      logger.info('Email: using Ethereal demo SMTP', { user: _testAccount.user });
    }
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: _testAccount.user, pass: _testAccount.pass },
    });
  }

  return _transporter;
}

/**
 * Send a privacy removal request email.
 */
export async function sendPrivacyRequestEmail(opts: {
  toEmail: string;
  toOrg: string;
  fromName: string;
  fromEmail: string;
  requestId: string;
  requestType: string;
  subject?: string;
  body: string;
}): Promise<EmailResult> {
  const {
    toEmail, toOrg, fromName, fromEmail,
    requestId, requestType, body,
  } = opts;

  const subject = opts.subject
    ?? `[PRIVEX-${requestId.slice(0, 8).toUpperCase()}] Formal ${requestType.replace(/_/g, ' ')} Request — ${fromName}`;

  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: `"${fromName} via PRIVEX" <${fromEmail}>`,
      to: `"Data Protection Officer" <dpo@${toOrg.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com>`,
      replyTo: fromEmail,
      subject,
      text: body,
      html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>
             <hr><p style="color:#666;font-size:11px">Sent via PRIVEX — Autonomous AI Privacy Guardian (DEMO)</p>`,
      headers: {
        'X-PRIVEX-Request-ID': requestId,
        'X-PRIVEX-Request-Type': requestType,
      },
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      logger.info('Email preview (Ethereal):', { url: previewUrl });
    }

    logger.info('Privacy request email sent', { messageId: info.messageId, to: toEmail });

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: typeof previewUrl === 'string' ? previewUrl : undefined,
      to: `dpo@${toOrg.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`,
      subject,
    };
  } catch (err: any) {
    logger.error('Email send failed', { error: err.message });
    return { success: false, error: err.message };
  }
}
