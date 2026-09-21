import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  authorAvatar: string;
  category: string;
  readTime: string;
  publishedAt: string;
  status: 'published' | 'draft';
  views: number;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  blogId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  category: string;
  subject?: string;
  course?: string;
  price: number;
  discountPrice?: number;
  format: 'PDF' | 'EPUB';
  pages: number;
  language?: string;
  fileSize: string;
  r2StorageKey: string;
  coverImage?: string;
  description: string;
  publicationInfo?: string;
  previewSettings?: {
    allowPreview?: boolean;
    previewPagesCount?: number;
  };
  status: 'published' | 'draft';
  purchasesDisabled?: boolean;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type AccessStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface Purchase {
  id: string;
  orderId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  bookId: string;
  amount: number;
  paymentId: string;
  paymentStatus: PaymentStatus;
  accessStatus: AccessStatus;
  purchasedAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  purchaseId: string;
  amount: number;
  currency: string;
  gateway: string;
  signature?: string;
  status: PaymentStatus;
  payload?: any;
  createdAt: string;
}

export interface OtpRecord {
  id: string;
  email: string;
  hashedOtp: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
  purpose: 'BOOK_ACCESS' | 'LOGIN';
  createdAt: string;
}

export interface EmailVerificationRecord {
  id: string;
  email: string;
  token: string;
  orderId: string;
  bookId: string;
  expiresAt: string;
  verified: boolean;
  createdAt: string;
}

// Retain BookPurchase type alias for backwards-compatibility
export type BookPurchase = Purchase;

interface DatabaseSchema {
  users: User[];
  blogs: Blog[];
  comments: Comment[];
  books: Book[];
  purchases: Purchase[];
  payments: PaymentRecord[];
  otps: OtpRecord[];
  emailVerifications: EmailVerificationRecord[];
  bookPurchases?: BookPurchase[];
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private dbFilePath = path.join(process.cwd(), 'data', 'db.json');
  private data: DatabaseSchema = {
    users: [],
    blogs: [],
    comments: [],
    books: [],
    purchases: [],
    payments: [],
    otps: [],
    emailVerifications: [],
  };

  async onModuleInit() {
    this.ensureDbInitialized();
  }

  private ensureDbInitialized() {
    const dir = path.dirname(this.dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.blogs) this.data.blogs = [];
        if (!this.data.comments) this.data.comments = [];
        if (!this.data.books) this.data.books = [];
        if (!this.data.purchases) {
          this.data.purchases = ((this.data as any).bookPurchases || []).map((bp: any) => ({
            id: bp.id,
            orderId: bp.orderId || `LTL-BOOK-${bp.id}`,
            userId: bp.userId,
            userEmail: bp.userEmail,
            bookId: bp.bookId,
            amount: bp.amount || 0,
            paymentId: bp.transactionId || bp.paymentId || `pay-${bp.id}`,
            paymentStatus: bp.status === 'completed' ? 'SUCCESS' : bp.status === 'refunded' ? 'REFUNDED' : 'PENDING',
            accessStatus: bp.status === 'completed' ? 'ACTIVE' : 'REVOKED',
            purchasedAt: bp.purchasedAt || new Date().toISOString(),
            updatedAt: bp.purchasedAt || new Date().toISOString(),
          }));
        }
        if (!this.data.payments) this.data.payments = [];
        if (!this.data.otps) this.data.otps = [];
        if (!this.data.emailVerifications) this.data.emailVerifications = [];
        return;
      } catch (err) {
        console.error('Error reading db.json, re-initializing seeds:', err);
      }
    }

    // Initialize with seeds
    const defaultPasswordHash = bcrypt.hashSync('admin123', 10);
    this.data = {
      users: [
        {
          id: 'usr-admin-1',
          email: 'admin@lumokido.com',
          passwordHash: defaultPasswordHash,
          name: 'Admin Lumokido',
          role: 'admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
      ],
      blogs: [
        {
          id: 'blog-1',
          title: 'Modern Web Architecture with React 19 and Next.js',
          slug: 'modern-web-architecture-react-19',
          excerpt: 'Explore the revolutionary Server Actions, compiler optimizations, and performance patterns that define the state of frontend engineering in 2026.',
          content: `React 19 introduces transformative architectural paradigms for building resilient, high-performance web applications.

### 1. The React Compiler & Zero-Memoization
For years, frontend developers struggled with manually maintaining memoization boundaries via \`useMemo\`, \`useCallback\`, and \`React.memo\`. The new React Compiler automates fine-grained reactivity, allowing code to be written naturally as pure JavaScript without sacrificing rendering efficiency.

### 2. Actions and Server Mutations
By elevating transitions and server functions to first-class citizens, forms and optimistic UI updates no longer require sprawling Redux or state machine boilerplate:
\`\`\`tsx
const [isPending, startTransition] = useTransition();

const handleUpdate = async () => {
  startTransition(async () => {
    await updateProfile(formData);
  });
};
\`\`\`

### 3. Native Asset Preloading & Resource Hints
Document metadata, stylesheets, async scripts, and preloaded fonts can now be declared inline within modular components. React manages DOM deduplication and streaming ordering automatically.

Embracing these primitives allows engineering teams to construct lean, maintainable, and blistering-fast applications.`,
          author: 'Dr. Sarah Jenkins',
          authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          category: 'Development',
          readTime: '6 min read',
          publishedAt: 'May 12, 2026',
          status: 'published',
          views: 1420,
          coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'blog-2',
          title: 'Distributed Systems & Microservices in Node.js',
          slug: 'distributed-systems-microservices-nodejs',
          excerpt: 'A pragmatic guide to message brokers, idempotent consumers, resilient RPC boundaries, and distributed tracing in production Node services.',
          content: `Building microservices at scale requires defensive design, clear bounded contexts, and rock-solid event-driven pipelines.

### Resilient RPC and Timeout Budgets
Every inter-service network call is an opportunity for cascade failure. Establishing strict deadline propagation across HTTP/2 or gRPC transports prevents worker thread starvation during upstream outages.

### Eventual Consistency & Outbox Pattern
Direct database writes paired with loose broker publishing invariably lead to dual-write anomalies. By leveraging the Transactional Outbox pattern, services guarantee that database changes and domain events commit atomically.

### Distributed Observability
Adopting OpenTelemetry allows correlation IDs to trace user requests through API gateways, authentication providers, and asynchronous task queues seamlessly.`,
          author: 'Marcus Aurelius',
          authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          category: 'Data & AI',
          readTime: '9 min read',
          publishedAt: 'May 10, 2026',
          status: 'published',
          views: 2190,
          coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'blog-3',
          title: 'Design Systems for High Velocity Product Teams',
          slug: 'design-systems-high-velocity',
          excerpt: 'Standardizing typography, design tokens, color ramps, and accessible interactive components across web and native platforms.',
          content: `A truly successful design system is not just a Figma UI kit—it is an shared language linking designers and engineers.

### Tokens as the Single Source of Truth
Centralizing spacing scales, semantic color roles, and elevation curves into platform-agnostic JSON tokens enables continuous translation into CSS custom properties, Tailwind themes, and iOS/Android styles.

### Accessibility by Default
Every interactive primitive must fulfill WCAG AAA contrast standards, provide clear keyboard focus indicators, and handle ARIA announcements gracefully for assistive technologies.`,
          author: 'Elena Rostova',
          authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          category: 'Design',
          readTime: '5 min read',
          publishedAt: 'May 08, 2026',
          status: 'published',
          views: 980,
          coverImage: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      comments: [
        {
          id: 'comm-1',
          blogId: 'blog-1',
          authorName: 'Alex Mercer',
          authorEmail: 'alex.m@example.com',
          authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          content: 'The React 19 compiler section is spot on! We migrated our LMS dashboards and eliminated hundreds of lines of useMemo clutter.',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        {
          id: 'comm-2',
          blogId: 'blog-1',
          authorName: 'Sophia Lin',
          authorEmail: 'sophia@example.com',
          authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          content: 'Great overview. Would love to see a follow-up article discussing Server Actions with streaming responses in Next.js App Router!',
          createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        },
        {
          id: 'comm-3',
          blogId: 'blog-2',
          authorName: 'David Chen',
          authorEmail: 'david@tech.io',
          authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
          content: 'The transactional outbox pattern saved our analytics ingestion pipeline from silent message loss. Essential reading for backend devs.',
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        },
      ],
      books: [],
      purchases: [],
      payments: [],
      otps: [],
      emailVerifications: [],
    };
    this.saveData();
  }

  private saveData() {
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  // --- Users ---
  findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  // --- Blogs ---
  getAllBlogs(): Blog[] {
    return [...this.data.blogs];
  }

  getBlogById(idOrSlug: string): Blog | undefined {
    return this.data.blogs.find((b) => b.id === idOrSlug || b.slug === idOrSlug);
  }

  createBlog(blogData: Omit<Blog, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Blog {
    const newBlog: Blog = {
      ...blogData,
      id: `blog-${Date.now()}`,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.blogs.unshift(newBlog);
    this.saveData();
    return newBlog;
  }

  updateBlog(id: string, updates: Partial<Omit<Blog, 'id' | 'createdAt'>>): Blog | undefined {
    const index = this.data.blogs.findIndex((b) => b.id === id);
    if (index === -1) return undefined;

    const existing = this.data.blogs[index];
    const updated: Blog = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.blogs[index] = updated;
    this.saveData();
    return updated;
  }

  incrementBlogViews(id: string): void {
    const blog = this.data.blogs.find((b) => b.id === id);
    if (blog) {
      blog.views += 1;
      this.saveData();
    }
  }

  deleteBlog(id: string): boolean {
    const initialLen = this.data.blogs.length;
    this.data.blogs = this.data.blogs.filter((b) => b.id !== id);
    if (this.data.blogs.length !== initialLen) {
      // Also delete comments belonging to this blog
      this.data.comments = this.data.comments.filter((c) => c.blogId !== id);
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Comments ---
  getCommentsForBlog(blogId: string): Comment[] {
    return this.data.comments
      .filter((c) => c.blogId === blogId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createComment(commentData: Omit<Comment, 'id' | 'createdAt'>): Comment {
    const newComment: Comment = {
      ...commentData,
      id: `comm-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.comments.push(newComment);
    this.saveData();
    return newComment;
  }

  deleteComment(commentId: string): boolean {
    const initialLen = this.data.comments.length;
    this.data.comments = this.data.comments.filter((c) => c.id !== commentId);
    if (this.data.comments.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Books ---
  getAllBooks(params?: { status?: string; category?: string; search?: string }): Book[] {
    let result = [...this.data.books];

    if (params?.status) {
      result = result.filter((b) => b.status === params.status);
    }
    if (params?.category && params.category !== 'All') {
      result = result.filter(
        (b) => b.category.toLowerCase() === params.category!.toLowerCase(),
      );
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q),
      );
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  findBookById(id: string): Book | undefined {
    return this.data.books.find((b) => b.id === id);
  }

  createBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'downloads'>): Book {
    const newBook: Book = {
      ...bookData,
      id: `book-${Date.now()}`,
      downloads: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.books.unshift(newBook);
    this.saveData();
    return newBook;
  }

  updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'createdAt'>>): Book | undefined {
    const index = this.data.books.findIndex((b) => b.id === id);
    if (index === -1) return undefined;

    const existing = this.data.books[index];
    const updated: Book = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.books[index] = updated;
    this.saveData();
    return updated;
  }

  deleteBook(id: string): boolean {
    const initialLen = this.data.books.length;
    this.data.books = this.data.books.filter((b) => b.id !== id);
    if (this.data.books.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Book Purchases & Entitlements ---
  createPurchase(purchaseData: Omit<Purchase, 'id' | 'purchasedAt' | 'updatedAt'>): Purchase {
    const purchase: Purchase = {
      ...purchaseData,
      id: `pur-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      purchasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.purchases.unshift(purchase);
    this.saveData();
    return purchase;
  }

  updatePurchase(idOrOrderId: string, updates: Partial<Purchase>): Purchase | undefined {
    const index = this.data.purchases.findIndex(
      (p) => p.id === idOrOrderId || p.orderId === idOrOrderId,
    );
    if (index === -1) return undefined;

    const existing = this.data.purchases[index];
    const updated: Purchase = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.purchases[index] = updated;
    this.saveData();
    return updated;
  }

  findPurchaseById(id: string): Purchase | undefined {
    return this.data.purchases.find((p) => p.id === id);
  }

  findPurchaseByOrderId(orderId: string): Purchase | undefined {
    return this.data.purchases.find((p) => p.orderId === orderId);
  }

  getAllPurchases(filter?: { bookId?: string; status?: PaymentStatus; search?: string }): Purchase[] {
    let list = [...this.data.purchases];
    if (filter?.bookId) {
      list = list.filter((p) => p.bookId === filter.bookId);
    }
    if (filter?.status) {
      list = list.filter((p) => p.paymentStatus === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.orderId.toLowerCase().includes(q) ||
          p.userEmail.toLowerCase().includes(q) ||
          p.paymentId.toLowerCase().includes(q) ||
          (p.userName && p.userName.toLowerCase().includes(q)),
      );
    }
    return list.sort(
      (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
    );
  }

  hasUserPurchasedBook(userEmailOrId: string, bookId: string): boolean {
    if (!userEmailOrId || !bookId) return false;
    const lower = userEmailOrId.toLowerCase();
    return this.data.purchases.some(
      (p) =>
        (p.userEmail.toLowerCase() === lower || p.userId === userEmailOrId) &&
        p.bookId === bookId &&
        p.paymentStatus === 'SUCCESS' &&
        p.accessStatus === 'ACTIVE',
    );
  }

  getUserPurchasedBooks(userEmailOrId: string): Book[] {
    if (!userEmailOrId) return [];
    const lower = userEmailOrId.toLowerCase();
    const activePurchases = this.data.purchases.filter(
      (p) =>
        (p.userEmail.toLowerCase() === lower || p.userId === userEmailOrId) &&
        p.paymentStatus === 'SUCCESS' &&
        p.accessStatus === 'ACTIVE',
    );
    const bookIds = new Set(activePurchases.map((p) => p.bookId));
    return this.data.books.filter((b) => bookIds.has(b.id));
  }

  // Backwards compatibility for previous endpoints
  recordBookPurchase(purchaseData: any): Purchase {
    return this.createPurchase({
      orderId: purchaseData.orderId || `LTL-BOOK-${Date.now()}`,
      userId: purchaseData.userId,
      userEmail: purchaseData.userEmail,
      userName: purchaseData.userName,
      bookId: purchaseData.bookId,
      amount: purchaseData.amount,
      paymentId: purchaseData.transactionId || purchaseData.paymentId || `pay-${Date.now()}`,
      paymentStatus: 'SUCCESS',
      accessStatus: 'ACTIVE',
    });
  }

  // --- Payments ---
  recordPayment(paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord {
    const payment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.payments.unshift(payment);
    this.saveData();
    return payment;
  }

  // --- OTP Verification ---
  createOtp(email: string, hashedOtp: string, purpose: 'BOOK_ACCESS' | 'LOGIN' = 'BOOK_ACCESS'): OtpRecord {
    // Invalidate previous unverified OTPs for this email & purpose
    this.data.otps
      .filter((o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose && !o.verified)
      .forEach((o) => {
        o.expiresAt = new Date(Date.now() - 1000).toISOString();
      });

    const otp: OtpRecord = {
      id: `otp-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      email: email.toLowerCase(),
      hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      attempts: 0,
      verified: false,
      purpose,
      createdAt: new Date().toISOString(),
    };
    this.data.otps.unshift(otp);
    this.saveData();
    return otp;
  }

  findLatestOtp(email: string, purpose: 'BOOK_ACCESS' | 'LOGIN' = 'BOOK_ACCESS'): OtpRecord | undefined {
    const lower = email.toLowerCase();
    return this.data.otps.find(
      (o) => o.email.toLowerCase() === lower && o.purpose === purpose && !o.verified,
    );
  }

  incrementOtpAttempts(id: string): void {
    const otp = this.data.otps.find((o) => o.id === id);
    if (otp) {
      otp.attempts += 1;
      this.saveData();
    }
  }

  markOtpVerified(id: string): void {
    const otp = this.data.otps.find((o) => o.id === id);
    if (otp) {
      otp.verified = true;
      this.saveData();
    }
  }

  // --- Email Verification / Access Tokens ---
  createEmailVerification(
    email: string,
    token: string,
    orderId: string,
    bookId: string,
  ): EmailVerificationRecord {
    const record: EmailVerificationRecord = {
      id: `ev-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      email: email.toLowerCase(),
      token,
      orderId,
      bookId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      verified: false,
      createdAt: new Date().toISOString(),
    };
    this.data.emailVerifications.unshift(record);
    this.saveData();
    return record;
  }

  findEmailVerification(token: string): EmailVerificationRecord | undefined {
    return this.data.emailVerifications.find((ev) => ev.token === token);
  }

  markEmailVerificationUsed(token: string): void {
    const ev = this.data.emailVerifications.find((item) => item.token === token);
    if (ev) {
      ev.verified = true;
      this.saveData();
    }
  }
}
