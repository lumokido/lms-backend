import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OtpController } from './otp.controller.js';
import { OtpService } from './otp.service.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'lumokido_secret_key_2026_super_secure_jwt',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
