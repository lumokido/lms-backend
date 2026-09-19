import { Module } from '@nestjs/common';
import { BlogsService } from './blogs.service.js';
import { BlogsController } from './blogs.controller.js';

@Module({
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
