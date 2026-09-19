import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Comment } from '../database/database.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';

@Injectable()
export class CommentsService {
  constructor(private readonly db: DatabaseService) {}

  getComments(blogId: string): Comment[] {
    const blog = this.db.getBlogById(blogId);
    if (!blog) {
      throw new NotFoundException(`Blog article not found`);
    }
    return this.db.getCommentsForBlog(blog.id);
  }

  createComment(blogId: string, dto: CreateCommentDto): Comment {
    const blog = this.db.getBlogById(blogId);
    if (!blog) {
      throw new NotFoundException(`Blog article not found`);
    }

    // Default avatar if none provided
    const avatarList = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    ];
    const randomAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];

    return this.db.createComment({
      blogId: blog.id,
      authorName: dto.authorName,
      authorEmail: dto.authorEmail,
      authorAvatar: dto.authorAvatar || randomAvatar,
      content: dto.content,
    });
  }

  removeComment(commentId: string): { success: boolean; message: string } {
    const removed = this.db.deleteComment(commentId);
    if (!removed) {
      throw new NotFoundException(`Comment not found`);
    }
    return { success: true, message: 'Comment deleted successfully' };
  }
}
