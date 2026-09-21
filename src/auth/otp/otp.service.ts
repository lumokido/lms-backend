import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService, User, Purchase } from '../../database/database.service.js';
import { MailService } from '../../mail/mail.service.js';
import { AccessRequestDto } from './dto/access-request.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Masks email: e.g. v******@gmail.com (as specified in Section 12)
   */
  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    const firstChar = name[0];
    const masked = '*'.repeat(Math.max(3, name.length - 1));
    return `${firstChar}${masked}@${domain}`;
  }

  /**
   * Generate, hash and dispatch a 6-digit OTP
   */
  private async generateAndSendOtp(email: string, purpose: 'BOOK_ACCESS' | 'LOGIN' = 'BOOK_ACCESS') {
    const cleanEmail = email.toLowerCase().trim();

    // Check resend cooldown: 30 seconds
    const latest = this.db.findLatestOtp(cleanEmail, purpose);
    if (latest) {
      const elapsedMs = Date.now() - new Date(latest.createdAt).getTime();
      if (elapsedMs < 30 * 1000) {
        const waitSec = Math.ceil((30 * 1000 - elapsedMs) / 1000);
        throw new BadRequestException(
          `Please wait ${waitSec}s before requesting a new OTP.`,
        );
      }
    }

    // Generate random 6-digit number
    const otpNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = bcrypt.hashSync(otpNumber, 10);

    // Persist securely in Database
    this.db.createOtp(cleanEmail, hashedOtp, purpose);

    // Send email with OTP code
    await this.mailService.sendOtpEmail({
      to: cleanEmail,
      otp: otpNumber,
      expiryMinutes: 10,
    });

    this.logger.log(`Dispatched 6-digit OTP to ${cleanEmail}`);
    return {
      success: true,
      maskedEmail: this.maskEmail(cleanEmail),
      expiryMinutes: 10,
    };
  }

  /**
   * Handles user opening the secure token link: /book/access/<token>
   * Automatically validates token and generates OTP
   */
  async handleAccessRequest(dto: AccessRequestDto) {
    const ev = this.db.findEmailVerification(dto.token);
    if (!ev) {
      throw new NotFoundException('Invalid or expired secure access link.');
    }

    if (new Date() > new Date(ev.expiresAt)) {
      throw new BadRequestException('This access link has expired. Please request a new link.');
    }

    const book = this.db.findBookById(ev.bookId);

    // Send OTP to the verified buyer email
    const otpResult = await this.generateAndSendOtp(ev.email, 'BOOK_ACCESS');

    return {
      success: true,
      email: ev.email,
      maskedEmail: otpResult.maskedEmail,
      orderId: ev.orderId,
      bookTitle: book?.title || 'Purchased Document',
      bookId: ev.bookId,
      message: `A 6-digit verification code was sent to ${otpResult.maskedEmail}`,
    };
  }

  /**
   * Resend / Send OTP for arbitrary email
   */
  async sendOtp(dto: SendOtpDto) {
    const result = await this.generateAndSendOtp(dto.email, 'BOOK_ACCESS');
    return {
      success: true,
      email: dto.email,
      maskedEmail: result.maskedEmail,
      message: `OTP has been dispatched to ${result.maskedEmail}`,
    };
  }

  /**
   * Verify the 6-digit OTP, issue JWT, and authenticate student
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{
    success: boolean;
    accessToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    message: string;
  }> {
    const cleanEmail = dto.email.toLowerCase().trim();
    const otpRecord = this.db.findLatestOtp(cleanEmail, 'BOOK_ACCESS');

    if (!otpRecord) {
      throw new BadRequestException('No active OTP found. Please request a new verification code.');
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      throw new BadRequestException('Verification code has expired. Please request a new OTP.');
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const isValid = bcrypt.compareSync(dto.otp.trim(), otpRecord.hashedOtp);
    if (!isValid) {
      this.db.incrementOtpAttempts(otpRecord.id);
      const remaining = 5 - (otpRecord.attempts + 1);
      throw new BadRequestException(
        `Incorrect OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code blocked.'}`,
      );
    }

    // Mark OTP verified
    this.db.markOtpVerified(otpRecord.id);

    // If token was provided, mark email verification used
    if (dto.token) {
      this.db.markEmailVerificationUsed(dto.token);
    }

    // Find or create student user
    let user = this.db.findUserByEmail(cleanEmail);
    if (!user) {
      const defaultName = cleanEmail.split('@')[0];
      const dummyPasswordHash = bcrypt.hashSync(Math.random().toString(), 10);
      user = {
        id: `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        email: cleanEmail,
        passwordHash: dummyPasswordHash,
        name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
        role: 'user',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=0284c7&color=fff`,
      };
      (this.db as any).data.users.push(user);
      (this.db as any).saveData();
    }

    // Attach any previous purchases for this email to user ID
    this.db.getAllPurchases().forEach((p: Purchase) => {
      if (p.userEmail.toLowerCase() === cleanEmail && !p.userId) {
        p.userId = user!.id;
      }
    });

    // Generate JWT access token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Student ${cleanEmail} successfully authenticated via OTP`);

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: 'OTP verified successfully. Access granted.',
    };
  }
}
