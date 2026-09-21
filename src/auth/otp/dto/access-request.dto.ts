import { IsNotEmpty, IsString } from 'class-validator';

export class AccessRequestDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
