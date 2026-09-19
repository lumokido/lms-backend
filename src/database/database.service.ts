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

interface DatabaseSchema {
  users: User[];
  blogs: Blog[];
  comments: Comment[];
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private dbFilePath = path.join(process.cwd(), 'data', 'db.json');
  private data: DatabaseSchema = {
    users: [],
    blogs: [],
    comments: [],
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
}
