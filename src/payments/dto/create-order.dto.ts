import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  bookId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}
