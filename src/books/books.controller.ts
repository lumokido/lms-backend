import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Response,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response as ExpressResponse } from 'express';
import { BooksService } from './books.service.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/roles.guard.js';
import type { UploadedFile as MulterFile } from '../storage/uploaded-file.interface.js';
import type { AccessStatus, PaymentStatus } from '../database/database.service.js';

@Controller()
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // ==========================================
  // PUBLIC BOOK STORE ENDPOINTS
  // ==========================================

  /**
   * Public list of published books
   * GET /books
   */
  @Get('books')
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.booksService.findAll({ status, category, search });
  }

  /**
   * Public book details
   * GET /books/:id
   */
  @Get('books/:id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  // ==========================================
  // STUDENT "MY BOOKS" & DRM READER ENDPOINTS
  // ==========================================

  /**
   * Authenticated student library: Returns only books with verified active purchases
   * GET /student/books & GET /books/my-library
   */
  @UseGuards(JwtAuthGuard)
  @Get('student/dashboard')
  getStudentDashboard(@Request() req: any) {
    return this.booksService.getStudentDashboard(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('student/books')
  getStudentBooks(@Request() req: any) {
    return this.booksService.getUserLibrary(req.user.id || req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('books/my-library')
  getMyLibrary(@Request() req: any) {
    return this.booksService.getUserLibrary(req.user.id || req.user.email);
  }

  /**
   * Single book overview for student
   * GET /student/books/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get('student/books/:id')
  getStudentBook(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  /**
   * PROTECTED DRM READER STREAM:
   * Only allows access if the authenticated student has an ACTIVE purchase (or is Admin).
   * Streams document directly from Cloudflare R2 through NestJS.
   * Public PDF download is strictly disabled.
   * GET /student/books/:id/reader & GET /books/:id/stream
   */
  @UseGuards(JwtAuthGuard)
  @Get('student/books/:id/reader')
  async streamStudentReader(
    @Param('id') id: string,
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    return this.pipeSecureStream(id, req.user, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('books/:id/stream')
  async streamSecureDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    return this.pipeSecureStream(id, req.user, res);
  }

  private async pipeSecureStream(
    id: string,
    user: { id: string; role: string; email: string },
    res: ExpressResponse,
  ) {
    const { stream, contentType, contentLength, book } =
      await this.booksService.getSecureDocumentStream(id, user);

    // Strict security headers: Never allow browser download or cache
    res.setHeader('Content-Type', contentType || 'application/pdf');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    // Inline disposition prevents "Save As" download dialogs
    res.setHeader('Content-Disposition', `inline; filename="${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.pipe(res);
  }

  /**
   * REAL DOCUMENT PREVIEW STREAM:
   * Streams the actual uploaded book document from Cloudflare R2 for inline preview in the reader.
   * Direct download is blocked (inline disposition, private, no-store).
   * GET /books/:id/preview
   */
  @Get('books/:id/preview')
  async streamBookPreview(
    @Param('id') id: string,
    @Response() res: ExpressResponse,
  ) {
    const { stream, contentType, contentLength, book } =
      await this.booksService.getPreviewDocumentStream(id);

    res.setHeader('Content-Type', contentType || 'application/pdf');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Disposition', `inline; filename="${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_preview.pdf"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.pipe(res);
  }

  // ==========================================
  // ADMIN BOOK MANAGEMENT ENDPOINTS
  // ==========================================

  /**
   * Admin list of all books (including drafts)
   * GET /admin/books
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/books')
  adminFindAll(@Query() query: any) {
    return this.booksService.findAll(query);
  }

  /**
   * Upload book document (PDF/EPUB) to Cloudflare R2 (Admin only)
   * POST /books/upload-document
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('books/upload-document')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } })) // 100MB
  async uploadDocument(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new BadRequestException('Please provide a PDF or EPUB document.');
    }
    return this.booksService.uploadDocument(file);
  }

  /**
   * Upload book cover image to Cloudflare R2 (Admin only)
   * POST /books/upload-cover
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('books/upload-cover')
  @UseInterceptors(FileInterceptor('cover', { limits: { fileSize: 10 * 1024 * 1024 } })) // 10MB
  async uploadCover(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new BadRequestException('Please provide an image file.');
    }
    return this.booksService.uploadCover(file);
  }

  /**
   * Create book record (Admin only)
   * POST /admin/books & POST /books
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/books')
  adminCreate(@Body() createDto: CreateBookDto) {
    return this.booksService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('books')
  create(@Body() createDto: CreateBookDto) {
    return this.booksService.create(createDto);
  }

  /**
   * Update book metadata (Admin only)
   * PATCH /admin/books/:id & PATCH /books/:id
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/books/:id')
  adminUpdate(@Param('id') id: string, @Body() updateDto: UpdateBookDto) {
    return this.booksService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('books/:id')
  update(@Param('id') id: string, @Body() updateDto: UpdateBookDto) {
    return this.booksService.update(id, updateDto);
  }

  /**
   * Toggle published / draft status (Admin only)
   * PATCH /books/:id/toggle-status
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('books/:id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.booksService.toggleStatus(id);
  }

  /**
   * Delete book record and Cloudflare R2 file (Admin only)
   * DELETE /admin/books/:id & DELETE /books/:id
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('admin/books/:id')
  adminRemove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('books/:id')
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  // ==========================================
  // ADMIN PURCHASE & ACCESS MANAGEMENT ENDPOINTS
  // ==========================================

  /**
   * Live admin totals: books, students, buyers, and revenue.
   * GET /admin/overview
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/overview')
  getAdminOverview() {
    return this.booksService.getAdminOverview();
  }

  /**
   * List all book purchases with filtering & search (Admin only)
   * GET /admin/purchases
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/purchases')
  getAllPurchases(
    @Query('bookId') bookId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('search') search?: string,
  ) {
    return this.booksService.getAllPurchases({ bookId, status, search });
  }

  /**
   * View purchase details (Admin only)
   * GET /admin/purchases/:purchaseId
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/purchases/:purchaseId')
  getPurchaseById(@Param('purchaseId') purchaseId: string) {
    return this.booksService.getPurchaseById(purchaseId);
  }

  /**
   * Revoke or restore book access (Admin only)
   * PATCH /admin/purchases/:purchaseId/access
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/purchases/:purchaseId/access')
  updatePurchaseAccess(
    @Param('purchaseId') purchaseId: string,
    @Body('accessStatus') accessStatus: AccessStatus,
  ) {
    if (!accessStatus || (accessStatus !== 'ACTIVE' && accessStatus !== 'REVOKED')) {
      throw new BadRequestException('accessStatus must be either ACTIVE or REVOKED');
    }
    return this.booksService.updatePurchaseAccess(purchaseId, accessStatus);
  }
}
