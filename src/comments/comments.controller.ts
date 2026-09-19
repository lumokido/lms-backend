import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/roles.guard.js';

@Controller('blogs/:blogId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  getComments(@Param('blogId') blogId: string) {
    return this.commentsService.getComments(blogId);
  }

  @Post()
  createComment(
    @Param('blogId') blogId: string,
    @Body() createDto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(blogId, createDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':commentId')
  removeComment(
    @Param('blogId') _blogId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentsService.removeComment(commentId);
  }
}
