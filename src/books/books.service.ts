import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  DatabaseService,
  Book,
  Purchase,
  PaymentStatus,
  AccessStatus,
} from '../database/database.service.js';
import { R2StorageService } from '../storage/r2-storage.service.js';
import { UploadedFile } from '../storage/uploaded-file.interface.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

@Injectable()
export class BooksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly r2Storage: R2StorageService,
  ) {}

  /**
   * List all books (with optional filters)
   */
  findAll(params?: { status?: string; category?: string; search?: string }): Book[] {
    return this.db.getAllBooks(params);
  }

  /**
   * Find single book details (without private document stream)
   */
  findOne(id: string): Book {
    const book = this.db.findBookById(id);
    if (!book) {
      throw new NotFoundException(`Book with ID "${id}" not found.`);
    }
    return book;
  }

  /**
   * Uploads book PDF/EPUB document directly into private Cloudflare R2 bucket
   */
  async uploadDocument(file: UploadedFile): Promise<{
    r2StorageKey: string;
    fileSize: string;
    format: 'PDF' | 'EPUB';
  }> {
    if (!file) {
      throw new BadRequestException('No file provided for upload.');
    }

    const extension = file.originalname.split('.').pop()?.toUpperCase();
    const format: 'PDF' | 'EPUB' = extension === 'EPUB' ? 'EPUB' : 'PDF';

    // Format human-readable file size (e.g. 14.5 MB)
    const sizeInMB = file.size / (1024 * 1024);
    const fileSize =
      sizeInMB >= 1
        ? `${sizeInMB.toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    // Secure key inside Cloudflare R2 bucket: e.g. documents/17267382-physics.pdf
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2StorageKey = `documents/${Date.now()}-${sanitizedName}`;

    await this.r2Storage.uploadFile(
      file.buffer,
      r2StorageKey,
      file.mimetype || 'application/pdf',
    );

    return {
      r2StorageKey,
      fileSize,
      format,
    };
  }

  /**
   * Uploads book cover image into Cloudflare R2
   */
  async uploadCover(file: UploadedFile): Promise<{ coverUrl: string; r2Key: string }> {
    if (!file) {
      throw new BadRequestException('No cover image provided.');
    }

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `covers/${Date.now()}-${sanitizedName}`;

    await this.r2Storage.uploadFile(
      file.buffer,
      r2Key,
      file.mimetype || 'image/jpeg',
    );

    const coverUrl = await this.r2Storage.getPresignedReadUrl(r2Key, 60 * 60 * 24 * 7); // 7 days

    return {
      coverUrl,
      r2Key,
    };
  }

  /**
   * Create new book record (Admin only)
   */
  create(dto: CreateBookDto): Book {
    return this.db.createBook({
      title: dto.title,
      subtitle: dto.subtitle,
      author: dto.author,
      category: dto.category,
      subject: dto.subject,
      course: dto.course,
      price: dto.price ?? 0,
      discountPrice: dto.discountPrice,
      format: dto.format || 'PDF',
      pages: dto.pages ?? 1,
      language: dto.language || 'English',
      fileSize: dto.fileSize || '1.0 MB',
      r2StorageKey: dto.r2StorageKey,
      coverImage: dto.coverImage,
      description: dto.description || '',
      publicationInfo: dto.publicationInfo,
      previewSettings: dto.previewSettings,
      status: dto.status || 'published',
      purchasesDisabled: dto.purchasesDisabled || false,
    });
  }

  /**
   * Update book metadata
   */
  update(id: string, dto: UpdateBookDto): Book {
    this.findOne(id);
    const updated = this.db.updateBook(id, dto);
    if (!updated) {
      throw new NotFoundException(`Book with ID "${id}" could not be updated.`);
    }
    return updated;
  }

  /**
   * Toggle published / draft status
   */
  toggleStatus(id: string): Book {
    const book = this.findOne(id);
    const newStatus = book.status === 'published' ? 'draft' : 'published';
    const updated = this.db.updateBook(id, { status: newStatus });
    return updated!;
  }

  /**
   * Delete book record and its Cloudflare R2 file
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const book = this.findOne(id);
    if (book.r2StorageKey) {
      await this.r2Storage.deleteFile(book.r2StorageKey);
    }
    this.db.deleteBook(id);
    return { success: true, message: `Book "${book.title}" was removed.` };
  }

  /**
   * SECURE DRM STREAM:
   * Only allows access if:
   * 1. User is an Administrator, OR
   * 2. User has an active, verified purchase entitlement for this book.
   * 
   * Streams file directly through NestJS — raw Cloudflare R2 URLs are NEVER exposed!
   */
  async getSecureDocumentStream(bookId: string, user: { id: string; role: string; email: string }) {
    const book = this.findOne(bookId);

    const isAdmin = user.role === 'admin';
    const hasPurchased = this.db.hasUserPurchasedBook(user.id || user.email, bookId);

    if (!isAdmin && !hasPurchased) {
      throw new ForbiddenException(
        'Access denied: You must purchase this document before reading.',
      );
    }

    if (!isAdmin && book.status !== 'published') {
      throw new ForbiddenException(
        'Access denied: This book is currently not published.',
      );
    }

    if (!book.r2StorageKey) {
      throw new NotFoundException('Document file has not been uploaded for this book.');
    }

    // Stream from Cloudflare R2
    const streamData = await this.r2Storage.getObjectStream(book.r2StorageKey);
    return {
      book,
      ...streamData,
    };
  }

  /**
   * REAL DOCUMENT PREVIEW STREAM:
   * Streams the actual book PDF for inline preview in the browser reader.
   * Public PDF download is strictly disabled (inline disposition, private, no-store).
   */
  async getPreviewDocumentStream(bookId: string) {
    const book = this.findOne(bookId);

    if (book.status !== 'published') {
      throw new ForbiddenException('Access denied: Book is not published.');
    }

    if (!book.r2StorageKey) {
      throw new NotFoundException('Document file has not been uploaded for this book.');
    }

    const streamData = await this.r2Storage.getObjectStream(book.r2StorageKey);
    return {
      book,
      ...streamData,
    };
  }

  /**
   * Purchase a book and grant digital rights access (Direct purchase record)
   */
  recordPurchase(
    bookId: string,
    user: { id: string; email: string },
    transactionId?: string,
  ): Purchase {
    const book = this.findOne(bookId);

    return this.db.createPurchase({
      orderId: `LTL-BOOK-${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      bookId: book.id,
      amount: book.price,
      paymentId: transactionId || `tx-${Date.now()}`,
      paymentStatus: 'SUCCESS',
      accessStatus: 'ACTIVE',
    });
  }

  /**
   * Get all books purchased by a specific user (For "My Books" dashboard)
   */
  getUserLibrary(userIdOrEmail: string): Book[] {
    return this.db.getUserPurchasedBooks(userIdOrEmail);
  }

  /**
   * Admin: Get all purchases with filters
   */
  getAllPurchases(filter?: { bookId?: string; status?: PaymentStatus; search?: string }) {
    const purchases = this.db.getAllPurchases(filter);
    return purchases.map((p) => {
      const book = this.db.findBookById(p.bookId);
      return {
        ...p,
        bookTitle: book?.title || 'Unknown Book',
        bookAuthor: book?.author || '',
        bookCover: book?.coverImage || '',
      };
    });
  }

  /**
   * Admin: Get single purchase details
   */
  getPurchaseById(id: string) {
    const purchase = this.db.findPurchaseById(id);
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${id}" not found.`);
    }
    const book = this.db.findBookById(purchase.bookId);
    return {
      ...purchase,
      bookTitle: book?.title || 'Unknown Book',
      bookAuthor: book?.author || '',
      bookCover: book?.coverImage || '',
    };
  }

  /**
   * Admin: Revoke or restore book access
   */
  updatePurchaseAccess(id: string, accessStatus: AccessStatus) {
    const purchase = this.db.findPurchaseById(id) || this.db.findPurchaseByOrderId(id);
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${id}" not found.`);
    }

    const updated = this.db.updatePurchase(purchase.id, {
      accessStatus,
      paymentStatus: accessStatus === 'REVOKED' ? 'REFUNDED' : 'SUCCESS',
    });

    return updated!;
  }
}
