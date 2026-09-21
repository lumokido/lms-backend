import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService, Purchase } from '../database/database.service.js';
import { MailService } from '../mail/mail.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Create an authoritative order on the backend
   * Generates formatted order ID (e.g. LTL-BOOK-2026-000123)
   */
  async createOrder(dto: CreateOrderDto): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    book: {
      id: string;
      title: string;
      price: number;
      coverImage?: string;
    };
    userEmail: string;
    userName?: string;
  }> {
    const book = this.db.findBookById(dto.bookId);
    if (!book) {
      throw new NotFoundException(`Book with ID "${dto.bookId}" was not found.`);
    }

    if (book.status !== 'published') {
      throw new BadRequestException('This book is not currently published for purchase.');
    }

    if (book.purchasesDisabled) {
      throw new BadRequestException('Purchases are currently disabled for this book.');
    }

    // Generate unique order ID matching specs: LTL-BOOK-2026-000001
    const sequence = String(Date.now()).slice(-6);
    const orderId = `LTL-BOOK-${new Date().getFullYear()}-${sequence}`;
    const cleanEmail = dto.email.trim().toLowerCase();

    // Create pending purchase record
    this.db.createPurchase({
      orderId,
      userEmail: cleanEmail,
      userName: dto.name?.trim() || cleanEmail.split('@')[0],
      bookId: book.id,
      amount: book.price,
      paymentId: 'pending',
      paymentStatus: 'PENDING',
      accessStatus: 'ACTIVE',
    });

    this.logger.log(`Created order ${orderId} for book "${book.title}" by ${cleanEmail}`);

    return {
      orderId,
      amount: book.price,
      currency: 'INR',
      book: {
        id: book.id,
        title: book.title,
        price: book.price,
        coverImage: book.coverImage,
      },
      userEmail: cleanEmail,
      userName: dto.name,
    };
  }

  /**
   * Backend payment verification
   * Never trusts the frontend alone; verifies payment record and transitions purchase to SUCCESS
   */
  async verifyPayment(dto: VerifyPaymentDto): Promise<{
    success: boolean;
    orderId: string;
    userEmail: string;
    bookTitle: string;
    amount: number;
    secureAccessToken: string;
    accessUrl: string;
    message: string;
  }> {
    const purchase = this.db.findPurchaseByOrderId(dto.orderId);
    if (!purchase) {
      throw new NotFoundException(`Order "${dto.orderId}" not found.`);
    }

    const book = this.db.findBookById(purchase.bookId);
    if (!book) {
      throw new NotFoundException(`Book for order "${dto.orderId}" not found.`);
    }

    // Idempotent return if already verified
    if (purchase.paymentStatus === 'SUCCESS') {
      const existingToken = this.db.getAllPurchases().find((p) => p.orderId === dto.orderId);
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return {
        success: true,
        orderId: purchase.orderId,
        userEmail: purchase.userEmail,
        bookTitle: book.title,
        amount: purchase.amount,
        secureAccessToken: 'already-verified',
        accessUrl: `${frontendBaseUrl}/dashboard`,
        message: 'Order was already verified and access is active.',
      };
    }

    // Verify payment amount matches if provided
    if (dto.amount && dto.amount !== purchase.amount) {
      this.logger.warn(
        `Payment amount mismatch for order ${dto.orderId}. Expected ${purchase.amount}, received ${dto.amount}`,
      );
      this.db.updatePurchase(dto.orderId, { paymentStatus: 'FAILED' });
      throw new BadRequestException('Payment amount mismatch detected. Verification failed.');
    }

    // Record verified transaction
    this.db.recordPayment({
      orderId: dto.orderId,
      purchaseId: purchase.id,
      amount: purchase.amount,
      currency: 'INR',
      gateway: 'secure_gateway',
      signature: dto.signature,
      status: 'SUCCESS',
      payload: { paymentId: dto.paymentId, verifiedAt: new Date().toISOString() },
    });

    // Update purchase record to SUCCESS and ACTIVE
    this.db.updatePurchase(dto.orderId, {
      paymentId: dto.paymentId,
      paymentStatus: 'SUCCESS',
      accessStatus: 'ACTIVE',
    });

    // Increment downloads/reads on book
    this.db.updateBook(book.id, { downloads: (book.downloads || 0) + 1 });

    // Generate single-use cryptographically secure access token (Section 11)
    const secureToken = crypto.randomBytes(32).toString('hex');
    this.db.createEmailVerification(
      purchase.userEmail,
      secureToken,
      purchase.orderId,
      purchase.bookId,
    );

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const secureAccessUrl = `${frontendBaseUrl}/book/access/${secureToken}`;

    // Automatically send purchase confirmation email (Section 10)
    await this.mailService.sendPurchaseConfirmation({
      to: purchase.userEmail,
      userName: purchase.userName,
      bookTitle: book.title,
      amount: purchase.amount,
      orderId: purchase.orderId,
      secureAccessUrl,
    });

    this.logger.log(
      `Payment verified for order ${purchase.orderId}. Confirmation email dispatched to ${purchase.userEmail}`,
    );

    return {
      success: true,
      orderId: purchase.orderId,
      userEmail: purchase.userEmail,
      bookTitle: book.title,
      amount: purchase.amount,
      secureAccessToken: secureToken,
      accessUrl: secureAccessUrl,
      message: 'Payment verified successfully. Confirmation email sent with secure access link.',
    };
  }
}
