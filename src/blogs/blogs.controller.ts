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
} from '@nestjs/common';
import { BlogsService } from './blogs.service.js';
import { CreateBlogDto } from './dto/create-blog.dto.js';
import { UpdateBlogDto } from './dto/update-blog.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/roles.guard.js';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.blogsService.findAll({ status, category, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('view') view?: string) {
    const shouldIncrementView = view === 'true' || view === '1';
    return this.blogsService.findOne(id, shouldIncrementView);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() createDto: CreateBlogDto) {
    return this.blogsService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateBlogDto) {
    return this.blogsService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.blogsService.toggleStatus(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }
}
