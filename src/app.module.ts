import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BlogsModule } from './blogs/blogs.module.js';
import { CommentsModule } from './comments/comments.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, BlogsModule, CommentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
