import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initialize a purchase order
   * POST /payments/create-order
   */
  @Post('create-order')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(dto);
  }

  /**
   * Backend payment verification
   * POST /payments/verify
   */
  @Post('verify')
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }
}
