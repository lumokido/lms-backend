import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendPurchaseEmailOptions {
  to: string;
  userName?: string;
  bookTitle: string;
  amount: number;
  orderId: string;
  secureAccessUrl: string;
}

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  expiryMinutes?: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private brevoApiKey: string | null = null;
  private fromName: string = 'Ryzer Team';
  private fromEmail: string = 'hello@ryzer.app';

  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY?.trim() || null;
    this.fromName = process.env.SMTP_USERNAME?.replace(/"/g, '').trim() || 'Ryzer Team';
    this.fromEmail = process.env.EMAIL_FROM?.trim() || 'hello@ryzer.app';

    if (this.brevoApiKey) {
      this.isConfigured = true;
      this.logger.log(`Brevo Transactional API configured. Sender: "${this.fromName}" <${this.fromEmail}>`);
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
      this.logger.log(`SMTP configured for ${host} (${user})`);
    }

    if (!this.isConfigured) {
      this.logger.warn(
        'Email credentials not set in .env. Outgoing emails will be logged to console in local development mode.',
      );
    }
  }

  /**
   * Dispatches transactional email via Brevo REST API
   */
  private async sendViaBrevo(
    to: string,
    recipientName: string,
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    if (!this.brevoApiKey) return false;

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.fromName,
            email: this.fromEmail,
          },
          to: [
            {
              email: to,
              name: recipientName || to.split('@')[0],
            },
          ],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo API send error (${response.status}): ${errorText}`);
        return false;
      }

      const data: any = await response.json();
      this.logger.log(`Email delivered successfully via Brevo to ${to} (MessageId: ${data.messageId})`);
      return true;
    } catch (err: any) {
      this.logger.error(`Brevo network dispatch error: ${err.message}`, err.stack);
      return false;
    }
  }

  async sendPurchaseConfirmation(options: SendPurchaseEmailOptions): Promise<boolean> {
    const { to, userName, bookTitle, amount, orderId, secureAccessUrl } = options;
    const subject = `Your LOG TO LEARN Book Purchase Was Successful (${orderId})`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #0f172a; font-weight: 600; }
    .btn-container { text-align: center; margin: 30px 0 24px; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; }
    .notice { font-size: 12px; color: #64748b; line-height: 1.6; text-align: center; margin-top: 16px; }
    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LOG TO LEARN</h1>
      <p>Secure Digital Learning & Document Access</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${userName || 'Learner'},</div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        You have successfully purchased access to <strong>${bookTitle}</strong>.
        Your book is now ready in your LOG TO LEARN student workspace.
      </p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Book Title:</span>
          <span class="detail-value">${bookTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid:</span>
          <span class="detail-value">₹${amount}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Order ID:</span>
          <span class="detail-value" style="font-family: monospace;">${orderId}</span>
        </div>
      </div>

      <div class="btn-container">
        <a href="${secureAccessUrl}" class="btn">ACCESS MY BOOK</a>
      </div>

      <p class="notice">
        You will be authenticated using a quick one-time email OTP before accessing the book in your dashboard.<br />
        Direct PDF downloads are disabled for copyright protection.
      </p>
    </div>
    <div class="footer">
      Regards,<br />
      <strong>${this.fromName}</strong> &bull; <a href="mailto:${this.fromEmail}" style="color: #64748b;">${this.fromEmail}</a>
    </div>
  </div>
</body>
</html>
    `;

    // 1. Try Brevo API first
    if (this.brevoApiKey) {
      const sent = await this.sendViaBrevo(to, userName || 'Learner', subject, htmlContent);
      if (sent) return true;
    }

    // 2. Try Nodemailer SMTP
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to,
          subject,
          html: htmlContent,
        });
        this.logger.log(`Purchase confirmation email sent via SMTP to ${to} for order ${orderId}`);
        return true;
      } catch (err) {
        this.logger.error(`Failed to send email via SMTP to ${to}:`, err);
      }
    }

    // 3. Local console fallback
    this.logger.log(`\n======================================================`);
    this.logger.log(`[EMAIL AUTOMATION - PURCHASE CONFIRMATION]`);
    this.logger.log(`To: ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Order ID: ${orderId}`);
    this.logger.log(`Book: ${bookTitle} (₹${amount})`);
    this.logger.log(`Secure Access Link: ${secureAccessUrl}`);
    this.logger.log(`======================================================\n`);
    return true;
  }

  async sendOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    const { to, otp, expiryMinutes = 10 } = options;
    const subject = `Your Verification Code: ${otp} – LOG TO LEARN`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 26px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; text-align: center; }
    .otp-code { font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0284c7; background: #f0f9ff; border: 1.5px dashed #38bdf8; border-radius: 10px; padding: 12px 18px; margin: 22px auto; display: inline-block; }
    .notice { font-size: 13px; color: #64748b; line-height: 1.6; margin: 16px 0 0; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LOG TO LEARN</h1>
    </div>
    <div class="content">
      <h2 style="margin: 0 0 8px; font-size: 17px; color: #0f172a; font-weight: 600;">Verify Your Email Address</h2>
      <p style="font-size: 14px; color: #475569; margin: 0;">
        Enter the 6-digit verification code below to access your purchased books and reading dashboard.
      </p>

      <div class="otp-code">${otp}</div>

      <p class="notice">
        This code is valid for <strong>${expiryMinutes} minutes</strong> and can only be used once.<br />
        If you did not initiate this request, please ignore this message.
      </p>
    </div>
    <div class="footer">
      Sent by <strong>${this.fromName}</strong> &bull; <a href="mailto:${this.fromEmail}" style="color: #64748b;">${this.fromEmail}</a>
    </div>
  </div>
</body>
</html>
    `;

    // 1. Try Brevo API first
    if (this.brevoApiKey) {
      const sent = await this.sendViaBrevo(to, 'Student', subject, htmlContent);
      if (sent) return true;
    }

    // 2. Try Nodemailer SMTP
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to,
          subject,
          html: htmlContent,
        });
        this.logger.log(`OTP verification email sent via SMTP to ${to}`);
        return true;
      } catch (err) {
        this.logger.error(`Failed to send OTP email to ${to}:`, err);
      }
    }

    // 3. Local console fallback
    this.logger.log(`\n======================================================`);
    this.logger.log(`[EMAIL AUTOMATION - OTP VERIFICATION]`);
    this.logger.log(`To: ${to}`);
    this.logger.log(`Verification OTP: [ ${otp} ] (Valid for ${expiryMinutes} minutes)`);
    this.logger.log(`======================================================\n`);
    return true;
  }
}
