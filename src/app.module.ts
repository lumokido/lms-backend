import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BlogsModule } from './blogs/blogs.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { StorageModule } from './storage/storage.module.js';
import { BooksModule } from './books/books.module.js';
import { MailModule } from './mail/mail.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { OtpModule } from './auth/otp/otp.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    BlogsModule,
    CommentsModule,
    StorageModule,
    BooksModule,
    MailModule,
    PaymentsModule,
    OtpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
