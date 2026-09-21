import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class VerifyPaymentDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}
