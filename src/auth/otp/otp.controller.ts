import { Controller, Post, Body } from '@nestjs/common';
import { OtpService } from './otp.service.js';
import { AccessRequestDto } from './dto/access-request.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';

@Controller()
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  /**
   * Validate token from purchase email link & dispatch OTP
   * POST /books/access/request
   */
  @Post('books/access/request')
  handleAccessRequest(@Body() dto: AccessRequestDto) {
    return this.otpService.handleAccessRequest(dto);
  }

  /**
   * Resend / Send OTP code
   * POST /auth/email/send-otp
   */
  @Post('auth/email/send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto);
  }

  /**
   * Verify OTP and receive JWT student session
   * POST /auth/email/verify-otp
   */
  @Post('auth/email/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }
}
