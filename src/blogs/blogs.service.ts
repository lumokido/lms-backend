import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Blog } from '../database/database.service.js';
import { CreateBlogDto } from './dto/create-blog.dto.js';
import { UpdateBlogDto } from './dto/update-blog.dto.js';

@Injectable()
export class BlogsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { status?: string; category?: string; search?: string }): Blog[] {
    let blogs = this.db.getAllBlogs();

    if (query?.status && query.status !== 'all') {
      blogs = blogs.filter((b) => b.status === query.status);
    }

    if (query?.category && query.category !== 'All') {
      blogs = blogs.filter((b) => b.category.toLowerCase() === query.category?.toLowerCase());
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.toLowerCase();
      blogs = blogs.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          b.excerpt.toLowerCase().includes(s) ||
          b.author.toLowerCase().includes(s) ||
          b.content.toLowerCase().includes(s),
      );
    }

    return blogs;
  }

  findOne(idOrSlug: string, incrementView = false) {
    const blog = this.db.getBlogById(idOrSlug);
    if (!blog) {
      throw new NotFoundException(`Blog article not found`);
    }

    if (incrementView) {
      this.db.incrementBlogViews(blog.id);
      blog.views += 1;
    }

    const comments = this.db.getCommentsForBlog(blog.id);
    return {
      ...blog,
      commentsCount: comments.length,
      comments,
    };
  }

  create(createDto: CreateBlogDto): Blog {
    const slug =
      createDto.slug?.trim() ||
      createDto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    return this.db.createBlog({
      title: createDto.title,
      slug,
      excerpt: createDto.excerpt,
      content: createDto.content,
      author: createDto.author,
      authorAvatar:
        createDto.authorAvatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      category: createDto.category,
      readTime: createDto.readTime || '5 min read',
      publishedAt: formattedDate,
      status: createDto.status || 'published',
      coverImage:
        createDto.coverImage ||
        'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&auto=format&fit=crop&q=80',
    });
  }

  update(id: string, updateDto: UpdateBlogDto): Blog {
    const updated = this.db.updateBlog(id, updateDto);
    if (!updated) {
      throw new NotFoundException(`Blog article with ID "${id}" not found`);
    }
    return updated;
  }

  toggleStatus(id: string): Blog {
    const blog = this.db.getBlogById(id);
    if (!blog) {
      throw new NotFoundException(`Blog article with ID "${id}" not found`);
    }
    const newStatus = blog.status === 'published' ? 'draft' : 'published';
    const updated = this.db.updateBlog(id, { status: newStatus });
    return updated!;
  }

  remove(id: string): { success: boolean; message: string } {
    const deleted = this.db.deleteBlog(id);
    if (!deleted) {
      throw new NotFoundException(`Blog article with ID "${id}" not found`);
    }
    return { success: true, message: `Blog article removed successfully` };
  }
}
