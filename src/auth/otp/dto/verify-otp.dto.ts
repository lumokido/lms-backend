import { IsEmail, IsNotEmpty, IsString, Length, IsOptional } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp: string;

  @IsOptional()
  @IsString()
  token?: string;
}
